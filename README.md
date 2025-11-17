# 📋 Tablero de Tareas

Una aplicación web sencilla tipo Trello para gestionar tus tareas, desarrollada en Python con Flask.

## ✨ Características

- 🎨 Interfaz moderna y bonita
- 📝 Crear, editar y eliminar tareas
- 👥 Gestión de trabajadores y asignación de tareas
- 🔄 Arrastrar y soltar tareas entre columnas
- 💾 Almacenamiento en JSON (fácil de versionar en GitHub)
- 📱 Diseño responsive

## 🚀 Instalación

1. **Clonar o descargar el repositorio**

2. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

## 🎯 Uso

1. **Ejecutar la aplicación:**
```bash
python app.py
```

2. **Abrir en el navegador:**
```
http://localhost:5000
```

## 📦 Almacenamiento en GitHub

Los datos se guardan en el archivo `tasks.json`. Para versionar tus tareas en GitHub:

1. Añade `tasks.json` a tu repositorio (no está en `.gitignore`)
2. **Usa el botón "☁️ Subir a GitHub"** en el header para hacer commit y push automáticamente
3. Al clonar en otro lugar, tus tareas estarán disponibles

### ⚡ Subida Automática a GitHub

La aplicación incluye un botón que automáticamente:
- Añade `tasks.json` al staging
- Hace commit con un mensaje descriptivo
- Hace push a GitHub

Solo necesitas hacer clic en "☁️ Subir a GitHub" y listo. El botón muestra un indicador de carga mientras se procesa la operación.

## 🏗️ Estructura del Proyecto

```
.
├── app.py              # Aplicación Flask principal
├── templates/
│   └── index.html      # Página principal
├── static/
│   ├── style.css       # Estilos
│   └── script.js       # JavaScript
├── tasks.json          # Datos de las tareas (se crea automáticamente)
├── requirements.txt    # Dependencias Python
└── README.md          # Este archivo
```

## 🎨 Columnas por Defecto

- **Por Hacer**: Tareas pendientes
- **En Progreso**: Tareas en las que estás trabajando
- **Hecho**: Tareas completadas

## 👥 Gestión de Trabajadores

La aplicación incluye un sistema completo para gestionar trabajadores:

1. **Añadir trabajadores**: Haz clic en "👥 Gestionar Trabajadores" en el header
2. **Asignar tareas**: Al crear o editar una tarea, selecciona un trabajador del menú desplegable
3. **Ver asignaciones**: Cada tarea muestra el nombre del trabajador asignado
4. **Editar/Eliminar**: Puedes editar o eliminar trabajadores desde el modal de gestión

Los trabajadores se guardan junto con las tareas en `tasks.json`, por lo que también se versionan en GitHub.

## 💡 Notas

- Los datos se guardan automáticamente en `tasks.json`
- Puedes personalizar las columnas editando la función `load_tasks()` en `app.py`
- La aplicación se ejecuta en modo debug por defecto

## 📝 Licencia

Libre para uso personal.

