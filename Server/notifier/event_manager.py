from queue import Queue, Empty
import json
import threading

class SSEManager:
    def __init__(self):
        self.clients = []
        self.lock = threading.Lock()

    def register_client(self):
        q = Queue()
        with self.lock:
            self.clients.append(q)
        return q

    def unregister_client(self, q):
        with self.lock:
            if q in self.clients:
                self.clients.remove(q)

    def emit(self, event, data):
        message = f"event: {event}\ndata: {json.dumps(data)}\n\n"
        with self.lock:
            for q in self.clients:
                q.put(message)

sse_manager = SSEManager()
