from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

API_URL = "https://feeddexv1-production.up.railway.app/api/preguntas/"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preguntas', methods=['GET'])
def get_preguntas():
    response = requests.get(API_URL)
    return jsonify(response.json())

@app.route('/preguntas/crear', methods=['POST'])
def crear_pregunta():
    data = request.json
    response = requests.post(API_URL + "crear/", json=data)
    return jsonify(response.json())

@app.route('/preguntas/<int:id>/actualizar', methods=['PUT'])
def actualizar_pregunta(id):
    data = request.json
    response = requests.put(f"{API_URL}{id}/actualizar/", json=data)
    return jsonify(response.json())

@app.route('/preguntas/<int:id>/eliminar', methods=['DELETE'])
def eliminar_pregunta(id):
    response = requests.delete(f"{API_URL}{id}/eliminar/")
    return jsonify(response.json())

if __name__ == "__main__":
    app.run(debug=True)
