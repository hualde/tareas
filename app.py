from flask import Flask, render_template, request, jsonify
import json
import os
import subprocess
from datetime import datetime

app = Flask(__name__)

# Archivo donde se guardan las tareas
DATA_FILE = 'tasks.json'

def load_tasks():
    """Carga las tareas desde el archivo JSON"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'workers': [],
        'columns': [
            {'id': 'todo', 'title': 'Por Hacer', 'tasks': []},
            {'id': 'doing', 'title': 'En Progreso', 'tasks': []},
            {'id': 'done', 'title': 'Hecho', 'tasks': []}
        ]
    }

def save_tasks(data):
    """Guarda las tareas en el archivo JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Obtiene todas las tareas"""
    return jsonify(load_tasks())

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Crea una nueva tarea"""
    data = load_tasks()
    task_data = request.json
    
    # Encontrar la columna donde se crea la tarea
    column_id = task_data.get('columnId', 'todo')
    column = next((col for col in data['columns'] if col['id'] == column_id), None)
    
    if column:
        new_task = {
            'id': datetime.now().strftime('%Y%m%d%H%M%S%f'),
            'title': task_data.get('title', 'Nueva tarea'),
            'description': task_data.get('description', ''),
            'assignedTo': task_data.get('assignedTo', ''),
            'created': datetime.now().isoformat()
        }
        column['tasks'].append(new_task)
        save_tasks(data)
        return jsonify(new_task), 201
    
    return jsonify({'error': 'Columna no encontrada'}), 404

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    """Actualiza una tarea"""
    data = load_tasks()
    task_data = request.json
    
    # Buscar la tarea en todas las columnas
    for column in data['columns']:
        task = next((t for t in column['tasks'] if t['id'] == task_id), None)
        if task:
            task['title'] = task_data.get('title', task['title'])
            task['description'] = task_data.get('description', task['description'])
            task['assignedTo'] = task_data.get('assignedTo', task.get('assignedTo', ''))
            save_tasks(data)
            return jsonify(task)
    
    return jsonify({'error': 'Tarea no encontrada'}), 404

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Elimina una tarea"""
    data = load_tasks()
    
    for column in data['columns']:
        task = next((t for t in column['tasks'] if t['id'] == task_id), None)
        if task:
            column['tasks'].remove(task)
            save_tasks(data)
            return jsonify({'success': True})
    
    return jsonify({'error': 'Tarea no encontrada'}), 404

@app.route('/api/tasks/<task_id>/move', methods=['POST'])
def move_task(task_id):
    """Mueve una tarea a otra columna"""
    data = load_tasks()
    new_column_id = request.json.get('columnId')
    
    # Buscar y remover la tarea de su columna actual
    task_to_move = None
    for column in data['columns']:
        task = next((t for t in column['tasks'] if t['id'] == task_id), None)
        if task:
            task_to_move = task
            column['tasks'].remove(task)
            break
    
    if task_to_move:
        # Agregar a la nueva columna
        new_column = next((col for col in data['columns'] if col['id'] == new_column_id), None)
        if new_column:
            new_column['tasks'].append(task_to_move)
            save_tasks(data)
            return jsonify({'success': True})
    
    return jsonify({'error': 'Tarea o columna no encontrada'}), 404

@app.route('/api/workers', methods=['GET'])
def get_workers():
    """Obtiene todos los trabajadores"""
    data = load_tasks()
    return jsonify(data.get('workers', []))

@app.route('/api/workers', methods=['POST'])
def create_worker():
    """Crea un nuevo trabajador"""
    data = load_tasks()
    worker_data = request.json
    
    if 'workers' not in data:
        data['workers'] = []
    
    new_worker = {
        'id': datetime.now().strftime('%Y%m%d%H%M%S%f'),
        'name': worker_data.get('name', 'Nuevo trabajador'),
        'email': worker_data.get('email', ''),
        'created': datetime.now().isoformat()
    }
    
    data['workers'].append(new_worker)
    save_tasks(data)
    return jsonify(new_worker), 201

@app.route('/api/workers/<worker_id>', methods=['PUT'])
def update_worker(worker_id):
    """Actualiza un trabajador"""
    data = load_tasks()
    worker_data = request.json
    
    if 'workers' not in data:
        return jsonify({'error': 'No hay trabajadores'}), 404
    
    worker = next((w for w in data['workers'] if w['id'] == worker_id), None)
    if worker:
        worker['name'] = worker_data.get('name', worker['name'])
        worker['email'] = worker_data.get('email', worker.get('email', ''))
        save_tasks(data)
        return jsonify(worker)
    
    return jsonify({'error': 'Trabajador no encontrado'}), 404

@app.route('/api/workers/<worker_id>', methods=['DELETE'])
def delete_worker(worker_id):
    """Elimina un trabajador"""
    data = load_tasks()
    
    if 'workers' not in data:
        return jsonify({'error': 'No hay trabajadores'}), 404
    
    worker = next((w for w in data['workers'] if w['id'] == worker_id), None)
    if worker:
        # Remover asignaciones de tareas
        for column in data['columns']:
            for task in column['tasks']:
                if task.get('assignedTo') == worker_id:
                    task['assignedTo'] = ''
        
        data['workers'].remove(worker)
        save_tasks(data)
        return jsonify({'success': True})
    
    return jsonify({'error': 'Trabajador no encontrado'}), 404

@app.route('/api/git/push', methods=['POST'])
def git_push():
    """Hace commit y push de los cambios a GitHub"""
    try:
        # Verificar que git está instalado
        result = subprocess.run(['git', '--version'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            return jsonify({
                'error': 'Git no está instalado o no está en el PATH. Por favor, instala Git primero.',
                'details': result.stderr
            }), 400
        
        # Verificar que estamos en un repositorio git
        result = subprocess.run(['git', 'rev-parse', '--git-dir'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            return jsonify({
                'error': 'No se encontró un repositorio git en este directorio.',
                'details': 'Por favor, inicializa un repositorio con: git init',
                'help': 'Luego configura el remoto con: git remote add origin <url>'
            }), 400
        
        # Verificar que hay un remoto configurado
        result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            return jsonify({
                'error': 'No hay un remoto "origin" configurado.',
                'details': 'Configura el remoto con: git remote add origin <url-de-tu-repositorio>',
                'help': 'Ejemplo: git remote add origin https://github.com/usuario/repositorio.git'
            }), 400
        
        # Añadir tasks.json al staging
        result = subprocess.run(['git', 'add', DATA_FILE], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            return jsonify({
                'error': f'Error al añadir archivo al staging',
                'details': result.stderr
            }), 500
        
        # Verificar si hay cambios para commitear
        result = subprocess.run(['git', 'diff', '--cached', '--quiet'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode == 0:
            # No hay cambios en staging, verificar si hay cambios sin añadir
            result = subprocess.run(['git', 'diff', '--quiet', DATA_FILE], 
                                  capture_output=True, text=True, cwd=os.getcwd())
            if result.returncode != 0:
                return jsonify({
                    'message': 'Hay cambios sin añadir. El archivo se añadirá automáticamente.',
                    'info': 'Intenta de nuevo para hacer commit y push.'
                }), 200
            return jsonify({
                'message': 'No hay cambios para commitear. Todo está actualizado.',
                'success': True
            }), 200
        
        # Hacer commit
        commit_message = f'Actualización automática de tareas - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        result = subprocess.run(['git', 'commit', '-m', commit_message], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            return jsonify({
                'error': f'Error al hacer commit',
                'details': result.stderr
            }), 500
        
        # Verificar la rama actual
        result = subprocess.run(['git', 'branch', '--show-current'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        branch = result.stdout.strip() if result.returncode == 0 else 'main'
        
        # Hacer push (intentar con -u si es la primera vez)
        result = subprocess.run(['git', 'push', '-u', 'origin', branch], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            # Si falla con -u, intentar sin -u (puede que ya esté configurado)
            result = subprocess.run(['git', 'push'], 
                                  capture_output=True, text=True, cwd=os.getcwd())
            if result.returncode != 0:
                return jsonify({
                    'error': f'Error al hacer push a GitHub',
                    'details': result.stderr,
                    'help': 'Verifica tus credenciales de GitHub o configura SSH'
                }), 500
        
        return jsonify({
            'success': True, 
            'message': 'Cambios subidos a GitHub correctamente',
            'commit_message': commit_message,
            'branch': branch
        })
        
    except FileNotFoundError:
        return jsonify({
            'error': 'Git no está instalado o no está en el PATH del sistema.',
            'help': 'Por favor, instala Git desde https://git-scm.com/'
        }), 400
    except Exception as e:
        return jsonify({
            'error': f'Error inesperado: {str(e)}',
            'type': type(e).__name__
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

