const container = document.getElementById('preguntas-container');
const openAddBtn = document.getElementById('openAddBtn');
const modalOverlay = document.getElementById('modalOverlay');
const blockOverlay = document.getElementById('blockOverlay');
const modalTitle = document.getElementById('modalTitle');
const formPregunta = document.getElementById('formPregunta');
const optionsContainer = document.getElementById('optionsContainer');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const addOptionBtn = document.getElementById('addOptionBtn');
const mainContent = document.getElementById('mainContent');

let preguntasCache = [];
let editingId = null; // null => creating; otherwise editing that id

// ---------- UTIL ----------

function uid() {
    return Date.now() + Math.floor(Math.random() * 999);
}

// Valida el formulario actual (pregunta, al menos 2 opciones no vacías, y una opción seleccionada)
function isFormValid() {
    const pregunta = formPregunta.value.trim();
    if (!pregunta) return false;
    const inputs = optionsContainer.querySelectorAll('.option-row .option-text input');
    if (inputs.length < 2) return false;
    for (const inp of inputs) if (!inp.value.trim()) return false;
    // comprobar que alguna radio esté checked
    const anyChecked = optionsContainer.querySelector('.option-row input[type="radio"]:checked');
    if (!anyChecked) return false;
    return true;
}

// Habilitar / deshabilitar botón guardar/crear
function refreshSaveButton() {
    saveBtn.disabled = !isFormValid();
    if (saveBtn.disabled) {
        saveBtn.classList.remove('primary');
        saveBtn.classList.add('secondary');
    } else {
        saveBtn.classList.add('primary');
        saveBtn.classList.remove('secondary');
    }
}

// Aplica bloqueo/blur a la UI (cuando modal visible)
function setLocked(locked) {
    if (locked) {
        blockOverlay.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');
        mainContent.classList.add('blurred'); // class may be used for additional visual tweaks
        document.body.style.overflow = 'hidden';
    } else {
        blockOverlay.classList.add('hidden');
        modalOverlay.classList.add('hidden');
        mainContent.classList.remove('blurred');
        document.body.style.overflow = '';
    }
}

// ---------- RENDER: lista de preguntas (modo VER) ----------
function renderPreguntas(preguntas) {
    container.innerHTML = '';
    preguntas.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pregunta-card';
        div.dataset.id = p.id;

        // Construir opciones (modo ver: no checks, mostrar resaltado en correcta)
        const opcionesHtml = ['opcion1','opcion2','opcion3','opcion4'].map((key, idx) => {
            const txt = p[key] ?? '';
            const letra = String.fromCharCode(65 + idx); // A,B,C,D
            const isCorrect = txt === p.respuesta;
            return `
                <div class="opcion-item ${isCorrect ? 'opcion-correct' : ''}">
                    <div class="letra">${letra}</div>
                    <div class="texto">${escapeHtml(txt)}</div>
                    ${isCorrect ? `<div class="badge-correct">Correcta</div>` : ''}
                </div>
            `;
        }).join('');

        div.innerHTML = `
            <div class="card-left">
                <div class="pregunta-text">${escapeHtml(p.pregunta)}</div>
                <div class="opciones-view">${opcionesHtml}</div>
            </div>
            <div class="card-right">
                <div class="btn-group">
                    <button class="editBtn">Editar</button>
                    <button class="delBtn">Eliminar</button>
                </div>
            </div>
        `;

        // Eventos botones
        const editBtn = div.querySelector('.editBtn');
        const delBtn = div.querySelector('.delBtn');

        editBtn.addEventListener('click', () => {
            startEdit(p);
        });

        delBtn.addEventListener('click', () => {
            eliminarPregunta(p.id);
        });

        container.appendChild(div);
    });
}

// simple escape to avoid XSS if server returns malicious
function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

// ---------- CARGAR PREGUNTAS ----------
async function cargarPreguntas() {
    try {
        const res = await fetch('/preguntas');
        const preguntas = await res.json();
        preguntasCache = preguntas;
        renderPreguntas(preguntas);
    } catch (err) {
        console.error('Error cargando preguntas', err);
        container.innerHTML = '<p style="color:#faa">No se pudieron cargar las preguntas.</p>';
    }
}

// ---------- AGREGAR / EDITAR: mostrar modal ----------

openAddBtn.addEventListener('click', () => {
    startCreate();
});

addOptionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addOptionRow('');
    refreshSaveButton();
});

// abre modal en modo crear
function startCreate() {
    editingId = null;
    modalTitle.textContent = 'Crear pregunta';
    saveBtn.textContent = 'Crear';
    formPregunta.value = '';
    optionsContainer.innerHTML = '';
    // crear 4 opciones vacías por defecto (si quieres permitir menos, podríamos crear 2)
    addOptionRow('');
    addOptionRow('');
    addOptionRow('');
    addOptionRow('');
    // set first radio checked por defecto
    const firstRadio = optionsContainer.querySelector('.option-row input[type="radio"]');
    if (firstRadio) firstRadio.checked = true;
    refreshSaveButton();
    setLocked(true);
    // focus
    setTimeout(()=> formPregunta.focus(), 80);
}

