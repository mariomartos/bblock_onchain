from decimal import Decimal
from dotenv import load_dotenv
from db.db import db_get_connection
from db.db_inserts import db_insert_swaps_multiple
from db.db_selects import db_swap_select
from logs.log_swap import lsw_get_logs, lsw_is_covered, lsw_find_gaps, lsw_insert_log, lsw_delete_overlapping
from procs.prc_moralis import prm_call_url
from utils.utl_serialize import utl_serialize_swap
from utils.utl_utilities import utl_parse_timestamp
from notifier.event_manager import sse_manager
import requests
import uuid
import logging

def prc_sub_category_value(sub_category):
    sub_category_map = {
        "newposition": 0,
        "accumulation": 1,
        "partialsell": 2,
        "sellall": 3
    }

    key = sub_category.lower()
    if key not in sub_category_map:
        raise ValueError(f"Subcategoría desconocida: {sub_category}")
    
    return sub_category_map[key]
    
def prc_token_swaps_by_range(token_address, chain, from_date, to_date):
    try:
        load_dotenv()
        base_url = (
            f"https://mainnet-api.moralis.io/solana/v1/transactions/{token_address}/swaps"
            if chain == "solana"
            else f"https://deep-index.moralis.io/api/v2.2/erc20/{token_address}/swaps"
        )

        params = {
            "fromDate": from_date,
            "toDate": to_date,
            "limit": 100
        }
        if chain != "solana":
            params["chain"] = chain

        all_swaps = []
        cursor = None

        sse_manager.emit("progress", {"id": token_address, "message": "Solicitando datos a Moralis"})
        while True:
            if cursor:
                params["cursor"] = cursor
            else:
                params.pop("cursor", None)

            data = prm_call_url(base_url, params)
            result = data.get("result", [])
            cursor = data.get("cursor")

            for item in result:
                is_sell = 1 if item.get("transactionType") == "sell" else 0
                amount_field = "sold" if is_sell else "bought"
                amount = item.get(amount_field, {})

                all_swaps.append({
                    "id": str(uuid.uuid4()),
                    "txs_hash": item.get("transactionHash"),
                    "txs_type": is_sell,
                    "block_timestamp": utl_parse_timestamp(item.get("blockTimestamp")),
                    "sub_category": prc_sub_category_value(item.get("subCategory")),
                    "wallet_address": item.get("walletAddress"),
                    "pair_address": item.get("pairAddress"),
                    "token_address": item.get("baseToken"),
                    "token_amount": Decimal(amount.get("amount")) if amount.get("amount") else None,
                    "usd_amount": float(amount.get("usdAmount")) if amount.get("usdAmount") else None
                })
            sse_manager.emit("progress", {"id": token_address, "message": "Cargados " + str(len(all_swaps)) + " registros: " + all_swaps[-1]["block_timestamp"].isoformat() if all_swaps and all_swaps[-1]["block_timestamp"] else None })
            if not cursor:
                break
        return all_swaps

    except requests.exceptions.RequestException as e:
        raise Exception(f"Error al realizar la solicitud a la API: {str(e)}")
    except Exception as e:
        raise Exception(f"Error desconocido: {str(e)}")

def prc_token_process_request(token_address, chain, from_date, to_date):
    try:
        sse_manager.emit("progress", {"id": token_address, "message": "Evaluando datos."})
        logs = lsw_get_logs(token_address, chain)

        if lsw_is_covered(logs, from_date, to_date):
            sse_manager.emit("progress", {"id": token_address, "message": "END"})
            return True
        
        sse_manager.emit("progress", {"id": token_address, "message": "Solicitando carga de datos."})
        evaluation = lsw_find_gaps(logs, from_date, to_date)
        first_date = evaluation["first_date"]
        last_date = evaluation["last_date"]
        gaps = evaluation["gaps"]
        conn = db_get_connection()
        cursor = conn.cursor(dictionary=True)
        conn.autocommit = False

        try:
            for gap_start, gap_end in gaps:
                try:
                    inserted = prc_token_swaps_by_range(token_address, chain, gap_start, gap_end)
                    if inserted:
                        db_insert_swaps_multiple(inserted, cursor)
                        lsw_insert_log(token_address, chain, gap_start, gap_end, cursor)
                    conn.commit()
                except Exception as inner_exc_gap:
                    sse_manager.emit("progress", {"id": token_address, "message": "ERROR"})
                    conn.rollback()
                    raise Exception(f"Error en procesamiento del gap {gap_start} - {gap_end}: {str(inner_exc_gap)}")
            try:
                lsw_delete_overlapping(token_address, chain, first_date, last_date, cursor)
                lsw_insert_log(token_address, chain, first_date, last_date, cursor)
            except Exception as inner_exc_final:
                sse_manager.emit("progress", {"id": token_address, "message": "ERROR"})
                conn.rollback()
                raise Exception(f"Error en procesamiento final: {str(inner_exc_final)}")
            conn.commit()
            sse_manager.emit("progress", {"id": token_address, "message": "END"})

        except Exception as inner_exc:
            sse_manager.emit("progress", {"id": token_address, "message": "ERROR"})
            conn.rollback()
            raise Exception(f"Error en procesamiento dentro de transacción: {str(inner_exc)}")
        finally:
            cursor.close()
            conn.close()
        return True

    except Exception as outer_exc:
        logging.exception("Error durante el procesamiento: {str(outer_exc)}")    
        raise Exception(f"Error en prc_token_process_request: {str(outer_exc)}")

def prc_token_process_results(queries):
    try:
        results = db_swap_select(queries)
        return [utl_serialize_swap(row) for row in results]
    except Exception as e:
        raise Exception(f"Error al procesar resultados de tokens: {str(e)}")
    