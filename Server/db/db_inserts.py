from db.db import db_get_connection

def db_insert_swaps_multiple(swaps, cursor=None):
    own_connection = cursor is None
    conn = None

    try:
        if own_connection:
            conn = db_get_connection()
            cursor = conn.cursor()
        
        sql = """
        INSERT INTO swaps (
                id, log_id, txs_hash, txs_type,
                block_timestamp, sub_category, wallet_address,
                pair_address, token_address,
                token_amount, usd_amount
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = [
            (
                swap["id"],
                1,
                swap["txs_hash"],
                swap["txs_type"],
                swap["block_timestamp"],
                swap["sub_category"],
                swap["wallet_address"],
                swap["pair_address"],
                swap["token_address"],
                swap["token_amount"],
                swap["usd_amount"]
            )
            for swap in swaps
        ]
        cursor.executemany(sql, values)

        if own_connection:
            conn.commit()

    except Exception as e:
        if own_connection and conn:
            conn.rollback()
        raise Exception(f"Error al insertar múltiples swaps: {str(e)}")

    finally:
        if own_connection:
            cursor.close()
            conn.close()
