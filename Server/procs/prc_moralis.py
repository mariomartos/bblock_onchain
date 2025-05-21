import os
import requests
from dotenv import load_dotenv
from notifier.event_manager import sse_manager
from threading import Lock

load_dotenv()

API_KEYS = os.getenv("MORALIS_API_KEY").split(",")
MAX_INDEX = len(API_KEYS) - 1

_current_index = 0
_lock = Lock()

def prm_call_url(url, params):
    global _current_index
    while True:
        headers = {
            "accept": "application/json",
            "X-API-Key": API_KEYS[_current_index]
        }

        response = requests.get(url, headers=headers, params=params)
        try:
            data = response.json()
        except ValueError:
            data = None

        if response.status_code == 401:
            message = data.get("message", "").lower() if data else ""
            if "total included usage has been consumed" in message:
                with _lock:
                    if _current_index < MAX_INDEX:
                        _current_index += 1
                        headers["X-API-Key"] = API_KEYS[_current_index]
                        print(f"[WARN] Límite alcanzado. Cambiando API Key al índice {_current_index}")
                        sse_manager.emit("status", {"message": f"Límite de peticiones alcanzado. Cambiando API Key al índice {_current_index}"})
                    else:
                        raise Exception("Error 429: Límite de peticiones alcanzado en todas las claves API.")
            else:
                raise Exception(f"Error 401: {message}")
        elif response.status_code >= 400:
            response.raise_for_status()
        else:
            return data
