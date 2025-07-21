// Variables globales
let currentHistoryDate = new Date();

// Categorías predeterminadas
const defaultCategories = [
    { id: 'comida', nombre: 'Comida', emoji: '🍽️' },
    { id: 'transporte', nombre: 'Transporte', emoji: '🚗' },
    { id: 'servicios', nombre: 'Servicios', emoji: '🏠' },
    { id: 'diversion', nombre: 'Diversión', emoji: '🎮' },
    { id: 'otros', nombre: 'Otros', emoji: '📦' }
];

// Formatear moneda
const formatCurrency = (amount) => {
    return `Bs ${parseFloat(amount).toFixed(2)}`;
};

// Formatear fecha
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Mostrar notificación
const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : 'warning'}</span>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
};

// Funciones de validación
const sanitizeInput = (str) => {
    return str.trim()
        .replace(/[<>]/g, '') // Prevenir XSS básico
        .slice(0, 100); // Limitar longitud
};

const validateAmount = (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000; // Máximo 1 millón
};

const validateDate = (date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    return selectedDate >= oneYearAgo && selectedDate <= today;
};

// Obtener datos del localStorage
const getFromStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Error al leer de localStorage:', error);
        return defaultValue;
    }
};

// Guardar datos en localStorage
const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
        showNotification('Error al guardar los datos. El almacenamiento puede estar lleno.', 'warning');
        return false;
    }
};

// Obtener categorías
const getCategorias = () => {
    return getFromStorage('categorias', defaultCategories);
};

// Guardar categoría
const saveCategoria = (categoria) => {
    const categorias = getCategorias();
    categorias.push(categoria);
    saveToStorage('categorias', categorias);
};

// Obtener presupuestos
const getPresupuestos = () => {
    return getFromStorage('presupuestos', {
        total: 0,
        categorias: {}
    });
};

// Guardar presupuestos
const savePresupuestos = (presupuestos) => {
    saveToStorage('presupuestos', presupuestos);
};

// Obtener gastos
const getGastos = () => {
    return getFromStorage('gastos', []);
};

// Guardar gastos
const saveGastos = (gastos) => {
    saveToStorage('gastos', gastos);
};

// Actualizar lista de categorías
const updateCategoryList = () => {
    const categorias = getCategorias();
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';

    categorias.forEach(categoria => {
        const div = document.createElement('div');
        div.innerHTML = `
            <input type="radio" id="${categoria.id}" name="categoria" value="${categoria.nombre}">
            <label for="${categoria.id}" class="category-option">
                <span class="emoji">${categoria.emoji}</span>
                <span class="text">${categoria.nombre}</span>
            </label>
        `;
        categoryList.appendChild(div);
    });
};

