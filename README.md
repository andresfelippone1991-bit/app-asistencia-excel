# 📋 App de Asistencia Escolar con Google Sheets

Una aplicación web moderna, rápida y adaptable (celular, tablet y computadora) diseñada especialmente para docentes. Permite gestionar múltiples cursos, conectar cada curso a una planilla de Google Sheets distinta, cargar la lista de alumnos automáticamente y tomar asistencia registrando la fecha y los presentes/ausentes en el día correspondiente.

---

## 🚀 Características Principales

- **Multi-curso:** Agrega todos los cursos y materias que necesites. Cada uno puede tener su propio Google Sheet o pestaña.
- **Sincronización Automática con Google Sheets:**
  - Lee los nombres y apellidos de los alumnos directamente de la columna A (a partir de la fila 4).
  - Al tomar asistencia, busca la siguiente columna disponible en la fila 3 (donde dice *"Fecha"*), coloca la fecha del día (ej. `12/03`) y escribe la asistencia de cada alumno en su fila.
  - El porcentaje de asistencia (`% Asistencia` en columna B) se actualiza de forma automática con las fórmulas de tu planilla.
- **Nomenclatura Escolar Oficial:**
  - `P`: Presente (Verde)
  - `A`: Ausente (Rojo)
  - `T`: Tarde (Amarillo)
  - `J`: Justificada (Azul)
- **Acciones Rápidas para el Aula:**
  - Botón *"Todos Presentes"* con 1 solo toque.
  - Buscador en tiempo real por apellido o nombre.
  - Filtros para revisar ausentes y tardanzas antes de guardar.
  - Opción de notas u observaciones por alumno.
- **Especial para Celulares y Tablets:**
  - Botones táctiles grandes y cómodos.
  - Efecto de confirmación y enlace directo a la planilla guardada.
- **Copias de Seguridad (Backup):**
  - Exporta e importa tus cursos y configuraciones en formato JSON con un clic.
- **Listo para Desplegar:** Configurado para **Netlify**, **Vercel** o ejecución local.

---

## 🛠️ Conexión con Google Sheets (Paso a Paso)

Solo necesitas realizar esta configuración **una sola vez** en tu cuenta de Google para que funcione con todos tus cursos:

### 1. Copiar el Script
Abre el archivo [`GoogleAppsScript.js`](./GoogleAppsScript.js) incluido en este proyecto (o haz clic en *"Copiar Código"* en la pestaña *"Guía Apps Script"* dentro de la app).

### 2. Pegar en Google Apps Script
1. Abre tu planilla de Google Sheets (o ingresa a [script.google.com](https://script.google.com/)).
2. En el menú superior de la planilla, haz clic en **Extensiones** > **Apps Script**.
3. Borra cualquier código existente y **pega el código**.
4. Guarda el proyecto (icono del disquete o `Ctrl + S`).

### 3. Implementar como Aplicación Web
1. Arriba a la derecha, haz clic en el botón azul **Implementar** > **Nueva implementación**.
2. En el icono de engranaje ⚙️ (Tipo), selecciona **Aplicación web**.
3. En **Ejecutar como**: Selecciona **Yo (tu correo de Google)**.
4. En **¿Quién tiene acceso?**: Selecciona **Cualquiera** (*Anyone*).  
   *(Esto permite que la web app se comunique sin bloqueos de inicio de sesión)*.
5. Haz clic en **Implementar**, autoriza los permisos de Google y copia la **URL de la aplicación web** (termina en `/exec`).

### 4. Vincular en la App
- Abre la App > ve a **Ajustes** (icono ⚙️) y pega la URL en *"URL de Google Apps Script"*.
- ¡Listo! Ahora al crear o editar un curso solo pegas el enlace de la planilla de Google Sheets y haces clic en *"Cargar desde Google Sheet"*.

---

## 💻 Ejecución Local

Para probar la app en tu computadora:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre en tu navegador la URL que te indique la terminal (por ejemplo `http://localhost:5173`).

---

## 🌐 Cómo Subir a GitHub y Desplegar en Netlify / Vercel

### Paso 1: Subir a tu repositorio de GitHub

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Inicializar repositorio git (si aún no lo hiciste)
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear el primer commit
git commit -m "feat: app de asistencia con sincronizacion google sheets"

# 4. Conectar con tu repositorio de GitHub (reemplaza con tu enlace de GitHub)
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# 5. Subir a la rama main
git branch -M main
git push -u origin main
```

---

### Paso 2: Desplegar en Vercel (Recomendado)

1. Ingresa a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Selecciona tu repositorio de GitHub.
4. Vercel detectará automáticamente que es un proyecto **Vite**:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Haz clic en **"Deploy"**.
6. En menos de 1 minuto tendrás tu enlace HTTPS público listo para abrir desde el celular.

---

### Paso 3: O Desplegar en Netlify

1. Ingresa a [netlify.com](https://netlify.com/) e inicia sesión con GitHub.
2. Haz clic en **"Add new site"** > **"Import an existing project"**.
3. Elige GitHub y selecciona este repositorio.
4. La configuración ya está lista gracias al archivo `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Haz clic en **"Deploy site"**.

---

## 📊 Estructura de la Planilla Google Sheets

La app está diseñada a medida para la plantilla educativa:

| Fila / Columna | Columna A | Columna B | Columna C | Columna D | Columna E ... |
|---|---|---|---|---|---|
| **Fila 1** | *(Título / Cuatrimestre)* | | | | |
| **Fila 3** | **Alumnos** | **% Asistencia** | **Fecha** | **Fecha** | **Fecha** |
| **Fila 4** | Alvarez, Lucas | `#DIV/0!` *(o %)* | `P` | `A` | ... |
| **Fila 5** | Benitez, Thiago | `#DIV/0!` *(o %)* | `P` | `P` | ... |
| **Fila ...** | ... | ... | ... | ... | ... |

- **Fila 3:** Contiene los encabezados de las fechas (o la palabra *"Fecha"*). La app ubica la próxima columna libre y escribe la fecha del día (`12/03`).
- **Fila 4 en adelante:** Contiene los alumnos. La app escribe el estado (`P`, `A`, `T`, `J`) en la fila correspondiente.
- Si tu planilla tiene otra estructura, puedes modificar las filas y columnas en la sección **"Configuración Avanzada"** de cada curso.
