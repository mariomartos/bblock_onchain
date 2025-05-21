import uuid
from db.db import db_get_connection
from datetime import datetime

#Obtenemos los logs del token
def lsw_get_logs(token_address, chain):
    conn = db_get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT * FROM log_swap
        WHERE token_address = %s AND chain = %s
        ORDER BY from_date
    """, (token_address, chain))
    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    return logs

def lsw_delete_overlapping(token_address, chain, from_date, to_date, cursor=None):
    own_connection = cursor is None
    conn = None

    try:
        if own_connection:
            conn = db_get_connection()
            cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM log_swap
            WHERE token_address = %s AND chain = %s
              AND from_date >= %s AND to_date <= %s
        """, (token_address, chain, from_date, to_date))

        if own_connection:
            conn.commit()

    except Exception as e:
        if own_connection and conn:
            conn.rollback()
        raise Exception(f"Error al eliminar registros superpuestos: {str(e)}")

    finally:
        if own_connection:
            cursor.close()
            conn.close()

def lsw_insert_log(token_address, chain, from_date, to_date, cursor=None):
    own_connection = cursor is None
    conn = None

    try:
        if own_connection:
            conn = db_get_connection()
            cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO log_swap (id, token_address, chain, from_date, to_date)
            VALUES (%s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), token_address, chain, from_date, to_date))

        if own_connection:
            conn.commit()

    except Exception as e:
        if own_connection and conn:
            conn.rollback()
        raise Exception(f"Error al insertar registro en log_swap: {str(e)}")

    finally:
        if own_connection:
            cursor.close()
            conn.close()

def lsw_is_covered(logs, from_date, to_date):
    for log in logs:
        if log["from_date"] <= from_date and log["to_date"] >= to_date:
            return True
    return False

def lsw_find_gaps(logs, from_date, to_date):
    gaps = []
    first_date = from_date
    last_date = from_date
    logs = sorted(logs, key=lambda l: l["from_date"])
    cursor = from_date

    for log in logs:
        # Ajuste de la primera fecha si hay un registro que cubre un rango anterior
        if log["from_date"] < first_date and log["to_date"] > first_date:
            first_date = log["from_date"]

        # Si el log cubre parte del rango entre cursor y from_date, marcamos un gap
        if log["from_date"] >= cursor and log["from_date"] <= to_date:
            gaps.append((cursor, log["from_date"]))
            cursor = max(cursor, log["to_date"])
        # Si el log cubre el cursor y se extiende más allá de este, actualizamos el cursor
        elif log["from_date"] < cursor and log["to_date"] > cursor:
            cursor = log["to_date"]

    # Si después de procesar todos los logs, el cursor no ha alcanzado el to_date, agregamos el último gap
    if cursor < to_date:
        gaps.append((cursor, to_date))

    last_date = max(cursor, to_date)
    return {"first_date": first_date, "last_date": last_date, "gaps": gaps}