// abre modal en modo editar con datos
function startEdit(p) {
    editingId = p.id;
    modalTitle.textContent = 'Editar pregunta';
    saveBtn.textContent = 'Guardar';
    formPregunta.value = p.pregunta || '';
    optionsContainer.innerHTML = '';
    // agregar opciones en el mismo orden
    const opts = [p.opcion1, p.opcion2, p.opcion3, p.opcion4].map(x => x ?? '');
    opts.forEach(optText => addOptionRow(optText));
    // seleccionar radio que corresponde a respuesta
    const radios = optionsContainer.querySelectorAll('.option-row input[type="radio"]');
    // If the server response matches exact text
    let found = false;
    radios.forEach(r => {
        const input = r.closest('.option-row').querySelector('.option-text input');
        if (input.value.trim() === (p.respuesta || '').trim()) {
            r.checked = true; found = true;
        }
    });
    // if not found (maybe text changed), ensure first is checked
    if (!found && radios[0]) radios[0].checked = true;
    refreshSaveButton();
    setLocked(true);
    setTimeout(()=> formPregunta.focus(), 80);
}

// agrega una fila de opción al modal
function addOptionRow(text) {
    const id = 'opt_' + uid();
    const row = document.createElement('div');
    row.className = 'option-row';
    row.dataset.optId = id;
    row.innerHTML = `
        <div class="option-radio">
            <input type="radio" name="correctOption" />
        </div>
        <div class="option-text">
            <input type="text" value="${escapeHtml(text)}" placeholder="Texto de la opción" />
        </div>
        <div class="option-delete">
            <button class="small deleteOptBtn">Eliminar</button>
        </div>
    `;
    // event listeners
    const radio = row.querySelector('input[type="radio"]');
    const textInput = row.querySelector('.option-text input');
    const delBtn = row.querySelector('.deleteOptBtn');

    // cuando cambie texto -> refrescar selectibilidad / validación
    textInput.addEventListener('input', () => {
        refreshSaveButton();
        // if the currently checked option had its text blanked, still allow it but validation will fail until filled
    });

    // radio: cuando se clickea se selecciona (solo una check por name automatico)
    radio.addEventListener('change', () => {
        // nada extra: la propiedad checked será la única true por el name
        refreshSaveButton();
    });

    delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // si hay sólo 2 opciones, impedir eliminar (debe haber al menos 2)
        const total = optionsContainer.querySelectorAll('.option-row').length;
        if (total <= 2) {
            alert('Debe haber al menos 2 opciones.');
            return;
        }
        const wasChecked = radio.checked;
        row.remove();
        // si la que fue eliminada estaba seleccionada, seleccionar la primera existente
        if (wasChecked) {
            const firstRadio = optionsContainer.querySelector('.option-row input[type="radio"]');
            if (firstRadio) firstRadio.checked = true;
        }
        refreshSaveButton();
    });

    optionsContainer.appendChild(row);
}

// Cancelar modal
cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
});

// Cerrar modal y limpiar
function closeModal() {
    editingId = null;
    optionsContainer.innerHTML = '';
    formPregunta.value = '';
    setLocked(false);
}

// Guardar / Crear
saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
        alert('Completa todos los campos antes de continuar.');
        return;
    }

    // construir payload
    const pregunta = formPregunta.value.trim();
    const optionInputs = optionsContainer.querySelectorAll('.option-row .option-text input');
    // recoger en orden: opcion1..opcionN (se pedían 4, pero manejamos dinamicamente)
    const opciones = Array.from(optionInputs).map(i => i.value.trim());
    // respuesta = texto de la opción marcada
    const checkedRadio = optionsContainer.querySelector('.option-row input[type="radio"]:checked');
    const respuesta = checkedRadio ? checkedRadio.closest('.option-row').querySelector('.option-text input').value.trim() : '';

    // rellenar hasta 4 campos para tu API existente (si envías sólo 4)
    const data = {
        pregunta,
        opcion1: opciones[0] || '',
        opcion2: opciones[1] || '',
        opcion3: opciones[2] || '',
        opcion4: opciones[3] || '',
        respuesta
    };

    try {
        if (editingId) {
            // PUT a /preguntas/{id}/actualizar
            await fetch(`/preguntas/${editingId}/actualizar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            await fetch('/preguntas/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
    } catch (err) {
        console.error('Error guardando pregunta', err);
        alert('Ocurrió un error al guardar. Revisa la consola.');
    }

    // refrescar lista y cerrar modal
    await cargarPreguntas();
    closeModal();
});

// cuando cambie cualquier campo del modal, refrescar validación
formPregunta.addEventListener('input', refreshSaveButton);
optionsContainer.addEventListener('input', refreshSaveButton);

// cerrar modal si se hace click en overlay (fuera del contenido)
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cancelBtn.click();
});

// bloquear click en blockOverlay también cierra modal (por consistencia)
blockOverlay.addEventListener('click', () => {
    // no cerramos automaticamente para evitar pérdida accidental, podemos preguntar:
    if (confirm('Cancelar la edición/creación y perder cambios?')) cancelBtn.click();
});

// Eliminar pregunta
async function eliminarPregunta(id) {
    if (!confirm('¿Deseas eliminar esta pregunta?')) return;
    try {
        await fetch(`/preguntas/${id}/eliminar`, { method: 'DELETE' });
        await cargarPreguntas();
    } catch (err) {
        console.error('Error eliminando', err);
        alert('Error al eliminar la pregunta.');
    }
}

// Cargar preguntas al inicio
cargarPreguntas();
