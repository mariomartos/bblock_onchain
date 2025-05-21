export class SSEManager {
  constructor(url, handlers = {}) {
    this.url = url;
    this.handlers = handlers;
    this.source = null;
  }

  start() {
    this.source = new EventSource(this.url);

    // Para todos los handlers que no sean default ni error, añadir eventListener
    Object.keys(this.handlers).forEach((key) => {
        if (key !== "default" && key !== "error") {
        this.source.addEventListener(key, (event) => {
            try {
            const data = JSON.parse(event.data);
            this.handlers[key](data);
            } catch (err) {
            console.error("Error parseando evento SSE:", err);
            }
        });
        }
    });

    // Evento message "por defecto"
    this.source.onmessage = (event) => {
        if (this.handlers["default"]) {
        this.handlers["default"](event.data);
        }
    };

    this.source.onerror = (err) => {
        console.error("Error en SSE:", err);
        if (this.handlers["error"]) {
        this.handlers["error"](err);
        }
        this.stop();
    };
    }

  stop() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }
}
