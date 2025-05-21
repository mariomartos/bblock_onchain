from datetime import datetime

def utl_parse_timestamp(iso_string):
    return datetime.strptime(iso_string, "%Y-%m-%dT%H:%M:%S.%fZ")
