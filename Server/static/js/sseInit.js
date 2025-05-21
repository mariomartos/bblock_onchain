import { SSEManager } from './sseManager.js';

const sseUrl = '/events';

const handlers = {
  // Evento 'status' que muestra la notificación
  status: (data) => {
    if (data && data.message) {
console.log("Event Handler: "); console.log(data);
      ntf_setStatus(Enums.STT.OK, data.message);
    }
  },

  // TO DO: Añadir otros eventos aquí, update: (data) => { ... }, etc
  progress: (data) => {
    if (data && data.message) {
      ntf_setProgress(data.id, data.message);
    }
  },
  default: (data) => {
    console.log("Evento SSE no gestionado:", data);
  },

  // Manejo de errores SSE
  error: (err) => {
    ntf_setStatus(Enums.STT.ERROR, "Error de conexión SSE");
    console.error("SSE error:", err);
  }
};

const sseManager = new SSEManager(sseUrl, handlers);
sseManager.start();

export { sseManager };