// Actualizar presupuestos
const updateBudgetDisplay = () => {
    const presupuestos = getPresupuestos();
    const gastos = getGastos();
    const fecha = new Date();
    const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);

    // Actualizar período actual
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.querySelector('.period-label').textContent = 
        `Período actual: ${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;

    // Calcular gastos del mes
    const gastosMes = gastos.reduce((total, gasto) => {
        const fechaGasto = new Date(gasto.fecha);
        if (fechaGasto >= primerDiaMes) {
            return total + parseFloat(gasto.monto);
        }
        return total;
    }, 0);

    // Calcular saldo restante
    const saldoRestante = Math.max(0, presupuestos.total - gastosMes);

    // Actualizar displays principales
    document.getElementById('totalPresupuesto').textContent = formatCurrency(presupuestos.total);
    document.getElementById('gastoMensual').textContent = formatCurrency(gastosMes);
    document.getElementById('saldoRestante').textContent = formatCurrency(saldoRestante);
    
    if (presupuestos.total > 0) {
        const porcentaje = (gastosMes / presupuestos.total) * 100;
        const porcentajeRedondeado = Math.min(Math.round(porcentaje), 100);

        // Actualizar barra de progreso
        const progressBar = document.getElementById('progressGastos');
        progressBar.style.width = `${porcentajeRedondeado}%`;
        progressBar.className = 'progress';

        // Actualizar etiqueta de progreso
        document.getElementById('progressLabel').textContent = 
            `${formatCurrency(gastosMes)} de ${formatCurrency(presupuestos.total)}`;
        document.getElementById('porcentajeGastado').textContent = `${porcentajeRedondeado}%`;

        // Actualizar estados de las métricas
        const gastoMetric = document.getElementById('gastoMensual').parentElement;
        const saldoMetric = document.getElementById('saldoRestante').parentElement;
        const porcentajeMetric = document.getElementById('porcentajeGastado').parentElement;

        // Resetear clases
        [gastoMetric, saldoMetric, porcentajeMetric].forEach(metric => {
            metric.classList.remove('warning', 'danger');
        });
        progressBar.classList.remove('warning', 'danger');

        // Aplicar estados según porcentajes
        if (porcentaje >= 90) {
            progressBar.classList.add('danger');
            gastoMetric.classList.add('danger');
            saldoMetric.classList.add('danger');
            porcentajeMetric.classList.add('danger');
            showNotification('¡Atención! Has alcanzado el 90% de tu presupuesto mensual', 'warning');
        } else if (porcentaje >= 75) {
            progressBar.classList.add('warning');
            gastoMetric.classList.add('warning');
            saldoMetric.classList.add('warning');
            porcentajeMetric.classList.add('warning');
        }
    }
};

// Calcular totales
const calcularTotales = () => {
    const gastos = getGastos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const totales = gastos.reduce((acc, gasto) => {
        const fechaGasto = new Date(gasto.fecha);
        const monto = parseFloat(gasto.monto);

        if (fechaGasto.toDateString() === hoy.toDateString()) {
            acc.dia += monto;
        }
        if (fechaGasto >= inicioSemana) {
            acc.semana += monto;
        }
        if (fechaGasto >= inicioMes) {
            acc.mes += monto;
        }

        return acc;
    }, { dia: 0, semana: 0, mes: 0 });

    document.getElementById('totalDia').textContent = formatCurrency(totales.dia);
    document.getElementById('totalSemana').textContent = formatCurrency(totales.semana);
    document.getElementById('totalMes').textContent = formatCurrency(totales.mes);

    updateBudgetDisplay();
};

// Actualizar tabla de historial
const actualizarHistorial = () => {
    const gastos = getGastos();
    const fechaSeleccionada = new Date(currentHistoryDate);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    document.getElementById('currentDate').textContent = formatDate(fechaSeleccionada);

    const gastosDia = gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha);
        return fechaGasto.toDateString() === fechaSeleccionada.toDateString();
    });

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    gastosDia.forEach(gasto => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${gasto.descripcion}</td>
            <td>${gasto.categoria}</td>
            <td style="text-align: right">${formatCurrency(gasto.monto)}</td>
        `;
        tbody.appendChild(tr);
    });
};

// Función para exportar datos
const exportarDatos = () => {
    try {
        const gastos = getGastos();
        const presupuestos = getPresupuestos();
        const categorias = getCategorias();
        
        const datos = {
            gastos,
            presupuestos,
            categorias,
            fecha_exportacion: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finanzas_bry_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Datos exportados correctamente');
    } catch (error) {
        console.error('Error al exportar datos:', error);
        showNotification('Error al exportar los datos', 'warning');
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!checkStorage()) {
        return;
    }
    
    // Inicializar categorías
    updateCategoryList();
    
    // Inicializar fechas
    const today = new Date();
    document.getElementById('fecha').valueAsDate = today;
    currentHistoryDate = today;
    document.getElementById('historyDate').valueAsDate = today;
    
    // Inicializar displays
    calcularTotales();
    actualizarHistorial();
    
    // Manejar nueva categoría
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const input = document.getElementById('newCategory');
        const nombre = input.value.trim();
        
        if (nombre) {
            const categoria = {
                id: nombre.toLowerCase().replace(/\s+/g, '_'),
                nombre: nombre,
                emoji: '📌'
            };
            
            saveCategoria(categoria);
            updateCategoryList();
            input.value = '';
            showNotification('Categoría agregada correctamente');
        }
    });
    
    // Manejar formulario de presupuesto
    document.getElementById('budgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const total = parseFloat(document.getElementById('presupuestoTotal').value);
        
        if (total < 0) {
            showNotification('El presupuesto no puede ser negativo', 'warning');
            return;
        }
        
        savePresupuestos({
            total,
            categorias: {}
        });
        
        updateBudgetDisplay();
        showNotification('Presupuesto guardado correctamente');
        e.target.reset();
    });

    // Inicializar navegación
    const showSection = (sectionId) => {
        ['mainSection', 'historySection', 'budgetSection'].forEach(id => {
            document.getElementById(id).classList.toggle('hidden', id !== sectionId);
        });
    };

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            
            // Actualizar botones
            document.querySelectorAll('.nav-button').forEach(b => {
                b.classList.toggle('active', b === button);
            });
            
            // Mostrar sección correspondiente
            switch(section) {
                case 'main':
                    showSection('mainSection');
                    calcularTotales();
                    break;
                case 'history':
                    showSection('historySection');
                    actualizarHistorial();
                    break;
                case 'budget':
                    showSection('budgetSection');
                    break;
            }
        });
    });

    // Agregar botón de exportación al DOM
    const exportButton = document.createElement('button');
    exportButton.className = 'export-button';
    exportButton.innerHTML = `
        <span class="material-icons">download</span>
        Exportar Datos
    `;
    exportButton.addEventListener('click', exportarDatos);
    document.querySelector('.main-header').appendChild(exportButton);
});

