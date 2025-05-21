from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, Response, render_template, request, jsonify, stream_with_context
from procs.prc_token import prc_token_process_request, prc_token_process_results
from datetime import datetime
from notifier.event_manager import sse_manager

app = Flask(__name__)

@app.route('/events')
def app_define_SSE():
    def gen():
        q = sse_manager.register_client()
        try:
            while True:
                msg = q.get()
                yield msg
        except GeneratorExit:
            sse_manager.unregister_client(q)

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    }
    return Response(stream_with_context(gen()), headers=headers)

@app.route('/onChain')
def page_on_chain():
    return render_template('onChain.html')

def app_get_token_single_swaps(query):
    token_address = query.get('token_address')
    chain = query.get('chain')
    from_date = query.get('from_date')
    to_date = query.get('to_date')

    if not token_address or not chain or not from_date or not to_date:
        return {"error": "Faltan parámetros obligatorios"}

    try:
        prc_token_process_request(token_address, chain, from_date, to_date)
        return {"status": "ok"}
    except Exception as e:
        return {"error": f"Error en procesamiento: {str(e)}"}

@app.route('/onChainTokens', methods=['POST'])
def app_get_token_swaps():
    try:
        data = request.get_json()
        print("Data recibida: ", data)

        if not data or not isinstance(data, list) or len(data) > 6:
            return jsonify({"error": "Debes enviar un array JSON con máximo 6 consultas"}), 400
        for query in data:
            if not all(k in query for k in ("token_address", "chain", "from", "to")):
                return jsonify({"error": "Faltan parámetros en alguna consulta"}), 400

        for query in data:
            try:
                query["from_date"] = datetime.strptime(query["from"], "%Y-%m-%dT%H:%M:%S")
                query["to_date"] = datetime.strptime(query["to"], "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en alguna consulta"}), 400
        
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = {pool.submit(app_get_token_single_swaps, q): idx for idx, q in enumerate(data)}
        for future in as_completed(futures):
            res = future.result()
            if "error" in res:
                return jsonify(res), 500

        final_result = prc_token_process_results(data)
        return jsonify(final_result)
    except KeyboardInterrupt:
        pool.shutdown(wait=False, cancel_futures=True)
        return jsonify({"error": "Consulta cancelada por el usuario"}), 500
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error inesperado: {str(e)}"}), 500
