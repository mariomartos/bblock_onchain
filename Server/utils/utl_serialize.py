from decimal import Decimal

def utl_serialize_swap(row):
    row = dict(row)
    timestamp = row.get("block_timestamp")
    if timestamp is not None:
        row["block_timestamp"] = timestamp.isoformat() + "Z"
    amount = row.get("token_amount")
    if isinstance(amount, Decimal):
        row["token_amount"] = float(amount)
    usdval = row.get("usd_amount")
    if isinstance(usdval, Decimal):
        row["usd_amount"] = float(usdval)
    return row