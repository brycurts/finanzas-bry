// Constantes
const STORAGE_KEYS = {
    GASTOS: 'gastos',
    PRESUPUESTOS: 'presupuestos',
    CATEGORIAS: 'categorias'
};

const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    WARNING: 'warning'
};

const defaultCategories = [
    { id: 'comida', nombre: 'Alimentación', emoji: '🍽️' },
    { id: 'transporte', nombre: 'Transporte', emoji: '🚗' },
    { id: 'servicios', nombre: 'Servicios', emoji: '🏠' },
    { id: 'diversion', nombre: 'Entretenimiento', emoji: '🎮' },
    { id: 'salud', nombre: 'Salud', emoji: '⚕️' },
    { id: 'educacion', nombre: 'Educación', emoji: '📚' },
    { id: 'ropa', nombre: 'Ropa', emoji: '👕' },
    { id: 'otros', nombre: 'Otros', emoji: '📦' }
];

// Estado Global
let currentHistoryDate = new Date();

// Utilidades
const formatCurrency = (amount) => {
    return `Bs ${parseFloat(amount).toFixed(2)}`;
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const showNotification = (message, type = NOTIFICATION_TYPES.SUCCESS) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="material-icons">${type === NOTIFICATION_TYPES.SUCCESS ? 'check_circle' : 'warning'}</span>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Gestión de LocalStorage
const getFromStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error(`Error al leer ${key} del localStorage:`, error);
        return defaultValue;
    }
};

const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`Error al guardar en ${key}:`, error);
        showNotification('Error al guardar los datos. El almacenamiento puede estar lleno.', NOTIFICATION_TYPES.WARNING);
        return false;
    }
};

// Gestión de Datos
const getCategorias = () => getFromStorage(STORAGE_KEYS.CATEGORIAS, defaultCategories);
const getGastos = () => getFromStorage(STORAGE_KEYS.GASTOS, []);
const getPresupuestos = () => getFromStorage(STORAGE_KEYS.PRESUPUESTOS, { total: 0, categorias: {} });

const saveCategoria = (categoria) => {
    const categorias = getCategorias();
    if (categorias.some(cat => cat.id === categoria.id)) {
        showNotification('Esta categoría ya existe', NOTIFICATION_TYPES.WARNING);
        return false;
    }
    categorias.push(categoria);
    return saveToStorage(STORAGE_KEYS.CATEGORIAS, categorias);
};

const saveGasto = (gasto) => {
    const gastos = getGastos();
    gastos.push(gasto);
    return saveToStorage(STORAGE_KEYS.GASTOS, gastos);
};

const deleteGasto = (index) => {
    const gastos = getGastos();
    gastos.splice(index, 1);
    return saveToStorage(STORAGE_KEYS.GASTOS, gastos);
};

const savePresupuesto = (presupuesto) => {
    return saveToStorage(STORAGE_KEYS.PRESUPUESTOS, presupuesto);
};

// Cálculos
const calcularGastosPeriodo = (inicio, fin) => {
    const gastos = getGastos();
    return gastos.reduce((total, gasto) => {
        const fechaGasto = new Date(gasto.fecha);
        if (fechaGasto >= inicio && fechaGasto <= fin) {
            return total + parseFloat(gasto.monto);
        }
        return total;
    }, 0);
};

const calcularTotales = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const totales = {
        dia: calcularGastosPeriodo(hoy, hoy),
        semana: calcularGastosPeriodo(inicioSemana, hoy),
        mes: calcularGastosPeriodo(inicioMes, hoy)
    };

    // Actualizar UI
    document.getElementById('totalDia').textContent = formatCurrency(totales.dia);
    document.getElementById('totalSemana').textContent = formatCurrency(totales.semana);
    document.getElementById('totalMes').textContent = formatCurrency(totales.mes);

    updateBudgetDisplay();
};

// Actualización de UI
const updateCategoryList = () => {
    const categorias = getCategorias();
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';

    categorias.forEach(categoria => {
        const div = document.createElement('div');
        div.innerHTML = `
            <input type="radio" 
                   id="${categoria.id}" 
                   name="categoria" 
                   value="${categoria.nombre}"
                   aria-label="Seleccionar categoría ${categoria.nombre}">
            <label for="${categoria.id}" class="category-option">
                <span class="emoji">${categoria.emoji}</span>
                <span class="text">${categoria.nombre}</span>
            </label>
        `;
        categoryList.appendChild(div);
    });
};