// Selector de categorías
const categoryTrigger = document.getElementById('categoryTrigger');
const categorySelector = document.getElementById('categorySelector');
const selectedCategory = document.querySelector('.selected-category');

// Abrir/cerrar selector
categoryTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    categorySelector.classList.toggle('active');
});

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!categorySelector.contains(e.target) && !categoryTrigger.contains(e.target)) {
        categorySelector.classList.remove('active');
    }
});

// Manejar selección de categoría
document.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') {
        const label = document.querySelector(`label[for="${e.target.id}"]`);
        selectedCategory.innerHTML = label.innerHTML;
        selectedCategory.style.opacity = '1';
        categorySelector.classList.remove('active');
    }
});

// Manejar envío del formulario de gastos con validaciones mejoradas
document.getElementById('gastoForm').addEventListener('submit', (e) => {
    e.preventDefault();

    // Validar categoría
    const categoriaSeleccionada = document.querySelector('input[name="categoria"]:checked');
    if (!categoriaSeleccionada) {
        showNotification('Por favor selecciona un tipo de gasto', 'warning');
        return;
    }

    // Validar monto
    const monto = parseFloat(document.getElementById('monto').value);
    if (!validateAmount(monto)) {
        showNotification('El monto debe ser mayor a 0 y menor a 1,000,000 Bs', 'warning');
        return;
    }

    // Validar fecha
    const fecha = document.getElementById('fecha').value;
    if (!validateDate(fecha)) {
        showNotification('La fecha debe estar entre hoy y hace un año', 'warning');
        return;
    }

    // Validar descripción
    const descripcion = sanitizeInput(document.getElementById('descripcion').value);
    if (descripcion.length < 3) {
        showNotification('La descripción debe tener al menos 3 caracteres', 'warning');
        return;
    }

    const gasto = {
        fecha,
        descripcion,
        categoria: categoriaSeleccionada.value,
        monto
    };

    const gastos = getGastos();
    gastos.push(gasto);
    
    if (!saveToStorage('gastos', gastos)) {
        return; // Error handling ya manejado en saveToStorage
    }

    calcularTotales();
    if (new Date(gasto.fecha).toDateString() === currentHistoryDate.toDateString()) {
        actualizarHistorial();
    }

    // Limpiar formulario
    e.target.reset();
    document.getElementById('fecha').valueAsDate = new Date();
    selectedCategory.textContent = 'Seleccionar categoría';
    selectedCategory.style.opacity = '0.7';
    categoriaSeleccionada.checked = false;

    showNotification('Gasto registrado correctamente');
});

// Manejo de errores global
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
    showNotification('Ha ocurrido un error inesperado', 'warning');
});

// Verificar almacenamiento disponible
const checkStorage = () => {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        showNotification('No hay almacenamiento disponible. La aplicación podría no funcionar correctamente.', 'warning');
        return false;
    }
};

// Navegación del historial
document.getElementById('prevDate').addEventListener('click', () => {
    currentHistoryDate.setDate(currentHistoryDate.getDate() - 1);
    actualizarHistorial();
});

document.getElementById('nextDate').addEventListener('click', () => {
    currentHistoryDate.setDate(currentHistoryDate.getDate() + 1);
    actualizarHistorial();
});

document.getElementById('historyDate').addEventListener('change', (e) => {
    currentHistoryDate = new Date(e.target.value);
    actualizarHistorial();
}); 