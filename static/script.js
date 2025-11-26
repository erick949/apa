const container = document.getElementById('preguntas-container');
const openAddBtn = document.getElementById('openAddBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const formPregunta = document.getElementById('formPregunta');
const optionsContainer = document.getElementById('optionsContainer');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const saveBtnText = document.getElementById('saveBtnText');
const addOptionBtn = document.getElementById('addOptionBtn');

let preguntasCache = [];
let editingId = null;

// ---------- UTIL ----------

function uid() {
    return Date.now() + Math.floor(Math.random() * 999);
}

function isFormValid() {
    const pregunta = formPregunta.value.trim();
    if (!pregunta) return false;
    const inputs = optionsContainer.querySelectorAll('.option-row .option-text input');
    if (inputs.length !== 4) return false;
    for (const inp of inputs) if (!inp.value.trim()) return false;
    const anyChecked = optionsContainer.querySelector('.option-row input[type="radio"]:checked');
    if (!anyChecked) return false;
    return true;
}

function refreshSaveButton() {
    saveBtn.disabled = !isFormValid();
    const totalOptions = optionsContainer.querySelectorAll('.option-row').length;
    addOptionBtn.disabled = totalOptions >= 4;
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

// ---------- RENDER: lista de preguntas ----------

function renderPreguntas(preguntas) {
    if (preguntas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay preguntas todavía</h3>
                <p>Crea tu primera pregunta para comenzar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    preguntas.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pregunta-card';
        div.dataset.id = p.id;

        const opcionesHtml = ['opcion1','opcion2','opcion3','opcion4'].map((key, idx) => {
            const txt = p[key] ?? '';
            if (!txt) return '';
            const letra = String.fromCharCode(65 + idx); // A,B,C,D
            const isCorrect = txt === p.respuesta;
            return `
                <div class="opcion-item ${isCorrect ? 'correct' : ''}">
                    <div class="opcion-letra">${letra}</div>
                    <div class="opcion-texto">${escapeHtml(txt)}</div>
                    ${isCorrect ? '<div class="badge-correct"><i class="fas fa-check"></i> Correcta</div>' : ''}
                </div>
            `;
        }).filter(Boolean).join('');

        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-question-circle"></i>
                    <span>${escapeHtml(p.pregunta)}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-edit btn-icon btn-small editBtn" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-icon btn-small delBtn" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="opciones-list">${opcionesHtml}</div>
        `;

        const editBtn = div.querySelector('.editBtn');
        const delBtn = div.querySelector('.delBtn');

        editBtn.addEventListener('click', () => startEdit(p));
        delBtn.addEventListener('click', () => eliminarPregunta(p.id));

        container.appendChild(div);
    });
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
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar preguntas</h3>
                <p>Por favor, intenta recargar la página</p>
            </div>
        `;
    }
}

// ---------- MODAL: CREAR / EDITAR ----------

function startCreate() {
    editingId = null;
    modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Pregunta';
    saveBtnText.textContent = 'Crear';
    formPregunta.value = '';
    optionsContainer.innerHTML = '';
    addOptionRow('');
    addOptionRow('');
    addOptionRow('');
    addOptionRow('');
    const firstRadio = optionsContainer.querySelector('.option-row input[type="radio"]');
    if (firstRadio) firstRadio.checked = true;
    refreshSaveButton();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => formPregunta.focus(), 100);
}

function startEdit(p) {
    editingId = p.id;
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Pregunta';
    saveBtnText.textContent = 'Guardar';
    formPregunta.value = p.pregunta || '';
    optionsContainer.innerHTML = '';
    const opts = [p.opcion1, p.opcion2, p.opcion3, p.opcion4].map(x => x ?? '');
    opts.forEach(optText => addOptionRow(optText));
    const radios = optionsContainer.querySelectorAll('.option-row input[type="radio"]');
    let found = false;
    radios.forEach(r => {
        const input = r.closest('.option-row').querySelector('.option-text input');
        if (input.value.trim() === (p.respuesta || '').trim()) {
            r.checked = true;
            found = true;
        }
    });
    if (!found && radios[0]) radios[0].checked = true;
    refreshSaveButton();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => formPregunta.focus(), 100);
}

function closeModal() {
    editingId = null;
    optionsContainer.innerHTML = '';
    formPregunta.value = '';
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ---------- AGREGAR OPCIÓN ----------

function addOptionRow(text) {
    console.log("añadiendo opcion");
    const id = 'opt_' + uid();
    const row = document.createElement('div');
    row.className = 'option-row';
    row.dataset.optId = id;
    row.innerHTML = `
        <div class="option-radio">
            <input type="radio" name="correctOption" />
        </div>
        <div class="option-text">
            <input type="text" value="${escapeHtml(text)}" placeholder="Escribe la opción" />
        </div>
        <div class="option-delete">
            <button class="btn btn-delete btn-icon btn-small deleteOptBtn" title="Eliminar">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    const radio = row.querySelector('input[type="radio"]');
    const textInput = row.querySelector('.option-text input');
    const delBtn = row.querySelector('.deleteOptBtn');

    textInput.addEventListener('input', refreshSaveButton);
    radio.addEventListener('change', refreshSaveButton);

    delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const total = optionsContainer.querySelectorAll('.option-row').length;
        if (total <= 2) {
            alert('Debe haber al menos 2 opciones.');
            return;
        }
        const wasChecked = radio.checked;
        row.remove();
        if (wasChecked) {
            const firstRadio = optionsContainer.querySelector('.option-row input[type="radio"]');
            if (firstRadio) firstRadio.checked = true;
        }
        refreshSaveButton();
    });

    optionsContainer.appendChild(row);
}

// ---------- EVENTOS ----------

openAddBtn.addEventListener('click', startCreate);

addOptionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const totalOptions = optionsContainer.querySelectorAll('.option-row').length;
    if (totalOptions >= 4) {
        alert('No puedes agregar más de 4 opciones.');
        return;
    }
    addOptionRow('');
    refreshSaveButton();
});

cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
});

// Cerrar modal al hacer click fuera
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Guardar / Crear
saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const totalOptions = optionsContainer.querySelectorAll('.option-row').length;
    if (totalOptions !== 4) {
        alert('Debes tener exactamente 4 opciones para guardar la pregunta.');
        return;
    }
    
    if (!isFormValid()) {
        alert('Completa todos los campos antes de continuar.');
        return;
    }

    const pregunta = formPregunta.value.trim();
    const optionInputs = optionsContainer.querySelectorAll('.option-row .option-text input');
    const opciones = Array.from(optionInputs).map(i => i.value.trim());
    const checkedRadio = optionsContainer.querySelector('.option-row input[type="radio"]:checked');
    const respuesta = checkedRadio ? checkedRadio.closest('.option-row').querySelector('.option-text input').value.trim() : '';

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
        return;
    }

    await cargarPreguntas();
    closeModal();
});

// Validación en tiempo real
formPregunta.addEventListener('input', refreshSaveButton);
optionsContainer.addEventListener('input', refreshSaveButton);

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