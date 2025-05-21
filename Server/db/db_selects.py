from db.db import db_get_connection

def db_swap_select(queries):
    sql_base = """
    SELECT id, txs_hash, txs_type, block_timestamp,
           sub_category, wallet_address, pair_address, 
           token_address, token_amount, usd_amount
    FROM swaps
    WHERE 
    """
    
    conditions = []
    params = []
    
    for query in queries:
        conditions.append("(token_address = %s AND block_timestamp >= %s AND block_timestamp <= %s)")
        params.extend([query['token_address'], query['from_date'], query['to_date']])
    
    sql = sql_base + " OR ".join(conditions) + " ORDER BY wallet_address"
    
    conn = None
    try:
        conn = db_get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        return cursor.fetchall()
    except Exception as e:
        raise Exception(f"Error al hacer select en swaps: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
