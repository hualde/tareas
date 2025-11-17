let currentColumnId = null;
let currentTaskId = null;

let workers = [];

// Cargar tareas al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadWorkers();
    loadBoard();
    setupModal();
    setupWorkerModal();
});

async function loadBoard() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        renderBoard(data);
    } catch (error) {
        console.error('Error cargando tareas:', error);
    }
}

function renderBoard(data) {
    const board = document.getElementById('board');
    board.innerHTML = '';

    data.columns.forEach(column => {
        const columnEl = createColumnElement(column);
        board.appendChild(columnEl);
    });
}

function createColumnElement(column) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.dataset.columnId = column.id;

    columnDiv.innerHTML = `
        <div class="column-header">
            <span class="column-title">${column.title}</span>
            <span class="task-count">${column.tasks.length}</span>
        </div>
        <div class="tasks-container" id="tasks-${column.id}">
            ${column.tasks.map(task => createTaskHTML(task)).join('')}
        </div>
        <button class="add-task-btn" onclick="openTaskModal('${column.id}')">
            + Añadir tarea
        </button>
    `;

    // Configurar drag and drop
    const tasksContainer = columnDiv.querySelector(`#tasks-${column.id}`);
    tasksContainer.addEventListener('dragover', handleDragOver);
    tasksContainer.addEventListener('drop', (e) => handleDrop(e, column.id));
    tasksContainer.addEventListener('dragleave', handleDragLeave);

    // Agregar eventos de drag a las tareas
    column.tasks.forEach(task => {
        const taskEl = columnDiv.querySelector(`[data-task-id="${task.id}"]`);
        if (taskEl) {
            taskEl.draggable = true;
            taskEl.addEventListener('dragstart', (e) => handleDragStart(e, task.id));
            taskEl.addEventListener('dragend', handleDragEnd);
        }
    });

    return columnDiv;
}

function createTaskHTML(task) {
    const assignedWorker = task.assignedTo ? workers.find(w => w.id === task.assignedTo) : null;
    const assignedHtml = assignedWorker 
        ? `<div class="task-assigned">👤 ${escapeHtml(assignedWorker.name)}</div>` 
        : '';
    
    return `
        <div class="task" data-task-id="${task.id}">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${assignedHtml}
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-actions">
                <button class="btn-edit" onclick="editTask('${task.id}')">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal
function setupModal() {
    const modal = document.getElementById('taskModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');

    closeBtn.onclick = () => modal.style.display = 'none';
    cancelBtn.onclick = () => modal.style.display = 'none';

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function openTaskModal(columnId, taskId = null) {
    currentColumnId = columnId;
    currentTaskId = taskId;
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle');

    // Cargar trabajadores en el selector
    loadWorkersIntoSelect();

    if (taskId) {
        modalTitle.textContent = 'Editar Tarea';
        // Cargar datos de la tarea
        loadTaskData(taskId);
    } else {
        modalTitle.textContent = 'Nueva Tarea';
        form.reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskAssignedTo').value = '';
    }

    document.getElementById('columnId').value = columnId;
    modal.style.display = 'block';
}

async function loadTaskData(taskId) {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        
        for (const column of data.columns) {
            const task = column.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskAssignedTo').value = task.assignedTo || '';
                document.getElementById('columnId').value = column.id;
                break;
            }
        }
    } catch (error) {
        console.error('Error cargando tarea:', error);
    }
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const assignedTo = document.getElementById('taskAssignedTo').value;
    const columnId = document.getElementById('columnId').value;

    try {
        if (taskId) {
            // Actualizar tarea existente
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, assignedTo })
            });
        } else {
            // Crear nueva tarea
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, columnId, assignedTo })
            });
        }

        document.getElementById('taskModal').style.display = 'none';
        loadBoard();
    } catch (error) {
        console.error('Error guardando tarea:', error);
        alert('Error al guardar la tarea');
    }
});

async function editTask(taskId) {
    openTaskModal(null, taskId);
}

async function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        return;
    }

    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        loadBoard();
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        alert('Error al eliminar la tarea');
    }
}

// Drag and Drop
let draggedTaskId = null;

function handleDragStart(e, taskId) {
    draggedTaskId = taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.closest('.column').classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.closest('.column').classList.remove('drag-over');
}

async function handleDrop(e, columnId) {
    e.preventDefault();
    e.currentTarget.closest('.column').classList.remove('drag-over');

    if (draggedTaskId) {
        try {
            await fetch(`/api/tasks/${draggedTaskId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnId })
            });
            loadBoard();
        } catch (error) {
            console.error('Error moviendo tarea:', error);
            alert('Error al mover la tarea');
        }
    }
    draggedTaskId = null;
}