const updateBudgetDisplay = () => {
    const presupuestos = getPresupuestos();
    const gastosMes = calcularGastosPeriodo(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date()
    );
    const saldoRestante = Math.max(0, presupuestos.total - gastosMes);
    
    // Actualizar período actual
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fecha = new Date();
    document.querySelector('.period-label').textContent = 
        `Período actual: ${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;

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
        progressBar.setAttribute('aria-valuenow', porcentajeRedondeado);

        // Actualizar etiquetas
        document.getElementById('progressLabel').textContent = 
            `${formatCurrency(gastosMes)} de ${formatCurrency(presupuestos.total)}`;
        document.getElementById('porcentajeGastado').textContent = `${porcentajeRedondeado}%`;

        // Actualizar estados
        const elements = {
            gasto: document.getElementById('gastoMensual').parentElement,
            saldo: document.getElementById('saldoRestante').parentElement,
            porcentaje: document.getElementById('porcentajeGastado').parentElement,
            progress: progressBar
        };

        // Resetear estados
        Object.values(elements).forEach(el => {
            el.classList.remove('warning', 'danger');
        });

        // Aplicar nuevos estados
        if (porcentaje >= 90) {
            Object.values(elements).forEach(el => el.classList.add('danger'));
            showNotification('¡Atención! Has alcanzado el 90% de tu presupuesto mensual', NOTIFICATION_TYPES.WARNING);
        } else if (porcentaje >= 75) {
            Object.values(elements).forEach(el => el.classList.add('warning'));
        }
    }
};

const actualizarHistorial = () => {
    const gastos = getGastos();
    const fechaSeleccionada = new Date(currentHistoryDate);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    document.getElementById('currentDate').textContent = formatDate(fechaSeleccionada);
    document.getElementById('historyDate').valueAsDate = fechaSeleccionada;

    const gastosDia = gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha);
        return fechaGasto.toDateString() === fechaSeleccionada.toDateString();
    });

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (gastosDia.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-center">No hay gastos registrados para este día</td>';
        tbody.appendChild(tr);
    } else {
        gastosDia.forEach((gasto, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${gasto.descripcion}</td>
                <td>${gasto.categoria}</td>
                <td class="text-right">${formatCurrency(gasto.monto)}</td>
                <td class="text-center">
                    <button class="btn-delete" onclick="handleDeleteGasto(${index})" aria-label="Eliminar gasto">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Actualizar total del día
    const totalDia = gastosDia.reduce((total, gasto) => total + parseFloat(gasto.monto), 0);
    document.getElementById('totalDiaHistorial').textContent = formatCurrency(totalDia);
};

// Event Handlers
const handleDeleteGasto = (index) => {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        if (deleteGasto(index)) {
            showNotification('Gasto eliminado correctamente');
            actualizarHistorial();
            calcularTotales();
        }
    }
};

const handleNavigation = (direction) => {
    const newDate = new Date(currentHistoryDate);
    newDate.setDate(currentHistoryDate.getDate() + direction);
    
    if (newDate <= new Date()) {
        currentHistoryDate = newDate;
        actualizarHistorial();
    }
};

// Función para generar PDF
const exportarPDF = () => {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('La librería jsPDF no está cargada correctamente');
        }

        const doc = new jsPDF();
        
        // Configuración inicial
        doc.setFont('helvetica');
        doc.setFontSize(20);
        doc.setTextColor(93, 41, 255); // Color primario

        // Título y fecha
        doc.text('Finanzas Bry - Reporte', 20, 20);
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        
        const fecha = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Fecha del reporte: ${fecha}`, 20, 30);

        // Obtener datos
        const presupuestos = getPresupuestos();
        const gastosMes = calcularGastosPeriodo(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            new Date()
        );
        const saldoRestante = Math.max(0, presupuestos.total - gastosMes);
        const porcentajeUtilizado = presupuestos.total > 0 
            ? Math.round((gastosMes / presupuestos.total) * 100)
            : 0;

        // Resumen de presupuesto
        doc.setFontSize(14);
        doc.text('Resumen de Presupuesto', 20, 45);

        const resumenData = [
            ['Presupuesto Total', formatCurrency(presupuestos.total)],
            ['Gastos del Mes', formatCurrency(gastosMes)],
            ['Saldo Restante', formatCurrency(saldoRestante)],
            ['Porcentaje Utilizado', `${porcentajeUtilizado}%`]
        ];

        doc.autoTable({
            startY: 50,
            head: [['Concepto', 'Monto']],
            body: resumenData,
            theme: 'grid',
            headStyles: { 
                fillColor: [93, 41, 255],
                textColor: [255, 255, 255]
            },
            styles: { 
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [245, 245, 255]
            }
        });

        // Gastos por categoría
        const gastos = getGastos();
        const gastosDelMes = gastos.filter(gasto => {
            const fechaGasto = new Date(gasto.fecha);
            const hoy = new Date();
            return fechaGasto.getMonth() === hoy.getMonth() && 
                   fechaGasto.getFullYear() === hoy.getFullYear();
        });

        const categorias = {};
        gastosDelMes.forEach(gasto => {
            categorias[gasto.categoria] = (categorias[gasto.categoria] || 0) + parseFloat(gasto.monto);
        });

        const categoriasData = Object.entries(categorias)
            .sort((a, b) => b[1] - a[1]) // Ordenar por monto descendente
            .map(([categoria, monto]) => [
                categoria,
                formatCurrency(monto),
                `${Math.round((monto / gastosMes) * 100)}%`
            ]);

        doc.text('Gastos por Categoría', 20, doc.previousAutoTable.finalY + 20);

        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 25,
            head: [['Categoría', 'Monto', 'Porcentaje']],
            body: categoriasData,
            theme: 'grid',
            headStyles: { 
                fillColor: [93, 41, 255],
                textColor: [255, 255, 255]
            },
            styles: { 
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [245, 245, 255]
            }
        });

        // Detalle de gastos
        doc.text('Detalle de Gastos del Mes', 20, doc.previousAutoTable.finalY + 20);

        const gastosData = gastosDelMes
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map(gasto => [
                new Date(gasto.fecha).toLocaleDateString('es-ES'),
                gasto.descripcion,
                gasto.categoria,
                formatCurrency(gasto.monto)
            ]);

        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 25,
            head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
            body: gastosData,
            theme: 'grid',
            headStyles: { 
                fillColor: [93, 41, 255],
                textColor: [255, 255, 255]
            },
            styles: { 
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [245, 245, 255]
            }
        });

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.width - 20,
                doc.internal.pageSize.height - 10,
                { align: 'right' }
            );
        }

        // Guardar el PDF
        const nombreArchivo = `finanzas_bry_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
        
        showNotification('Reporte PDF generado correctamente');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        showNotification('Error al generar el PDF', NOTIFICATION_TYPES.WARNING);
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Verificar almacenamiento
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        showNotification('No hay almacenamiento disponible. La aplicación podría no funcionar correctamente.', NOTIFICATION_TYPES.WARNING);
        return;
    }

    // Inicializar fechas
    const today = new Date();
    document.getElementById('fecha').valueAsDate = today;
    document.getElementById('fecha').max = today.toISOString().split('T')[0];
    currentHistoryDate = today;
    document.getElementById('historyDate').valueAsDate = today;
    document.getElementById('historyDate').max = today.toISOString().split('T')[0];

    // Inicializar UI
    updateCategoryList();
    calcularTotales();
    actualizarHistorial();

    // Event Listeners
    // Formulario de Gastos
    document.getElementById('gastoForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const categoriaSeleccionada = document.querySelector('input[name="categoria"]:checked');
        if (!categoriaSeleccionada) {
            showNotification('Por favor selecciona una categoría', NOTIFICATION_TYPES.WARNING);
            return;
        }

        const monto = parseFloat(document.getElementById('monto').value);
        if (monto <= 0 || monto > 1000000) {
            showNotification('El monto debe estar entre 0 y 1,000,000 Bs', NOTIFICATION_TYPES.WARNING);
            return;
        }

        const gasto = {
            fecha: document.getElementById('fecha').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            categoria: categoriaSeleccionada.value,
            monto: monto
        };

        if (saveGasto(gasto)) {
            calcularTotales();
            if (new Date(gasto.fecha).toDateString() === currentHistoryDate.toDateString()) {
                actualizarHistorial();
            }
            showNotification('Gasto registrado correctamente');
            e.target.reset();
            document.getElementById('fecha').valueAsDate = new Date();
            document.querySelector('.selected-category').textContent = 'Seleccionar categoría';
            document.querySelector('.selected-category').style.opacity = '0.7';
            categoriaSeleccionada.checked = false;
        }
    });

    // Categorías
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const input = document.getElementById('newCategory');
        const nombre = input.value.trim();
        
        if (nombre) {
            const categoria = {
                id: nombre.toLowerCase().replace(/\s+/g, '_'),
                nombre: nombre,
                emoji: '📌'
            };
            
            if (saveCategoria(categoria)) {
                updateCategoryList();
                input.value = '';
                showNotification('Categoría agregada correctamente');
            }
        }
    });

    // Selector de Categorías
    const categoryTrigger = document.getElementById('categoryTrigger');
    const categorySelector = document.getElementById('categorySelector');

    categoryTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = categorySelector.classList.contains('active');
        categoryTrigger.setAttribute('aria-expanded', !isExpanded);
        categorySelector.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!categorySelector.contains(e.target) && !categoryTrigger.contains(e.target)) {
            categorySelector.classList.remove('active');
            categoryTrigger.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.name === 'categoria') {
            const label = document.querySelector(`label[for="${e.target.id}"]`);
            document.querySelector('.selected-category').innerHTML = label.innerHTML;
            document.querySelector('.selected-category').style.opacity = '1';
            categorySelector.classList.remove('active');
            categoryTrigger.setAttribute('aria-expanded', 'false');
        }
    });

    // Presupuestos
    document.getElementById('budgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const total = parseFloat(document.getElementById('presupuestoTotal').value);
        
        if (total < 0 || total > 1000000) {
            showNotification('El presupuesto debe estar entre 0 y 1,000,000 Bs', NOTIFICATION_TYPES.WARNING);
            return;
        }
        
        if (savePresupuesto({ total, categorias: {} })) {
            updateBudgetDisplay();
            showNotification('Presupuesto guardado correctamente');
            e.target.reset();
        }
    });

    // Navegación
    document.getElementById('prevDate').addEventListener('click', () => handleNavigation(-1));
    document.getElementById('nextDate').addEventListener('click', () => handleNavigation(1));
    document.getElementById('historyDate').addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        if (selectedDate <= new Date()) {
            currentHistoryDate = selectedDate;
            actualizarHistorial();
        }
    });

    // Navegación Principal
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            
            // Actualizar botones
            document.querySelectorAll('.nav-button').forEach(b => {
                b.classList.toggle('active', b === button);
                b.setAttribute('aria-pressed', b === button);
            });
            
            // Mostrar sección correspondiente
            ['mainSection', 'historySection', 'budgetSection'].forEach(id => {
                const el = document.getElementById(id);
                el.classList.toggle('hidden', id !== `${section}Section`);
                if (!el.classList.contains('hidden')) {
                    if (id === 'historySection') actualizarHistorial();
                    if (id === 'mainSection') calcularTotales();
                }
            });
        });
    });

    // Exportación
    document.getElementById('exportButton').addEventListener('click', exportarPDF);

    // Limpieza de Datos
    document.getElementById('clearDayButton').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.add('active');
    });

    document.getElementById('cancelClear').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
    });

    document.getElementById('confirmClear').addEventListener('click', () => {
        localStorage.clear();
        saveToStorage(STORAGE_KEYS.CATEGORIAS, defaultCategories);
        showNotification('Todos los datos han sido eliminados');
        document.getElementById('confirmModal').classList.remove('active');
        location.reload();
    });

    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            document.getElementById('confirmModal').classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('confirmModal').classList.contains('active')) {
            document.getElementById('confirmModal').classList.remove('active');
        }
    });
}); 