// Workers Management
async function loadWorkers() {
    try {
        const response = await fetch('/api/workers');
        workers = await response.json();
    } catch (error) {
        console.error('Error cargando trabajadores:', error);
        workers = [];
    }
}

function loadWorkersIntoSelect() {
    const select = document.getElementById('taskAssignedTo');
    const currentValue = select.value;
    
    // Limpiar opciones excepto "Sin asignar"
    select.innerHTML = '<option value="">Sin asignar</option>';
    
    workers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.id;
        option.textContent = worker.name;
        select.appendChild(option);
    });
    
    // Restaurar valor anterior si existe
    if (currentValue) {
        select.value = currentValue;
    }
}

function openWorkersModal() {
    const modal = document.getElementById('workersModal');
    loadWorkersList();
    modal.style.display = 'block';
}

function closeWorkersModal() {
    document.getElementById('workersModal').style.display = 'none';
}

async function loadWorkersList() {
    await loadWorkers();
    const workersList = document.getElementById('workersList');
    
    if (workers.length === 0) {
        workersList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay trabajadores registrados</p>';
        return;
    }
    
    workersList.innerHTML = workers.map(worker => `
        <div class="worker-item">
            <div class="worker-info">
                <div class="worker-name">${escapeHtml(worker.name)}</div>
                ${worker.email ? `<div class="worker-email">${escapeHtml(worker.email)}</div>` : ''}
            </div>
            <div class="worker-actions">
                <button class="btn-edit-worker" onclick="editWorker('${worker.id}')">✏️</button>
                <button class="btn-delete-worker" onclick="deleteWorker('${worker.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function setupWorkerModal() {
    const modal = document.getElementById('workersModal');
    const form = document.getElementById('workerForm');
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const workerId = document.getElementById('workerId').value;
        const name = document.getElementById('workerName').value;
        const email = document.getElementById('workerEmail').value;
        
        try {
            if (workerId) {
                // Actualizar trabajador
                await fetch(`/api/workers/${workerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email })
                });
            } else {
                // Crear nuevo trabajador
                await fetch('/api/workers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email })
                });
            }
            
            resetWorkerForm();
            loadWorkersList();
            loadWorkers(); // Recargar para actualizar el selector de tareas
        } catch (error) {
            console.error('Error guardando trabajador:', error);
            alert('Error al guardar el trabajador');
        }
    });
}

async function editWorker(workerId) {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
        document.getElementById('workerId').value = worker.id;
        document.getElementById('workerName').value = worker.name;
        document.getElementById('workerEmail').value = worker.email || '';
    }
}

async function deleteWorker(workerId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este trabajador? Las tareas asignadas quedarán sin asignar.')) {
        return;
    }
    
    try {
        await fetch(`/api/workers/${workerId}`, {
            method: 'DELETE'
        });
        loadWorkersList();
        loadWorkers(); // Recargar para actualizar el selector de tareas
        loadBoard(); // Recargar el tablero para actualizar las asignaciones
    } catch (error) {
        console.error('Error eliminando trabajador:', error);
        alert('Error al eliminar el trabajador');
    }
}

function resetWorkerForm() {
    document.getElementById('workerForm').reset();
    document.getElementById('workerId').value = '';
}

// GitHub Push
async function pushToGitHub() {
    const btn = document.getElementById('gitPushBtn');
    const text = document.getElementById('gitPushText');
    const loading = document.getElementById('gitPushLoading');
    
    // Deshabilitar botón y mostrar loading
    btn.disabled = true;
    text.style.display = 'none';
    loading.style.display = 'inline';
    
    try {
        const response = await fetch('/api/git/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.success) {
                let message = '✅ ' + (data.message || 'Cambios subidos a GitHub correctamente');
                if (data.commit_message) {
                    message += '\n\nCommit: ' + data.commit_message;
                }
                if (data.branch) {
                    message += '\nRama: ' + data.branch;
                }
                alert(message);
            } else if (data.message) {
                alert('ℹ️ ' + data.message + (data.info ? '\n\n' + data.info : ''));
            } else {
                alert('✅ ' + (data.message || 'Operación completada'));
            }
        } else {
            // Construir mensaje de error detallado
            let errorMsg = '❌ Error: ' + (data.error || 'Error desconocido');
            if (data.details) {
                errorMsg += '\n\nDetalles: ' + data.details;
            }
            if (data.help) {
                errorMsg += '\n\nAyuda: ' + data.help;
            }
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión al intentar subir a GitHub\n\n' + error.message);
    } finally {
        // Restaurar botón
        btn.disabled = false;
        text.style.display = 'inline';
        loading.style.display = 'none';
    }
}

