// DOM Elements
console.log('Dashboard Script Loaded v4');
const projectsList = document.getElementById('projects-list');
const projectDetail = document.getElementById('project-detail');
const projectsView = document.getElementById('view-projects');
const backToProjectsBtn = document.getElementById('back-to-projects');
const lotsTableBody = document.getElementById('lots-table-body');
const mapContainer = document.getElementById('interactive-map');

// Quote Modal
const quoteModal = document.getElementById('quote-modal');
const closeModal = document.querySelector('.close-modal');
const quoteForm = document.getElementById('quote-form');

// Other Modals (Moved to top to prevent ReferenceError)
const editLotModal = document.getElementById('edit-lot-modal');
const editQuoteModal = document.getElementById('edit-quote-modal');
const detailModal = document.getElementById('detail-modal'); // Assuming this exists or will exist
const editClientModal = document.getElementById('edit-client-modal');
// const editProjectModal = document.getElementById('edit-project-modal'); // Not seen in HTML, kept comment if needed
const editQuoteForm = document.getElementById('edit-quote-form'); // Needed for event listener

// Users
const usersListBody = document.getElementById('users-list-body');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');
const navUsers = document.getElementById('nav-users');

// Mobile Sidebar
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebar = document.querySelector('.sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.remove('hidden');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.add('hidden');
    });
}


// Filters
const filterMz = document.getElementById('filter-mz');
const filterNum = document.getElementById('filter-num');
const filterArea = document.getElementById('filter-area');
const filterStatus = document.getElementById('filter-status');

// State
let allProjects = [];
let currentProject = null;
let currentLots = [];
let currentQuotes = [];

window.showLoader = () => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');
};

window.hideLoader = () => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
};
let bulkState = {
    lots: new Set(),
    quotes: new Set(),
    clients: new Set()
};

// --- Projects ---

function closeAllModals() {
    [quoteModal, editLotModal, editQuoteModal, detailModal, editProjectModal, createLotModal].forEach(m => {
        if (m) m.classList.add('hidden');
    });
}

window.loadProjects = async () => {
    try {
        console.log('START: Loading projects...');
        
        // Reset View State: Show List, Hide Detail
        if (projectsList) projectsList.classList.remove('hidden');
        if (projectDetail) projectDetail.classList.add('hidden');
        currentProject = null;
        
        const projects = await api.get('/projects');
        allProjects = projects;
        console.log('SUCCESS: Projects received:', projects);

        if (!projects || projects.length === 0) {
            projectsList.innerHTML = '<p>No hay proyectos registrados en la base de datos.</p>';
            return;
        }

        renderProjects(projects);
    } catch (error) {
        console.error('FAIL: Error loading projects', error);
        if (projectsList) {
            projectsList.innerHTML = `<p style="color:red">Error cargando proyectos: ${error.message}</p>`;
        }
    }
};

function renderProjects(projects) {
    projectsList.innerHTML = '';
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user && user.role === 'Administrador';

    projects.forEach(p => {
        // Fallback: strictly hide inactive projects for non-admins
        if (!isAdmin && p.estado !== 'ACTIVO') return;

        const card = document.createElement('div');
        card.className = 'project-card';
        // Allow clicking the card to open details, but buttons inside should stop propagation
        card.onclick = (e) => {
            // If click target is not a button or child of button, load detail
            if (!e.target.closest('button')) {
                loadProjectDetail(p.id_proyecto);
            }
        };

        const statusBtn = isAdmin
            ? `<button class="btn-small" style="margin-top:0.5rem; width:100%" onclick="toggleProjectStatus(${p.id_proyecto}, '${p.estado}', event)">
                ${p.estado === 'ACTIVO' ? '<i class="fas fa-eye-slash"></i> Desactivar' : '<i class="fas fa-eye"></i> Activar'}
               </button>`
            : '';

        card.innerHTML = `
            <div class="project-img" style="background-image: url('${p.imagen_mapa || 'https://via.placeholder.com/300'}')"></div>
            <div class="project-info">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <h3 style="margin:0">${p.nombre}</h3>
                    <span class="badge ${p.estado === 'ACTIVO' ? 'badge-available' : 'badge-sold'}" style="font-size:0.7rem">${p.estado}</span>
                </div>
                ${statusBtn}
            </div>
        `;
        projectsList.appendChild(card);
    });
}

// --- Project Detail & Map ---

async function loadProjectDetail(id) {
    try {
        const project = await api.get(`/projects/${id}`);
        currentProject = project;
        // Sort lots by Manzana and then by Numero
        currentLots = (project.Lotes || []).sort((a, b) => {
            const mzDiff = (a.manzana || '').localeCompare(b.manzana || '');
            if (mzDiff !== 0) return mzDiff;
            return (a.numero || 0) - (b.numero || 0);
        });
        selectedLotId = null; // Reset selection

        // Show Detail View
        projectsList.classList.add('hidden');
        projectDetail.classList.remove('hidden');

        document.getElementById('project-title').textContent = project.nombre;

        const mainTitle = document.getElementById('main-projects-title');
        if (mainTitle) mainTitle.innerHTML = `Proyectos <span style="font-weight:300; margin:0 10px;">-</span> ${project.nombre}`;

        // Add 'Add Lot' button if Admin
        const user = JSON.parse(localStorage.getItem('user'));
        const isAdmin = user && user.role === 'Administrador';

        const adminActions = document.getElementById('admin-lot-actions');
        const lotsContainer = document.querySelector('.lots-list-container');
        if (lotsContainer) {
            lotsContainer.classList.toggle('role-admin', isAdmin);
            lotsContainer.classList.toggle('role-asesor', !isAdmin);
        }

        if (adminActions) {
            if (isAdmin) {
                adminActions.classList.remove('hidden');
            } else {
                adminActions.classList.add('hidden');
            }
        }

        let addLotBtn = document.getElementById('btn-add-lot');
        if (!addLotBtn && isAdmin) {
            const lotesHeaderContainer = document.getElementById('lotes-header-container');
            if (lotesHeaderContainer) {
                addLotBtn = document.createElement('button');
                addLotBtn.id = 'btn-add-lot';
                addLotBtn.className = 'btn-primary';
                addLotBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Nuevo Lote</span>';
                // Button style handles via class now
                addLotBtn.onclick = window.openCreateLotModal;

                // Insert before admin actions
                if (adminActions) {
                    lotesHeaderContainer.insertBefore(addLotBtn, adminActions);
                } else {
                    lotesHeaderContainer.appendChild(addLotBtn);
                }
            }
        }

        populateManzanaFilter(currentLots);
        filterLots(); // Initial render with logic
        renderMap(project, currentLots);

    } catch (error) {
        console.error('Error loading project detail', error);
    }
}

// Populate Manzana Filter
function populateManzanaFilter(lots) {
    const filterMz = document.getElementById('filter-mz');
    if (!filterMz) return;

    // Save current selection
    const currentVal = filterMz.value;

    // Get unique manzanas (and simple sort)
    const manzanas = [...new Set(lots.map(l => l.manzana))].sort();

    filterMz.innerHTML = '<option value="">Todas</option>';
    manzanas.forEach(m => {
        if (!m) return;
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        filterMz.appendChild(opt);
    });

    // Restore if possible
    if (manzanas.includes(currentVal)) {
        filterMz.value = currentVal;
    }
}

backToProjectsBtn.addEventListener('click', () => {
    projectDetail.classList.add('hidden');
    projectsList.classList.remove('hidden');
    const mainTitle = document.getElementById('main-projects-title');
    if (mainTitle) mainTitle.textContent = 'Proyectos';
});

// Filters Event Listeners
const filterUbicacion = document.getElementById('filter-ubicacion');

[filterMz, filterNum, filterArea, filterStatus, filterUbicacion].forEach(input => {
    if (input) input.addEventListener('input', filterLots);
});

function filterLots() {
    const mz = filterMz.value.toUpperCase();
    const num = parseInt(filterNum.value);
    const area = parseFloat(filterArea.value);
    const status = filterStatus.value;
    const ubicacion = document.getElementById('filter-ubicacion').value;

    const filtered = currentLots.filter(l => {
        if (mz && l.manzana !== mz) return false;
        if (!isNaN(num) && l.numero !== num) return false;
        if (!isNaN(area) && l.area < area) return false;
        if (status && l.EstadoLote.nombre_estado.toUpperCase() !== status) return false;
        if (ubicacion && (l.ubicacion || 'calle').toLowerCase() !== ubicacion.toLowerCase()) return false;
        return true;
    });

    renderLotsTable(filtered);
}

// --- Create Lot Logic ---
const createLotModal = document.getElementById('create-lot-modal');
const closeCreateLot = document.querySelector('.close-create-lot');
const createLotForm = document.getElementById('create-lot-form');

// Helper to open modal
window.openCreateLotModal = () => {
    if (!currentProject) return;
    closeAllModals();
    createLotForm.reset();
    createLotModal.classList.remove('hidden');
};

if (closeCreateLot) closeCreateLot.onclick = () => createLotModal.classList.add('hidden');

if (createLotForm) {
    createLotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        window.showLoader();

        try {
            const data = {
                id_proyecto: currentProject.id_proyecto,
                manzana: document.getElementById('new-lot-mz').value.toUpperCase(),
                numero: document.getElementById('new-lot-num').value,
                area: document.getElementById('new-lot-area').value,
                precio_contado: document.getElementById('new-lot-price-contado').value,
                precio_financiado: document.getElementById('new-lot-price-financiado').value,
                precio_oferta: document.getElementById('new-lot-price-oferta').value,
                id_estado_lote: document.getElementById('new-lot-status').value,
                coordenada_x: document.getElementById('new-lot-x').value,
                coordenada_y: document.getElementById('new-lot-y').value,
                ubicacion: document.getElementById('new-lot-ubicacion').value || 'calle'
            };

            await api.post('/lots', data);
            window.hideLoader();
            window.showSuccessModal('Lote creado exitosamente');
            createLotModal.classList.add('hidden');

            // Reload Project Details to show new lot
            loadProjectDetail(currentProject.id_proyecto);
        } catch (error) {
            window.hideLoader();
            alert('Error creando lote: ' + error.message);
        }
    });
}




function renderLotsTable(lots) {
    lotsTableBody.innerHTML = '';
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user && user.role === 'Administrador';

    lots.forEach(l => {
        const tr = document.createElement('tr');
        tr.id = `lot-row-${l.id_lote}`;

        // Admin Buttons Logic
        const editBtn = isAdmin ? `<button class="btn-small btn-edit" onclick="editLot(${l.id_lote})" title="Editar"><i class="fas fa-edit"></i></button>` : '';
        const deleteBtn = isAdmin ? `<button class="btn-small btn-delete" onclick="deleteLot(${l.id_lote})" title="Eliminar"><i class="fas fa-trash"></i></button>` : '';

        const quoteBtn = l.EstadoLote.nombre_estado === 'DISPONIBLE'
            ? `<button class="btn-small" onclick="openQuoteModal(${l.id_lote})" title="Cotizar"><i class="fas fa-calculator"></i></button>`
            : '';

        const isChecked = bulkState.lots.has(l.id_lote) ? 'checked' : '';
        const checkCell = isAdmin ? `<td><input type="checkbox" class="bulk-check" data-id="${l.id_lote}" data-type="lots" onchange="toggleBulk('lots', ${l.id_lote}, this.checked)" ${isChecked}></td>` : '';

        tr.innerHTML = `
            ${checkCell}
            <td class="col-mz">${l.manzana}</td>
            <td class="col-n">${l.numero}</td>
            <td class="col-ubic">${(l.ubicacion || 'Calle').toUpperCase()}</td>
            <td class="col-area">${l.area} m2</td>
            <td class="col-precio">${l.precio_contado ? `S/ ${parseFloat(l.precio_contado).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
            <td class="col-estado"><span class="badge badge-${l.EstadoLote.nombre_estado.toLowerCase() === 'disponible' ? 'available' : (l.EstadoLote.nombre_estado.toLowerCase() === 'vendido' ? 'sold' : (l.EstadoLote.nombre_estado.toLowerCase() === 'espacio publico' ? 'public-space' : 'reserved'))}">${l.EstadoLote.nombre_estado}</span></td>
            <td class="col-acciones">
                ${quoteBtn}
                <button class="btn-small" onclick="viewDetail('lot', ${l.id_lote})" title="Ver Detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${editBtn}
                ${deleteBtn}
            </td>
        `;

        // Hover effect to highlight map dot
        tr.addEventListener('mouseenter', () => highlightDot(l.id_lote, true));
        tr.addEventListener('mouseleave', () => highlightDot(l.id_lote, false));

        // Single Click: Just Select (Highlight)
        tr.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return; // Ignore buttons and checkboxes
            selectLot(l.id_lote);
        });

        // Double Click: Navigate to Map Point
        tr.addEventListener('dblclick', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return; // Ignore buttons and checkboxes

            // Fix ID selector (remove spaces)
            const dot = document.getElementById(`lot-dot-${l.id_lote}`);
            if (dot) {
                dot.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        });

        lotsTableBody.appendChild(tr);
    });

    // Manage Header Visibility for Bulk Checkbox
    const checkAllHeader = document.getElementById('check-all-lots')?.closest('th');
    if (checkAllHeader) {
        if (isAdmin) {
            checkAllHeader.style.display = '';
        } else {
            checkAllHeader.style.display = 'none';
        }
    }
}

// Admin Helpers
// Admin Helpers
window.deleteLot = (id) => {
    window.showConfirmModal('¿Estás seguro de que deseas eliminar este lote?', async () => {
        window.showLoader();
        try {
            await api.delete(`/lots/${id}`);
            window.hideLoader();
            window.showSuccessModal('Lote eliminado correctamente');
            window.loadProjects();
        } catch (error) {
            window.hideLoader();
            alert('Error al eliminar: ' + error.message);
        }
    });
};


window.editLot = (id) => {
    alert('Funcionalidad de edición pendiente de implementar.');
};

window.toggleProjectStatus = (id, currentStatus, event) => {
    if (event) event.stopPropagation();
    const newStatus = currentStatus === 'ACTIVO' ? 'NO ACTIVO' : 'ACTIVO';

    window.showConfirmModal(`¿Estás seguro de cambiar el estado a ${newStatus}?`, async () => {
        window.showLoader();
        try {
            await api.put(`/projects/${id}/status`, { estado: newStatus });
            window.hideLoader();
            window.showSuccessModal('Estado del proyecto actualizado');
            window.loadProjects();
        } catch (error) {
            window.hideLoader();
            alert('Error al cambiar estado: ' + error.message);
        }
    }, 'Cambiar Estado', 'Actualizar');
};





// --- Quotes ---

const quotesListBody = document.getElementById('quotes-list-body');

window.loadQuotes = async () => {
    try {
        const quotes = await api.get('/quotes');
        currentQuotes = quotes;
        renderQuotes(quotes);
    } catch (error) {
        console.error('Error loading quotes', error);
        quotesListBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
};

function renderQuotes(quotes) {
    quotesListBody.innerHTML = '';
    if (!quotes || quotes.length === 0) {
        quotesListBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay cotizaciones registradas.</td></tr>`;
        const countSpan = document.getElementById('quote-count');
        if (countSpan) countSpan.textContent = '(0)';
        return;
    }

    const countSpan = document.getElementById('quote-count');
    if (countSpan) countSpan.textContent = `(${quotes.length})`;

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user && user.role === 'Administrador';

    // Manage Header Visibility for Bulk Checkbox
    const checkAllHeader = document.getElementById('check-all-quotes')?.closest('th');
    if (checkAllHeader) {
        if (isAdmin) {
            checkAllHeader.style.display = '';
        } else {
            checkAllHeader.style.display = 'none';
        }
    }

    quotes.forEach(q => {
        const tr = document.createElement('tr');

        // Safety checks for nested objects
        const clientName = q.Cliente ? q.Cliente.nombre : 'Sin Cliente';
        const projectName = q.Lote && q.Lote.Proyecto ? q.Lote.Proyecto.nombre : '-';
        const lotInfo = q.Lote ? `Mz ${q.Lote.manzana} Lote ${q.Lote.numero}` : '-';

        // Admin Buttons
        const editBtn = isAdmin ? `<button class="btn-small btn-edit" onclick="editQuote(${q.id_cotizaciones})" title="Editar"><i class="fas fa-edit"></i></button>` : '';
        const deleteBtn = isAdmin ? `<button class="btn-small btn-delete" onclick="deleteQuote(${q.id_cotizaciones})" title="Eliminar"><i class="fas fa-trash"></i></button>` : '';

        const isChecked = bulkState.quotes.has(q.id_cotizaciones) ? 'checked' : '';

        const checkCell = isAdmin ? `<td><input type="checkbox" class="bulk-check" data-id="${q.id_cotizaciones}" data-type="quotes" onchange="toggleBulk('quotes', ${q.id_cotizaciones}, this.checked)" ${isChecked}></td>` : '';

        tr.innerHTML = `
            ${checkCell}
            <td>${q.id_cotizaciones}</td>
            <td>${clientName}</td>
            <td>${projectName}</td>
            <td>${lotInfo}</td>
            <td>S/ ${q.precio_final}</td>
            <td>S/ ${q.inicial}</td>
            <td>S/ ${q.mensualidad}</td>
            <td>${q.plazo_meses} meses</td>
            <td>${q.plazo_meses <= 1 ? 'Contado' : 'Financiado'}</td>
            <td>${(q.fecha_creacion || q.createdAt) ? new Date(q.fecha_creacion || q.createdAt).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn-small" onclick="window.open('${API_URL}/quotes/${q.id_cotizaciones}/pdf?token=${localStorage.getItem('token')}', '_blank')" title="Ver PDF">
                    <i class="fas fa-file-pdf"></i>
                </button>
                <button class="btn-small" onclick="viewDetail('quote', ${q.id_cotizaciones})" title="Ver Detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${editBtn}
                ${deleteBtn}
                ${isAdmin ? `<button class="btn-small" style="background-color: #10b981;" onclick="createSaleFromQuote(${q.id_cotizaciones})" title="Generar Venta">
                    <i class="fas fa-handshake"></i>
                </button>` : ''}
            </td>
        `;
        quotesListBody.appendChild(tr);
    });
}


// Create Sale from Quote
window.createSaleFromQuote = (quoteId) => {
    const quote = currentQuotes.find(q => q.id_cotizaciones === quoteId);
    if (!quote) return;

    window.showConfirmModal(`¿Generar venta para el cliente ${quote.Cliente ? quote.Cliente.nombre : ''}?`, async () => {
        window.showLoader();
        try {
            const body = {
                id_cotizaciones: quote.id_cotizaciones,
                id_cliente: quote.id_cliente,
                id_lote: quote.id_lote,
                precio_final: quote.precio_final, // assuming quote has this field calculated or stored
                inicial: quote.inicial,
                mensualidad: quote.mensualidad,
                plazo_meses: quote.plazo_meses
            };

            // Double check if precio_final is available in quote object from GET /quotes
            // In renderQuotes we use q.precio_final, so it should be there.

            await api.post('/sales', body);
            window.hideLoader();
            window.showSuccessModal('Venta registrada exitosamente.');

            // Refresh
            window.loadQuotes();
            // Also refresh projects to show Lote as Sold
            if (window.loadProjects) window.loadProjects();

        } catch (error) {
            window.hideLoader();
            alert('Error al generar venta: ' + error.message);
        }
    }, 'Generar Venta', 'Confirmar');
};

// Quote Admin Helpers
window.deleteQuote = (id) => {
    window.showConfirmModal('¿Estás seguro de que deseas eliminar esta cotización?', async () => {
        window.showLoader();
        try {
            await api.delete(`/quotes/${id}`);
            window.hideLoader();
            window.showSuccessModal('Cotización eliminada correctamente');
            window.loadQuotes();
        } catch (error) {
            window.hideLoader();
            alert('Error al eliminar: ' + error.message);
        }
    });
};

window.editQuote = (id) => {
    alert('Funcionalidad de edición de cotización pendiente.');
};

// --- Map Tooltip Logic ---
let mapTooltip = null;

function getOrCreateTooltip() {
    if (!mapTooltip) {
        mapTooltip = document.createElement('div');
        mapTooltip.className = 'custom-tooltip';
        document.body.appendChild(mapTooltip);
    }
    return mapTooltip;
}

function updateTooltip(x, y, lot) {
    const tooltip = getOrCreateTooltip();

    // Format Price
    const isPublicSpace = lot.EstadoLote && lot.EstadoLote.nombre_estado === 'ESPACIO PUBLICO';
    let priceHtml = '';

    if (!isPublicSpace && lot.precio_contado) {
        const priceFormatted = parseFloat(lot.precio_contado).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        priceHtml = `
        <div class="tooltip-row">
            <span class="tooltip-label">Desde:</span>
            <span class="tooltip-value">S/ ${priceFormatted}</span>
        </div>`;
    }

    tooltip.innerHTML = `
        <h4>Mz ${lot.manzana} - Lote ${lot.numero}</h4>
        <div class="tooltip-row">
            <span class="tooltip-label">Manzana:</span>
            <span class="tooltip-value">${lot.manzana}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Lote:</span>
            <span class="tooltip-value">${lot.numero}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Área:</span>
            <span class="tooltip-value">${lot.area} m²</span>
        </div>
        ${priceHtml}
        ${!isPublicSpace && lot.EstadoLote && lot.EstadoLote.nombre_estado === 'DISPONIBLE' ? `
        <div style="margin-top: 10px; text-align: center;">
             <button class="btn-primary btn-small" onclick="event.stopPropagation(); window.openQuoteModalFromMap(${lot.id_lote})" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border-radius: 8px;">
                <i class="fas fa-calculator"></i> Cotizar
            </button>
        </div>` : ''}
    `;
    
    // Reset styles
    tooltip.style.opacity = '0';
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden'; 
    tooltip.style.transform = 'none'; // No scaling needed as we control map zoom
    
    // Dimensions
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const padding = 15;
    
    let top, left;

    // Mobile Check
    const isMobile = window.innerWidth <= 700;
    
    if (isMobile) {
        // Mobile Logic: Prefer positioning above, but check bounds
        left = x - (width / 2);
        top = y - height - 25; // Good gap

        // Horizontal Clamp
        if (left < padding) left = padding;
        if (left + width > window.innerWidth - padding) left = window.innerWidth - width - padding;

        // Vertical Check
        if (top < padding) {
             // Not enough space above, go below
             top = y + 25;
             
             // Check bottom
             if (top + height > window.innerHeight - padding) {
                 // Tight fit? Push up from bottom
                 top = window.innerHeight - height - padding;
             }
        }
    } else {
        // Desktop Logic
        top = y - height - 15;
        left = x - (width / 2);

        // Vertical Bounce
        if (top < padding) top = y + 20;
        if (top + height > window.innerHeight - padding) {
             if (y > window.innerHeight / 2) top = y - height - 15;
             else top = window.innerHeight - height - padding;
             if (top < padding) top = padding;
        }

        // Horizontal Bounce
        if (left < padding) left = padding;
        if (left + width > window.innerWidth - padding) left = window.innerWidth - width - padding;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    tooltip.style.zIndex = '10001';
    tooltip.style.visibility = 'visible';
    tooltip.style.opacity = '1';

    // Event Listeners
    tooltip.onmouseenter = () => {
        if (mapTooltipHideTimeout) {
            clearTimeout(mapTooltipHideTimeout);
            mapTooltipHideTimeout = null;
        }
    };

    tooltip.onmouseleave = () => {
        hideTooltip();
    };
}

let mapTooltipHideTimeout = null;

function hideTooltip() {
    if (mapTooltip) {
        // Delay hiding to allow moving mouse to tooltip
        mapTooltipHideTimeout = setTimeout(() => {
            mapTooltip.style.opacity = '0';
            mapTooltip.style.visibility = 'hidden';
            // mapTooltip.style.display = 'none'; // Keep display block for transition, or use visibility
        }, 300); // 300ms delay
    }
}

// Wrapper for usage
window.openQuoteModalFromMap = (id) => {
    // Hide Tooltip
    hideTooltip();
    
    // Reset Zoom
    if (typeof window.resetMapZoom === 'function') {
        window.resetMapZoom();
    }

    // Close Fullscreen if active
    if (mapContainer && mapContainer.classList.contains('fullscreen')) {
        const fsBtn = document.querySelector('.btn-map-fullscreen');
        if (fsBtn) {
            fsBtn.click(); // Trigger exit logic
        } else {
            mapContainer.classList.remove('fullscreen');
            const exitBtn = document.getElementById('fs-exit-btn');
            if (exitBtn) exitBtn.remove();
        }
    }

    if (typeof openQuoteModal === 'function') {
        openQuoteModal(id);
    } else if (typeof openQuoteModalShared === 'function') {
        openQuoteModalShared(id, 'edit'); 
    } else {
        alert('Error: Función de cotización no encontrada.');
    }
};

function renderMap(project, lots) {
    mapContainer.innerHTML = '';

    // Map Image
    console.log('Rendering Map for Project:', project.nombre);
    console.log('Imagen Plano:', project.imagen_plano);
    console.log('Imagen Mapa (Cover):', project.imagen_mapa);

    // Create Inner Container
    const mapContent = document.createElement('div');
    mapContent.className = 'map-content';
    // mapContent.style.position = 'relative'; // Panzoom handles transform
    // mapContent.style.display = 'inline-block'; 
    // mapContent.style.transformOrigin = '0 0';

    const uniqueMapId = `map-img-${Date.now()}`;
    const img = document.createElement('img');
    img.src = project.imagen_plano || project.imagen_mapa || 'https://via.placeholder.com/800x600?text=Mapa+del+Proyecto';
    img.className = 'map-img';
    img.id = uniqueMapId;
    mapContent.appendChild(img);
    mapContainer.appendChild(mapContent);

    // Initialize Map Zoom
    if (typeof setupMapZoom === 'function') {
        setupMapZoom(mapContainer, mapContent);
    }

    // Dots logic follows immediately
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user && user.role === 'Administrador';
    let isMapEditMode = false;

    // Clear controls
    const mapControls = document.getElementById('map-controls');
    if (mapControls) mapControls.innerHTML = '';

    // Full Screen Button (Global for all users)
    const fsBtn = document.createElement('button');
    fsBtn.className = 'btn-secondary btn-small btn-map-fullscreen';
    fsBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla Completa';
    fsBtn.style.marginRight = '10px';

    fsBtn.onclick = () => {
        mapContainer.classList.toggle('fullscreen');
        const isFs = mapContainer.classList.contains('fullscreen');
        fsBtn.innerHTML = isFs ? '<i class="fas fa-compress"></i> Salir' : '<i class="fas fa-expand"></i> Pantalla Completa';

        // Add Escape key listener when in fullscreen
        if (isFs) {
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    mapContainer.classList.remove('fullscreen');
                    fsBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla Completa';
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }

        // Handle Floating Exit Button for mobile usability
        let exitBtn = document.getElementById('fs-exit-btn');
        if (isFs) {
            if (!exitBtn) {
                exitBtn = document.createElement('button');
                exitBtn.id = 'fs-exit-btn';
                exitBtn.className = 'btn-secondary';
                exitBtn.style.position = 'fixed';
                exitBtn.style.top = '20px';
                exitBtn.style.right = '20px';
                exitBtn.style.zIndex = '100015';
                exitBtn.innerHTML = '<i class="fas fa-compress"></i> Salir';
                exitBtn.onclick = () => fsBtn.click();
                mapContainer.appendChild(exitBtn);
            }
        } else {
            if (exitBtn) exitBtn.remove();
        }
    };
    if (mapControls) mapControls.appendChild(fsBtn);


    if (isAdmin) {
        const btn = document.createElement('button');
        btn.id = 'btn-toggle-edit-map';
        btn.className = 'btn-secondary';
        // btn.style.position = 'absolute'; // Removed
        // btn.style.top = '10px';
        // btn.style.right = '10px';
        // btn.style.zIndex = '100'; 
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Modificar Puntos';

        btn.onclick = () => {
            isMapEditMode = !isMapEditMode;
            if (isMapEditMode) {
                hideTooltip();
                btn.innerHTML = '<i class="fas fa-check"></i> Terminar Edición';
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
                mapContainer.classList.add('editing');
            } else {
                btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Modificar Puntos';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                mapContainer.classList.remove('editing');

            }
        };
        if (mapControls) mapControls.appendChild(btn);
    }

    lots.forEach(l => {
        if (l.coordenada_x && l.coordenada_y) {
            const dot = document.createElement('div');
            let statusClass = '';
            if (l.EstadoLote.nombre_estado === 'VENDIDO') statusClass = 'sold';
            else if (l.EstadoLote.nombre_estado === 'RESERVADO') statusClass = 'reserved';
            else if (l.EstadoLote.nombre_estado === 'ESPACIO PUBLICO') statusClass = 'public-space';

            dot.className = `lot-dot ${statusClass}`;
            dot.style.left = `${l.coordenada_x}%`;
            dot.style.top = `${l.coordenada_y}%`;
            // dot.title = `Mz ${l.manzana} Lote ${l.numero}`; // Replaced by custom tooltip
            dot.id = `lot-dot-${l.id_lote}`;

            // Tooltip Events
            dot.addEventListener('mouseenter', () => {
                if (isMapEditMode) return;
                if (mapTooltipHideTimeout) clearTimeout(mapTooltipHideTimeout);
                // No wait for showing
                const rect = dot.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top; // Position above the dot
                updateTooltip(centerX, centerY, l);
            });

            dot.addEventListener('mouseleave', () => {
                hideTooltip();
            });

            // --- Drag & Drop Logic (Admin Only) ---
            if (isAdmin) {
                dot.style.cursor = 'pointer';
                let isDragging = false;
                let startX, startY;

                const onMouseDown = (e) => {
                    if (!isMapEditMode) return; // Only drag in edit mode

                    // Prevent default to stop browser native drag/selection
                    e.preventDefault();
                    isDragging = false;
                    startX = e.clientX;
                    startY = e.clientY;

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                };

                const onMouseMove = (e) => {
                    if (!isMapEditMode) return;

                    // If moved more than small threshold, it's a drag
                    if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) {
                        isDragging = true;
                    }

                    if (isDragging) {
                        const mapRect = mapContent.getBoundingClientRect(); // Use content rect
                        let x = e.clientX - mapRect.left;
                        let y = e.clientY - mapRect.top;

                        // Percentages
                        let xPercent = (x / mapRect.width) * 100;
                        let yPercent = (y / mapRect.height) * 100;

                        // Clamp
                        xPercent = Math.max(0, Math.min(100, xPercent));
                        yPercent = Math.max(0, Math.min(100, yPercent));

                        dot.style.left = `${xPercent}%`;
                        dot.style.top = `${yPercent}%`;

                        // Store for save
                        dot.dataset.newX = xPercent;
                        dot.dataset.newY = yPercent;
                    }
                };

                const onMouseUp = async (e) => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    if (isDragging && isMapEditMode) { // Check mode again to be safe
                        // Save changes
                        const nx = dot.dataset.newX;
                        const ny = dot.dataset.newY;

                        if (nx && ny) {
                            try {
                                await api.put(`/lots/${l.id_lote}`, { coordenada_x: nx, coordenada_y: ny });
                                console.log('Posición actualizada');
                            } catch (err) {
                                alert('Error guardando posición: ' + err.message);
                                // Revert visual? (Reloading map would happen eventually)
                            }
                        }

                        // Prevent click event
                        dot.setAttribute('data-just-dragged', 'true');
                        setTimeout(() => dot.removeAttribute('data-just-dragged'), 100);
                    }
                };

                dot.addEventListener('mousedown', onMouseDown);
            }

            dot.onclick = () => {
                // If in Edit Mode, do NOT navigate
                if (isMapEditMode) return;

                // If just dragged, ignore click
                if (dot.getAttribute('data-just-dragged') === 'true') return;

                const isFs = mapContainer.classList.contains('fullscreen');

                if (window.innerWidth <= 700 || isFs) {
                    // Mobile or Fullscreen: Show tooltip only
                    const rect = dot.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top;
                    updateTooltip(centerX, centerY, l);
                    return; 
                }

                // Desktop: Scroll table to row
                const row = document.getElementById(`lot-row-${l.id_lote}`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    row.style.backgroundColor = '#ffffcc';
                    setTimeout(() => row.style.backgroundColor = '', 2000);
                }
            };

            mapContent.appendChild(dot);
        }
    });
}

// --- Selection State ---
let selectedLotId = null;

function selectLot(id) {
    // Unselect previous
    if (selectedLotId && selectedLotId !== id) {
        const prevDot = document.getElementById(`lot-dot-${selectedLotId}`);
        if (prevDot) prevDot.classList.remove('active');

        const prevRow = document.getElementById(`lot-row-${selectedLotId}`);
        if (prevRow) prevRow.classList.remove('selected-row');
    }

    selectedLotId = id;

    const dot = document.getElementById(`lot-dot-${id}`);
    if (dot) dot.classList.add('active');

    const row = document.getElementById(`lot-row-${id}`);
    if (row) row.classList.add('selected-row');
}

function highlightDot(id, active) {
    const dot = document.getElementById(`lot-dot-${id}`);
    if (!dot) return;

    if (active) {
        dot.classList.add('active');
    } else {
        // Only remove if NOT selected
        if (id !== selectedLotId) {
            dot.classList.remove('active');
        }
    }
}

// --- Quote Logic ---
// --- Quote Logic ---
const qProjectSelect = document.getElementById('q-project-select'); // Kept for legacy if needed, but likely unused in new modal
// New elements
const qMzReadOnly = document.getElementById('q-mz-readonly');
const qNumReadOnly = document.getElementById('q-num-readonly');
const qAreaReadOnly = document.getElementById('q-area-readonly');
const quotePaymentTypeInput = document.getElementById('q-payment-type');

// Opens modal from "Projects > Lot > Quote" button
window.openQuoteModal = async (loteId) => {
    closeAllModals();
    quoteForm.reset();

    // Default State
    document.getElementById('edit-lot-id').value = '';

    // Find Lot Data
    let lot = null;
    let project = currentProject;

    if (project && currentLots.length > 0) {
        lot = currentLots.find(l => l.id_lote === loteId);
    }

    // If not found (e.g. direct link?), try to fetch or use globals
    if (!lot && window.tempModalLots) {
        lot = window.tempModalLots.find(l => l.id_lote === loteId);
    }

    if (lot) {
        // Populate Read-Only
        if (qMzReadOnly) qMzReadOnly.value = lot.manzana;
        if (qNumReadOnly) qNumReadOnly.value = lot.numero;
        if (qAreaReadOnly) qAreaReadOnly.value = lot.area;

        document.getElementById('quote-lote-id').value = loteId;

        // Cache Prices for Switching
        document.getElementById('q-cache-contado').value = lot.precio_contado || 0;
        document.getElementById('q-cache-financiado').value = lot.precio_financiado || 0;
        document.getElementById('q-cache-oferta').value = lot.precio_oferta || 0;

        // Default to Financiado price first, will be updated by selectPaymentType
        document.getElementById('q-price').value = lot.precio_financiado;

        // Default Payment Type: Financiado
        selectPaymentType('financiado');

        // Defaults
        document.getElementById('q-months').value = 36; // Example default
        document.getElementById('q-initial').value = 3000;
        document.getElementById('q-discount').value = 0;

        calculateQuote();

        quoteModal.classList.remove('hidden');
    } else {
        alert("Error: No se pudo cargar la información del lote.");
    }
};

// Payment Type Selection Logic
window.selectPaymentType = (type) => {
    // 1. Visual State
    document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${type}`).classList.add('active');

    // 2. Logic state
    document.getElementById('q-payment-type').value = type;

    const containerInitial = document.getElementById('container-initial');
    const containerCuotas = document.getElementById('container-cuotas');
    const rowMonthly = document.getElementById('row-monthly');
    const inputInitial = document.getElementById('q-initial');
    const inputMonths = document.getElementById('q-months');
    const btnCotizar = document.getElementById('btn-cotizar');
    const inputPrice = document.getElementById('q-price');

    // Price Rules - Read from CACHE hidden inputs
    let newPrice = 0;

    if (type === 'contado') {
        newPrice = parseFloat(document.getElementById('q-cache-contado').value) || 0;
    } else if (type === 'oferta') {
        newPrice = parseFloat(document.getElementById('q-cache-oferta').value) || 0;
    } else {
        // Financiado Normal
        newPrice = parseFloat(document.getElementById('q-cache-financiado').value) || 0;
    }

    inputPrice.value = newPrice.toFixed(2);

    if (type === 'contado') {
        // Visualize 0 for Initial and Cuotas, but Disable them
        if (containerInitial) containerInitial.style.visibility = 'visible';
        if (containerCuotas) containerCuotas.style.display = 'block';
        if (rowMonthly) rowMonthly.style.visibility = 'visible';

        // Reset and Disable
        inputInitial.disabled = true;
        inputInitial.value = 0;

        inputMonths.disabled = true;
        inputMonths.value = 1;

        // Force update of Text
        document.getElementById('q-monthly').textContent = "S/ 0.00";

    } else {
        // FINANCIADO / OFERTA
        if (containerInitial) containerInitial.style.visibility = 'visible';
        if (containerCuotas) containerCuotas.style.display = 'block';
        if (rowMonthly) rowMonthly.style.visibility = 'visible';

        // Enable
        inputInitial.disabled = false;
        inputMonths.disabled = false;

        // Default Initial Rule
        if (parseFloat(inputInitial.value) <= 0) {
            inputInitial.value = 3000;
        }

        // Default Months if 1
        if (parseInt(inputMonths.value) <= 1) {
            inputMonths.value = 36;
        }
    }

    // Enable button
    btnCotizar.disabled = false;

    calculateQuote();
};

// Opens modal from "Quotes > New Quote" button (General) - Modified to warn or redirect
window.openNewQuoteGeneral = () => {
    // This flow is harder with the new requirements (Auto-load Project/Lot read-only).
    // Usage: "When the form opens from a selected lot".
    // If opening from general button, we'd need to select project/lot first.
    // For now, let's just alert strictly or try to reuse the old logic if needed, 
    // BUT the HTML changed significantly (removed selects).
    // So we should redirect user to "Please select a lot from Projects view".
    alert("Por favor, seleccione un lote desde la vista de Proyectos para realizar una cotización.");
    // closeAllModals();
}


function populateProjectSelect() {
    qProjectSelect.innerHTML = '<option value="">Seleccione Proyecto</option>';
    if (allProjects.length === 0 && window.loadProjects) {
        // If empty, try to load? But loadProjects is async. 
        // We assume loadProjects was called on init or user visited projects.
        // If not, we should probably fetch.
        api.get('/projects').then(projs => {
            allProjects = projs;
            projs.forEach(p => {
                if (p.estado === 'ACTIVO') {
                    const opt = document.createElement('option');
                    opt.value = p.id_proyecto;
                    opt.textContent = p.nombre;
                    qProjectSelect.appendChild(opt);
                }
            });
        });
    } else {
        allProjects.forEach(p => {
            if (p.estado === 'ACTIVO') {
                const opt = document.createElement('option');
                opt.value = p.id_proyecto;
                opt.textContent = p.nombre;
                qProjectSelect.appendChild(opt);
            }
        });
    }
}

// Logic when Project changes
if (qProjectSelect) {
    qProjectSelect.addEventListener('change', async (e) => {
        const projectId = e.target.value;
        qLotSelect.innerHTML = '<option value="">Cargando...</option>';
        qLotSelect.disabled = true;

        if (!projectId) {
            qLotSelect.innerHTML = '<option value="">Seleccione Lote</option>';
            return;
        }

        try {
            const project = await api.get(`/ projects / ${projectId} `);
            const lots = project.Lotes || [];
            const available = lots.filter(l => l.EstadoLote.nombre_estado === 'DISPONIBLE');

            // Store temporarily to look up details later
            // We can attach to the DOM element or use a temporary var.
            // Let's use a module-level temp var for the modal scope.
            window.tempModalLots = lots;

            updateLotSelect(available);
        } catch (error) {
            console.error(error);
            qLotSelect.innerHTML = '<option value="">Error cargando</option>';
        }
    });
}


function updateLotSelect(lots) {
    qLotSelect.innerHTML = '<option value="">Seleccione Lote</option>';
    if (lots.length === 0) {
        qLotSelect.innerHTML = '<option value="">Sin lotes disponibles</option>';
        qLotSelect.disabled = true;
        return;
    }

    lots.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id_lote;
        opt.textContent = `Mz ${l.manzana} - Lote ${l.numero} (${l.area} m2 - S/ ${l.precio_contado})`;
        qLotSelect.appendChild(opt);
    });
    qLotSelect.disabled = false;
}

// Logic when Lot changes
const qLotSelect = document.getElementById('q-lot-select'); // This might be null now as it was removed from HTML
if (qLotSelect) {
    qLotSelect.addEventListener('change', (e) => {
        const loteId = parseInt(e.target.value);
        if (!loteId) return;

        // Find lot details. We might be in Project View (currentLots) or standalone (tempModalLots)
        let lotsSource = window.tempModalLots || currentLots;

        // If we came from OpenQuoteModal, currentLots is set.
        // If we came from NewQuote, tempModalLots is set after fetch.

        // Fallback: if we are in New Quote and just fetched, check temp.
        if (!lotsSource || lotsSource.length === 0) lotsSource = [];

        updateQuoteModalData(loteId, lotsSource);
    });
}

function updateQuoteModalData(loteId, lotsList) {
    const lot = lotsList.find(l => l.id_lote === loteId);
    if (!lot) return;

    document.getElementById('quote-lote-id').value = loteId;

    // Cache Prices
    document.getElementById('q-cache-contado').value = lot.precio_contado || 0;
    document.getElementById('q-cache-financiado').value = lot.precio_financiado || 0;
    document.getElementById('q-cache-oferta').value = lot.precio_oferta || 0;

    document.getElementById('q-price').value = lot.precio_financiado; // Default
    // Trigger update for current payment type logic
    const currentType = document.getElementById('q-payment-type').value || 'financiado';
    selectPaymentType(currentType);
    document.getElementById('q-area').value = lot.area;

    calculateQuote();
}

closeModal.onclick = () => quoteModal.classList.add('hidden');

// Calculate on input change
['q-discount', 'q-initial', 'q-months'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateQuote);
});

function calculateQuote() {
    const price = parseFloat(document.getElementById('q-price').value) || 0;
    const discount = parseFloat(document.getElementById('q-discount').value) || 0;
    const initialInput = document.getElementById('q-initial');
    let initial = parseFloat(initialInput.value) || 0;
    const months = parseInt(document.getElementById('q-months').value) || 1;
    const paymentType = document.getElementById('q-payment-type').value;

    const finalPrice = Math.max(0, price - discount);

    // Contado Logic override
    if (paymentType === 'contado') {
        initial = 0;
        // initialInput.value = 0; // Avoid forcing input while typing if not needed, but here it is hidden.
        document.getElementById('q-amount-financed').value = "0.00";
        document.getElementById('q-final-closing').textContent = "S/ " + finalPrice.toFixed(2);
        document.getElementById('q-monthly').textContent = "S/ 0.00";
        return;
    }

    // Financiado Logic
    // Validate Initial if needed strictly? User says "No puede ser menor a 3000". 
    // We can show visual warning or clamp. Clamping while typing is bad user experience.
    // We will just calculate. The submit button logic or blur can validate.

    const financeAmount = Math.max(0, finalPrice - initial);
    const monthly = months > 0 ? financeAmount / months : 0;

    document.getElementById('q-amount-financed').value = financeAmount.toFixed(2);
    document.getElementById('q-final-closing').textContent = "S/ " + finalPrice.toFixed(2);
    document.getElementById('q-monthly').textContent = "S/ " + monthly.toFixed(2);

    // Validation for Button
    const btnCotizar = document.getElementById('btn-cotizar');
    let isValid = true;

    if (paymentType !== 'contado') {
        if (initial < 3000) isValid = false;
        if (months < 1) isValid = false;
    }

    if (isValid) {
        btnCotizar.disabled = false;
        btnCotizar.style.opacity = '1';
        btnCotizar.style.cursor = 'pointer';
    } else {
        btnCotizar.disabled = true;
        btnCotizar.style.opacity = '0.5';
        btnCotizar.style.cursor = 'not-allowed';
    }
}

quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientName = document.getElementById('q-client-name').value;

    // Logic: Try to find client by name, if not create new.
    // For this MVP, we will try to fetch clients first or just create a new one.
    // Making it robust: Create client endpoint handling "search or create".
    // Since we don't have that endpoint, we will assume "create new/get existing" logic is handled here via sequential calls for MVP.

    let clientId;

    try {
        // 1. Check if client exists (We need a search endpoint really, but let's fetch all - optimized for small list)
        // Or better, just Try to Create, if unique constraint fails (e.g. email?) but we only have name.
        // We will just create a new client for now to ensure flow works, unless user wants strict matching.
        // Requirement: "if name matches... automatically".

        const allClients = await api.get('/clients');
        const existing = allClients.find(c => c.nombre.toLowerCase() === clientName.toLowerCase());

        if (existing) {
            clientId = existing.id_cliente;
            console.log('Using existing client:', existing.nombre);
        } else {
            console.log('Creating new client:', clientName);
            const newClient = await api.post('/clients', {
                nombre: clientName,
                documento: '00000000', // Dummy
                telefono: '000000000',
                email: 'cliente@nuevo.com'
            });
            clientId = newClient.id_cliente;
        }

        const body = {
            id_lote: document.getElementById('quote-lote-id').value,
            id_cliente: clientId,
            precio_base: document.getElementById('q-price').value,
            descuento: document.getElementById('q-discount').value,
            inicial: document.getElementById('q-initial').value,
            plazo_meses: document.getElementById('q-months').value
        };

        const res = await api.post('/quotes', body);

        // Show Success Modal instead of Alert
        window.showSuccessModal('Cotización guardada exitosamente.');

        quoteModal.classList.add('hidden');
        await window.loadQuotes();

        // Optional: Open PDF Manually later?
        // window.open(`${ API_URL } /quotes/${ res.id_cotizaciones }/pdf?token=${localStorage.getItem('token')}`, '_blank');

    } catch (error) {
        alert('Error al procesar: ' + error.message);
    }
});

// --- Success Modal Logic ---
const successModal = document.getElementById('success-modal');
const successMsg = document.getElementById('success-modal-message');
const btnSuccessAccept = document.getElementById('btn-success-accept');

window.showSuccessModal = (message) => {
    if (successMsg) successMsg.textContent = message;
    if (successModal) successModal.classList.remove('hidden');
}

if (btnSuccessAccept) {
    btnSuccessAccept.onclick = () => {
        if (successModal) successModal.classList.add('hidden');
    }
}


// --- Edit Lot Logic ---

const closeEditLot = document.querySelector('.close-edit-lot');
const editLotForm = document.getElementById('edit-lot-form');

window.editLot = (id) => {
    const lot = currentLots.find(l => l.id_lote === id);
    if (!lot) return;

    document.getElementById('edit-lot-id').value = id;
    document.getElementById('edit-lot-id').value = id;
    document.getElementById('edit-lot-mz').value = lot.manzana;
    document.getElementById('edit-lot-num').value = lot.numero;
    document.getElementById('edit-lot-area').value = lot.area;

    document.getElementById('edit-lot-price-contado').value = lot.precio_contado;
    document.getElementById('edit-lot-price-financiado').value = lot.precio_financiado;
    document.getElementById('edit-lot-price-oferta').value = lot.precio_oferta;

    document.getElementById('edit-lot-status').value = lot.id_estado_lote;

    editLotModal.classList.remove('hidden');
};

if (closeEditLot) closeEditLot.onclick = () => editLotModal.classList.add('hidden');

editLotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-lot-id').value;

    // Gather values
    const body = {
        manzana: document.getElementById('edit-lot-mz').value,
        numero: document.getElementById('edit-lot-num').value,
        area: document.getElementById('edit-lot-area').value,
        precio_contado: document.getElementById('edit-lot-price-contado').value,
        precio_financiado: document.getElementById('edit-lot-price-financiado').value,
        precio_oferta: document.getElementById('edit-lot-price-oferta').value,
        precio_financiado: document.getElementById('edit-lot-price-financiado').value,
        precio_oferta: document.getElementById('edit-lot-price-oferta').value,
        id_estado_lote: document.getElementById('edit-lot-status').value,
        ubicacion: document.getElementById('edit-lot-ubicacion') ? document.getElementById('edit-lot-ubicacion').value : 'calle'
    };

    try {
        await api.put(`/lots/${id}`, body);
        window.showSuccessModal('Lote actualizado exitosamente');
        editLotModal.classList.add('hidden');
        // Optimistically update if we are in Detail View
        if (currentProject) {
            await loadProjectDetail(currentProject.id_proyecto);
        } else {
            window.loadProjects();
        }
    } catch (error) {
        alert('Error al actualizar: ' + error.message);
    }
});

// --- Edit Quote Logic ---
const closeEditQuote = document.querySelector('.close-edit-quote');
// const editQuoteForm = document.getElementById('edit-quote-form'); // Moved to top

// Calculate edit quote logic
function calculateEditQuote() {
    const price = parseFloat(document.getElementById('eq-price').value) || 0;
    const discount = parseFloat(document.getElementById('eq-discount').value) || 0;
    const initial = parseFloat(document.getElementById('eq-initial').value) || 0;
    const months = parseInt(document.getElementById('eq-months').value) || 12;

    const finalPrice = Math.max(0, price - discount);
    const financeAmount = Math.max(0, finalPrice - initial);
    const monthly = months > 0 ? financeAmount / months : 0;

    document.getElementById('eq-final-price').textContent = "S/ " + finalPrice.toFixed(2);
    document.getElementById('eq-financed').textContent = "S/ " + financeAmount.toFixed(2);
    document.getElementById('eq-monthly').textContent = "S/ " + monthly.toFixed(2);
}

['eq-price', 'eq-discount', 'eq-initial', 'eq-months'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateEditQuote);
});


window.editQuote = async (id) => {
    // We need to fetch the single quote details or find it from the list if available.
    // For now, let's assume we have it in the DOM or fetch it.
    // Since 'renderQuotes' doesn't store the full list in a global var accessible easily by ID (render pass),
    // let's just fetch it again to be safe and clean.

    // Optimisation: We could store `currentQuotes` global like `currentProjects`.
    // Let's do a quick fetch since we have valid token.
    try {
        // We don't have getQuoteById exposed in frontend API easily? 
        // actually `api.get` works. 
        // We don't have a specific `GET /quotes/:id` route in our router though!
        // Wait, check quote.routes.js ... only GET / (all) and GET /:id/pdf.
        // We need GET /:id to fetch details comfortably OR filter from the list if we store it.
        // I will add `currentQuotes` to store fetched quotes in `loadQuotes`.

        const quote = currentQuotes.find(q => q.id_cotizaciones === id);
        if (!quote) return;

        document.getElementById('edit-quote-id').value = id;
        document.getElementById('eq-price').value = quote.precio_base;
        document.getElementById('eq-discount').value = quote.descuento;
        document.getElementById('eq-initial').value = quote.inicial;
        document.getElementById('eq-months').value = quote.plazo_meses;

        calculateEditQuote();
        editQuoteModal.classList.remove('hidden');

    } catch (e) {
        console.error(e);
        alert('Error abriendo edición');
    }
};

if (closeEditQuote) closeEditQuote.onclick = () => editQuoteModal.classList.add('hidden');

// const detailModal = document.getElementById('detail-modal'); // Moved to top
const detailTitle = document.getElementById('detail-title');
const detailContent = document.getElementById('detail-content');
const closeDetail = document.querySelector('.close-detail');

if (closeDetail) closeDetail.onclick = () => detailModal.classList.add('hidden');

// --- Sales ---
const salesListBody = document.getElementById('sales-list-body');
let currentSales = [];

window.loadSales = async () => {
    // Check Admin Access
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'Administrador') {
        const salesListBody = document.getElementById('sales-list-body');
        if (salesListBody) {
            salesListBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center; padding: 20px;">Acceso restringido a Administradores.</td></tr>`;
        }
        return;
    }

    try {
        const sales = await api.get('/sales');
        currentSales = sales;
        renderSales(sales);
    } catch (error) {
        console.error('Error loading sales', error);
        const salesListBody = document.getElementById('sales-list-body');
        if (salesListBody) salesListBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
};

function renderSales(sales) {
    salesListBody.innerHTML = '';
    if (!sales || sales.length === 0) {
        salesListBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay ventas registradas.</td></tr>`;
        return;
    }

    sales.forEach(s => {
        const tr = document.createElement('tr');

        const clientName = s.Cliente ? s.Cliente.nombre : 'Sin Cliente';
        const projectName = s.Lote && s.Lote.Proyecto ? s.Lote.Proyecto.nombre : '-';
        const lotInfo = s.Lote ? `Mz ${s.Lote.manzana} Lote ${s.Lote.numero}` : '-';

        tr.innerHTML = `
            <td>${s.id_venta}</td>
            <td>${clientName}</td>
            <td>${projectName}</td>
            <td>${lotInfo}</td>
            <td>S/ ${s.precio_final}</td>
            <td>${new Date(s.fecha_registro || s.fecha_venta).toLocaleDateString()}</td>
            <td>
                <button class="btn-small" onclick="viewDetail('sale', ${s.id_venta})" title="Ver Detalles">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        salesListBody.appendChild(tr);
    });
}

// Global View Detail Handler
window.viewDetail = (type, id) => {
    closeAllModals(); // Ensure clean slate even for sales

    // For Sales, using the Generic Detail Modal as there is no Edit form.
    if (type === 'sale') {
        detailContent.innerHTML = '';
        detailModal.classList.remove('hidden');

        let data = currentSales.find(s => s.id_venta === id);
        detailTitle.textContent = `Detalle de Venta #${id}`;

        if (data) {
            const clientName = data.Cliente ? data.Cliente.nombre : 'Sin Cliente';
            const projectName = data.Lote && data.Lote.Proyecto ? data.Lote.Proyecto.nombre : '-';

            detailContent.innerHTML = `
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>DNI/RUC:</strong> ${data.Cliente ? data.Cliente.documento : '-'}</p>
                <hr>
                <p><strong>Proyecto:</strong> ${projectName}</p>
                <p><strong>Lote:</strong> Mz ${data.Lote.manzana} Lote ${data.Lote.numero}</p>
                <p><strong>Área:</strong> ${data.Lote.area} m2</p>
                <hr>
                <p><strong>Precio Final:</strong> S/ ${data.precio_final}</p>
                <p><strong>Inicial:</strong> S/ ${data.inicial}</p>
                <p><strong>Saldo a Financiar:</strong> S/ ${(data.precio_final - data.inicial).toFixed(2)}</p>
                <p><strong>Mensualidad:</strong> S/ ${data.mensualidad}</p>
                <p><strong>Plazo:</strong> ${data.plazo_meses} meses</p>
                <p><strong>Fecha Operación:</strong> ${new Date(data.fecha_venta).toLocaleString()}</p>
                <p><strong>Asesor:</strong> ${data.Usuario ? data.Usuario.nombre : '-'}</p>
             `;
        }
    } else if (type === 'quote') {
        // Use Unified Edit/View Modal
        openQuoteModalShared(id, 'view');
    } else if (type === 'lot') {
        // Use Unified Edit/View Modal
        openLotModalShared(id, 'view');
    }
};

// Unified Open functions

window.editQuote = (id) => openQuoteModalShared(id, 'edit');
window.editLot = (id) => openLotModalShared(id, 'edit');

function openLotModalShared(id, mode) {
    closeAllModals();
    const lot = currentLots.find(l => l.id_lote === id);
    if (!lot) return;

    // Populate
    document.getElementById('edit-lot-id').value = id;
    document.getElementById('edit-lot-mz').value = lot.manzana;
    document.getElementById('edit-lot-num').value = lot.numero;
    document.getElementById('edit-lot-area').value = lot.area;
    document.getElementById('edit-lot-price-contado').value = lot.precio_contado;
    document.getElementById('edit-lot-price-financiado').value = lot.precio_financiado;
    document.getElementById('edit-lot-price-oferta').value = lot.precio_oferta;

    // Validar existencia del elemento antes de asignar valor para evitar errores en versiones cacheadas
    const editLotUbicacion = document.getElementById('edit-lot-ubicacion');
    if (editLotUbicacion) editLotUbicacion.value = lot.ubicacion || 'calle';

    document.getElementById('edit-lot-status').value = lot.id_estado_lote;

    // Toggle Mode
    const saveBtn = document.getElementById('btn-save-lot');
    const title = editLotModal.querySelector('h2');
    const inputs = editLotModal.querySelectorAll('input, select');

    if (mode === 'view') {
        if (title) title.textContent = "Detalle de Lote";
        if (saveBtn) saveBtn.classList.add('hidden');
        inputs.forEach(i => i.disabled = true);
    } else {
        if (title) title.textContent = "Editar Lote";
        if (saveBtn) saveBtn.classList.remove('hidden');
        inputs.forEach(i => i.disabled = false);
    }

    editLotModal.classList.remove('hidden');
}

function openQuoteModalShared(id, mode) {
    closeAllModals();
    const quote = currentQuotes.find(q => q.id_cotizaciones === id);
    if (!quote) return;

    // Populate
    document.getElementById('edit-quote-id').value = id;

    // Context Fields
    const clientName = quote.Cliente ? quote.Cliente.nombre : 'Sin Cliente';
    const projectName = quote.Lote && quote.Lote.Proyecto ? quote.Lote.Proyecto.nombre : '-';
    // Fix: Use correct date field and avoid Date.now() fallback if missing
    const dateStr = (quote.fecha_creacion || quote.createdAt) ? new Date(quote.fecha_creacion || quote.createdAt).toLocaleString() : '-';
    const paymentType = quote.plazo_meses <= 1 ? 'Contado' : 'Financiado';

    document.getElementById('eq-client').value = clientName;
    document.getElementById('eq-project').value = projectName;
    document.getElementById('eq-date').value = dateStr;
    document.getElementById('eq-payment-type').value = paymentType;

    document.getElementById('eq-price').value = quote.precio_base;
    document.getElementById('eq-discount').value = quote.descuento;
    document.getElementById('eq-initial').value = quote.inicial;
    document.getElementById('eq-months').value = quote.plazo_meses;

    // Calculate preview
    calculateEditQuote();

    // Toggle Mode
    const saveBtn = document.getElementById('btn-save-quote');
    const title = editQuoteModal.querySelector('h2');
    const inputs = editQuoteModal.querySelectorAll('input, select');
    // We strictly select inputs inside the form that are relevant

    if (mode === 'view') {
        if (title) title.textContent = "Detalle de Cotización";
        if (saveBtn) saveBtn.classList.add('hidden');
        inputs.forEach(i => i.disabled = true);
    } else {
        if (title) title.textContent = "Editar Cotización";
        if (saveBtn) saveBtn.classList.remove('hidden');
        inputs.forEach(i => i.disabled = false);
    }

    editQuoteModal.classList.remove('hidden');
}

editQuoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-quote-id').value;
    const body = {
        precio_base: document.getElementById('eq-price').value,
        descuento: document.getElementById('eq-discount').value,
        inicial: document.getElementById('eq-initial').value,
        plazo_meses: document.getElementById('eq-months').value
    };

    try {
        await api.put(`/quotes/${id}`, body);
        window.showSuccessModal('Cotización actualizada');
        editQuoteModal.classList.add('hidden');
        await window.loadQuotes();
    } catch (error) {
        alert('Error al actualizar: ' + error.message);
    }
});
// --- Clients ---
// --- Clients ---
const clientsListBody = document.getElementById('clients-list-body');
let currentClients = [];

window.loadClients = async () => {
    try {
        console.log('Loading Clients...');
        const clients = await api.get('/clients');
        currentClients = clients;
        renderClients(clients);
    } catch (error) {
        console.error('Error loading clients', error);
        clientsListBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
};

function renderClients(clients) {
    clientsListBody.innerHTML = '';
    if (!clients || clients.length === 0) {
        clientsListBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay clientes registrados.</td></tr>`;
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdvisor = user && user.role === 'Asesor';
    const isAdmin = user && user.role === 'Administrador';

    // Manage Header Visibility
    const checkAllHeader = document.getElementById('check-all-clients')?.closest('th');
    if (checkAllHeader) {
        checkAllHeader.style.display = isAdmin ? '' : 'none';
    }

    clients.forEach(c => {
        const tr = document.createElement('tr');
        const advisorName = c.Usuario ? c.Usuario.nombre : 'Sin Asignar';

        // Admin Buttons
        const editBtn = isAdmin || isAdvisor ? `<button class="btn-small btn-edit" onclick="editClient(${c.id_cliente})" title="Editar"><i class="fas fa-edit"></i></button>` : '';
        const deleteBtn = isAdmin ? `<button class="btn-small btn-delete" onclick="deleteClient(${c.id_cliente})" title="Eliminar"><i class="fas fa-trash"></i></button>` : '';

        // Call Action Button (For Advisors and Admins)
        const callBtn = (isAdvisor || isAdmin) ?
            `<button class="btn-small" style="background-color: #f59e0b; margin-right: 2px;" onclick="openCallActionModal(${c.id_cliente})" title="Registrar Llamada"><i class="fas fa-phone"></i></button>` : '';

        const isChecked = bulkState.clients.has(c.id_cliente) ? 'checked' : '';
        const checkCell = isAdmin ? `<td><input type="checkbox" class="bulk-check" data-id="${c.id_cliente}" data-type="clients" onchange="toggleBulk('clients', ${c.id_cliente}, this.checked)" ${isChecked}></td>` : '';

        // Status Logic
        // PENDIENTE (Gray - Default)
        // CONTACTADO (Green)
        // NO_CONTESTO (Red)
        // REAGENDADO (Yellow)

        let statusBadge = '<span class="badge badge-pending">Pendiente</span>';
        let statusText = 'Sin Gestión';

        if (c.estado_contacto === 'CONTACTADO') {
            statusBadge = '<span class="badge badge-contacted">Contactado</span>';
            statusText = 'Contactado';
        } else if (c.estado_contacto === 'NO_CONTESTO') {
            statusBadge = '<span class="badge badge-no-answer">No Contestó</span>';
            statusText = 'Intento fallido';
        } else if (c.estado_contacto === 'REAGENDADO') {
            statusBadge = '<span class="badge badge-rescheduled">Reagendado</span>';

            // Format Date
            if (c.fecha_reagendado) {
                const dateObj = new Date(c.fecha_reagendado);
                const dateStr = dateObj.toLocaleDateString('es-PE');
                const timeStr = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
                statusText = `Reagendado | ${dateStr} | ${timeStr}`;
            } else {
                statusText = 'Reagendado';
            }
        }

        // Apply background tint to row?
        // tr.classList.add(rowClass); // Optional, badges might be enough.
        // User asked for: "En la fila del cliente debe aparecer el texto..."
        // We will show the text in the Status Column

        tr.innerHTML = `
            ${checkCell}
            <td>${c.id_cliente}</td>
            <td>${c.nombre}</td>
            <td>${c.apellidos || '-'}</td>
            <td>${c.documento || '-'}</td>
            <td>${c.telefono || '-'}</td>
            <td>${c.email || '-'}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.comentarios || ''}">${c.comentarios || '-'}</td>
            <td>${advisorName}</td>
            <td>
                ${statusBadge}
                <div style="font-size: 0.75rem; margin-top: 4px; color: #555; white-space: nowrap;">
                   ${c.estado_contacto === 'REAGENDADO' ? statusText : ''}
                </div>
            </td>
            <td>
                ${callBtn}
                <button class="btn-small" onclick="viewClientDetail(${c.id_cliente})" title="Ver Detalles">
                     <i class="fas fa-eye"></i>
                </button>
                ${editBtn}
                ${deleteBtn}
            </td>
        `;
        clientsListBody.appendChild(tr);
    });
}


window.deleteClient = (id) => {
    window.showConfirmModal('¿Estás seguro de que deseas eliminar este cliente?', async () => {
        try {
            await api.delete(`/clients/${id}`);
            window.showSuccessModal('Cliente eliminado correctamente');
            window.loadClients();
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    });
};

// Export Excel (CSV)
window.exportClientsToExcel = async () => {
    try {
        const clients = await api.get('/clients');

        if (!clients || clients.length === 0) {
            return alert('No hay datos para exportar');
        }

        let csv = 'ID,Nombre,Apellidos,Documento,Telefono,Email,Comentarios,Asesor Asignado\n';

        clients.forEach(c => {
            const advisor = c.Usuario ? c.Usuario.nombre : 'Sin Asignar';
            const name = `"${(c.nombre || '').replace(/"/g, '""')}"`;
            const apellidos = `"${(c.apellidos || '').replace(/"/g, '""')}"`;
            const doc = `"${(c.documento || '').replace(/"/g, '""')}"`;
            const phone = `"${(c.telefono || '').replace(/"/g, '""')}"`;
            const email = `"${(c.email || '').replace(/"/g, '""')}"`;
            const comentarios = `"${(c.comentarios || '').replace(/"/g, '""')}"`;
            const adv = `"${(advisor || '').replace(/"/g, '""')}"`;

            csv += `${c.id_cliente},${name},${apellidos},${doc},${phone},${email},${comentarios},${adv}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'clientes_altamira.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Export error', error);
        alert('Error exportando clientes');
    }
};

// Edit Client Logic
// const editClientModal = document.getElementById('edit-client-modal'); // Moved to top
const closeEditClient = document.querySelector('.close-edit-client');
const editClientForm = document.getElementById('edit-client-form');

window.editClient = (id) => openClientModalShared(id, 'edit');
window.viewClientDetail = (id) => openClientModalShared(id, 'view');

function openClientModalShared(id, mode) {
    closeAllModals();

    // Reset Form
    document.getElementById('edit-client-form').reset();
    document.getElementById('edit-client-id').value = '';

    const saveBtn = document.getElementById('btn-save-client');
    const title = editClientModal.querySelector('h2');
    const inputs = editClientModal.querySelectorAll('input');

    if (mode === 'create') {
        title.textContent = "Nuevo Cliente";
        saveBtn.classList.remove('hidden');
        inputs.forEach(i => i.disabled = false);
        editClientModal.classList.remove('hidden');
        return;
    }

    const client = currentClients.find(c => c.id_cliente === id);
    if (!client) return;

    // Populate
    document.getElementById('edit-client-id').value = id;
    document.getElementById('edit-client-name').value = client.nombre;
    document.getElementById('edit-client-lastname').value = client.apellidos || '';
    document.getElementById('edit-client-doc').value = client.documento;
    document.getElementById('edit-client-phone').value = client.telefono;
    document.getElementById('edit-client-email').value = client.email;

    if (mode === 'view') {
        title.textContent = "Detalle de Cliente";
        saveBtn.classList.add('hidden');
        inputs.forEach(i => i.disabled = true);
    } else {
        title.textContent = "Editar Cliente";
        saveBtn.classList.remove('hidden');
        inputs.forEach(i => i.disabled = false);
    }

    editClientModal.classList.remove('hidden');
}

if (closeEditClient) closeEditClient.onclick = () => editClientModal.classList.add('hidden');

editClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-client-id').value;
    const body = {
        nombre: document.getElementById('edit-client-name').value,
        apellidos: document.getElementById('edit-client-lastname').value,
        documento: document.getElementById('edit-client-doc').value,
        telefono: document.getElementById('edit-client-phone').value,
        email: document.getElementById('edit-client-email').value
    };

    try {
        if (id) {
            await api.put(`/clients/${id}`, body);
            window.showSuccessModal('Cliente actualizado');
        } else {
            await api.post('/clients', body);
            window.showSuccessModal('Cliente creado exitosamente');
        }

        editClientModal.classList.add('hidden');
        window.loadClients();
    } catch (error) {
        alert('Error al guardar: ' + error.message);
    }
});

// --- Users Management ---
// const usersListBody = document.getElementById('users-list-body'); // Moved to top
// const userModal = document.getElementById('user-modal'); // Moved to top
// const userForm = document.getElementById('user-form'); // Moved to top
// const navUsers = document.getElementById('nav-users'); // Moved to top

// Check Admin for Sidebar
const currentUser = JSON.parse(localStorage.getItem('user'));
if (currentUser && currentUser.role === 'Administrador') {
    if (navUsers) navUsers.classList.remove('hidden');
}

let currentUsers = [];

window.loadUsers = async () => {
    try {
        const users = await api.get('/users');
        currentUsers = users;
        renderUsers(users);
    } catch (error) {
        console.error('Error loading users', error);
    }
};

function renderUsers(users) {
    usersListBody.innerHTML = '';
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const isSuperAdmin = currentUser && currentUser.name === 'Admin Famia';

    users.forEach(u => {
        const tr = document.createElement('tr');
        const roleName = u.Rol ? u.Rol.nombre : 'Sin Rol';
        const isTargetAdmin = roleName === 'Administrador';
        const isTargetSuperAdmin = u.nombre === 'Admin Famia';

        // Logic:
        // 1. If Target is Admin Famia -> Hide Delete Button always.
        // 2. If Target is Admin -> Show Delete ONLY if Current is Admin Famia.
        // 3. If Target is Not Admin -> Show Delete (since we are Admin seeing this view).

        let showDelete = true;
        if (isTargetSuperAdmin) showDelete = false;
        else if (isTargetAdmin && !isSuperAdmin) showDelete = false;

        // Note: Render logic for Edit/Delete buttons
        const deleteBtn = showDelete
            ? `<button class="btn-small btn-delete" onclick="deleteUser(${u.id_usuario})" title="Eliminar"><i class="fas fa-trash"></i></button>`
            : '';

        tr.innerHTML = `
            <td>${u.id_usuario}</td>
            <td>${u.nombre}</td>
            <td>${u.email}</td>
            <td>${u.telefono || '-'}</td>
            <td><span class="badge ${roleName === 'Administrador' ? 'badge-sold' : 'badge-available'}">${roleName}</span></td>
            <td>
                <button class="btn-small btn-edit" onclick="editUser(${u.id_usuario})" title="Editar"><i class="fas fa-edit"></i></button>
                ${deleteBtn}
            </td>
        `;
        usersListBody.appendChild(tr);
    });
}

window.openUserModal = () => {
    closeAllModals();
    userForm.reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-phone').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-password-confirm').value = '';
    document.getElementById('user-modal-title').textContent = 'Nuevo Usuario';
    userModal.classList.remove('hidden');
}

window.editUser = (id) => {
    closeAllModals();
    const user = currentUsers.find(u => u.id_usuario === id);
    if (!user) return;

    document.getElementById('user-id').value = id;
    document.getElementById('user-name-input').value = user.nombre;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-phone').value = user.telefono || '';
    document.getElementById('user-role').value = user.id_rol;

    // Clear password fields
    document.getElementById('user-password').value = '';
    document.getElementById('user-password-confirm').value = '';

    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
    userModal.classList.remove('hidden');
}

window.deleteUser = (id) => {
    window.showConfirmModal('¿Estás seguro de que deseas eliminar este usuario?', async () => {
        try {
            await api.delete(`/users/${id}`);
            window.showSuccessModal('Usuario eliminado correctamente');
            window.loadUsers();
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    });
};

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const body = {
        nombre: document.getElementById('user-name-input').value,
        email: document.getElementById('user-email').value,
        telefono: document.getElementById('user-phone').value,
        password: document.getElementById('user-password').value,
        id_rol: document.getElementById('user-role').value
    };

    const confirmPassword = document.getElementById('user-password-confirm').value;

    if (body.password && body.password !== confirmPassword) {
        return alert('Las contraseñas no coinciden');
    }

    try {
        if (id) {
            await api.put(`/users/${id}`, body);
            window.showSuccessModal('Usuario actualizado');
        } else {
            await api.post('/users', body);
            window.showSuccessModal('Usuario creado');
        }
        userModal.classList.add('hidden');
        loadUsers();
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

const closeUserModalBtn = document.querySelector('.close-user-modal');
if (closeUserModalBtn) closeUserModalBtn.onclick = () => userModal.classList.add('hidden');

function closeAllModals() {
    [quoteModal, editLotModal, editQuoteModal, detailModal, editClientModal, userModal, confirmModal].forEach(m => {
        if (m) m.classList.add('hidden');
    });
}

// --- Confirmation Modal Logic ---
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-modal-title');
const confirmMsg = document.getElementById('confirm-modal-message');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');

let onConfirmAction = null;

window.showConfirmModal = (message, action, title = '¿Estás seguro?', btnText = 'Eliminar') => {
    if (confirmMsg) confirmMsg.textContent = message;
    if (confirmTitle) confirmTitle.textContent = title;
    if (btnConfirmYes) {
        btnConfirmYes.textContent = btnText;
    }
    onConfirmAction = action;
    if (confirmModal) confirmModal.classList.remove('hidden');
};

if (btnConfirmYes) {
    btnConfirmYes.onclick = () => {
        if (onConfirmAction) onConfirmAction();
        if (confirmModal) confirmModal.classList.add('hidden');
    };
}

if (btnConfirmCancel) {
    btnConfirmCancel.onclick = () => {
        onConfirmAction = null;
        if (confirmModal) confirmModal.classList.add('hidden');
    };
}

// --- Bulk Actions Logic ---

const bulkBar = document.getElementById('bulk-actions-bar');
const bulkCountSpan = document.getElementById('bulk-selected-count');
const btnBulkDelete = document.getElementById('btn-bulk-delete');
const btnBulkEdit = document.getElementById('btn-bulk-edit');
const checkAllLots = document.getElementById('check-all-lots');
const checkAllQuotes = document.getElementById('check-all-quotes');

// Check All Listeners
if (checkAllLots) {
    checkAllLots.addEventListener('change', (e) => toggleAllBulk('lots', e.target.checked));
}
if (checkAllQuotes) {
    checkAllQuotes.addEventListener('change', (e) => toggleAllBulk('quotes', e.target.checked));
}
const checkAllClients = document.getElementById('check-all-clients');
if (checkAllClients) {
    checkAllClients.addEventListener('change', (e) => toggleAllBulk('clients', e.target.checked));
}

// Bulk Buttons Listeners
if (btnBulkDelete) {
    btnBulkDelete.addEventListener('click', () => {
        // Determine active view to assume active type
        // Simple heuristic: if lots set is not empty, prioritize lots, else quotes.
        // Or better: pass the type based on visible view. Use `projectsList` vs `view-quotes` visibility.
        const quotesView = document.getElementById('view-quotes');
        const listQuotesHidden = quotesView.classList.contains('hidden');

        // If quotes view is visible, type is quotes. Otherwise lots (if detail view open).
        let type = 'lots';
        if (!quotesView.classList.contains('hidden')) type = 'quotes';
        if (!document.getElementById('view-clients').classList.contains('hidden')) type = 'clients';

        bulkDelete(type);
    });
}

if (btnBulkEdit) {
    btnBulkEdit.addEventListener('click', () => {
        const quotesView = document.getElementById('view-quotes');
        const listQuotesHidden = quotesView.classList.contains('hidden');
        const type = !listQuotesHidden ? 'quotes' : 'lots';
        openBulkEditModal(type);
    });
}


window.toggleBulk = (type, id, checked) => {
    if (checked) {
        bulkState[type].add(id);
    } else {
        bulkState[type].delete(id);
    }
    updateBulkUI(type);
};

window.toggleAllBulk = (type, checked) => {
    // Respect filtered/visible items by querying the DOM
    let selector = '';
    if (type === 'lots') selector = '#lots-table-body tr input.bulk-check';
    else if (type === 'quotes') selector = '#quotes-list-body tr input.bulk-check';
    else if (type === 'clients') selector = '#clients-list-body tr input.bulk-check';

    if (!selector) return;

    const checkboxes = document.querySelectorAll(selector);

    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id);
        if (checked) {
            bulkState[type].add(id);
        } else {
            bulkState[type].delete(id);
        }
    });

    updateBulkUI(type);
}

function updateBulkUI(type) {
    const count = bulkState[type].size;

    // Auto-hide other type if we switch context?
    // If we are selecting Lots, we probably shouldn't show Quotes count if we are in Lots view.
    // The bar is global.
    // Simple logic: show count of `type` if > 0.

    // We need to know which view is active to show the correct count.
    const quotesView = document.getElementById('view-quotes');
    const clientsView = document.getElementById('view-clients');

    let displayType = 'lots'; // default or check project view
    if (quotesView && !quotesView.classList.contains('hidden')) displayType = 'quotes';
    if (clientsView && !clientsView.classList.contains('hidden')) displayType = 'clients';

    const displayCount = bulkState[displayType].size;

    if (displayCount > 0) {
        bulkBar.classList.remove('hidden');
        bulkCountSpan.textContent = `${displayCount} registros seleccionados`;

        // Show/Hide relevant controls
        const bulkAssignContainer = document.getElementById('bulk-assign-container');
        if (displayType === 'clients') {
            if (bulkAssignContainer) {
                bulkAssignContainer.classList.remove('hidden');
                // Trigger loading users if select is empty
                const select = document.getElementById('bulk-advisor-select');
                if (select && select.options.length <= 1) {
                    loadAdvisorsForBulk();
                }
            }
            if (btnBulkEdit) btnBulkEdit.style.display = 'none'; // No bulk edit for clients yet
            if (btnBulkDelete) btnBulkDelete.style.display = 'inline-block';
        } else {
            if (bulkAssignContainer) bulkAssignContainer.classList.add('hidden');
            if (btnBulkEdit) btnBulkEdit.style.display = 'inline-block';
            if (btnBulkDelete) btnBulkDelete.style.display = 'inline-block';
        }
    } else {
        bulkBar.classList.add('hidden');
    }
}

// Helper to load advisors
async function loadAdvisorsForBulk() {
    try {
        const users = await api.get('/users');
        const advisors = users.filter(u => u.Rol && u.Rol.nombre === 'Asesor');

        const bulkAdvisorSelect = document.getElementById('bulk-advisor-select');
        if (bulkAdvisorSelect) {
            bulkAdvisorSelect.innerHTML = '<option value="">Seleccionar Asesor...</option>';
            advisors.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id_usuario;
                opt.textContent = a.nombre;
                bulkAdvisorSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading advisors', error);
    }
}

// Assign Button Logic
const btnBulkAssign = document.getElementById('btn-bulk-assign');
if (btnBulkAssign) {
    btnBulkAssign.onclick = async () => {
        const clientIds = Array.from(bulkState.clients);
        const advisorId = document.getElementById('bulk-advisor-select').value;

        if (clientIds.length === 0) return;
        if (!advisorId) return alert('Por favor seleccione un asesor.');

        try {
            await api.post('/clients/assign', { clientIds, advisorId });
            window.showSuccessModal('Clientes asignados correctamente');

            // Return to state
            bulkState.clients.clear();
            updateBulkUI('clients');
            window.loadClients();
        } catch (error) {
            alert('Error asignando: ' + error.message);
        }
    };
}


window.bulkDelete = (type) => {
    const ids = Array.from(bulkState[type]);
    if (ids.length === 0) return;

    window.showConfirmModal(`¿Eliminar ${ids.length} registros seleccionados?`, async () => {
        try {
            // Sequential Delete (Frontend Loop)
            // Show loading state?
            const originalText = btnBulkDelete.innerHTML;
            btnBulkDelete.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            btnBulkDelete.disabled = true;

            const promises = ids.map(id => api.delete(`/${type}/${id}`));
            await Promise.all(promises);

            window.showSuccessModal(`${ids.length} registros eliminados.`);

            // Clear State
            bulkState[type].clear();
            updateBulkUI(type);

            // Reload Data
            if (type === 'lots') {
                if (currentProject) loadProjectDetail(currentProject.id_proyecto);
            } else if (type === 'clients') {
                window.loadClients();
            } else {
                window.loadQuotes();
            }

        } catch (error) {
            alert('Error parcial en eliminación masiva: ' + error.message);
        } finally {
            // Force reset to default state
            btnBulkDelete.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            btnBulkDelete.disabled = false;
        }
    });
};

// --- Bulk Edit Modal Logic ---

const bulkEditModal = document.getElementById('bulk-edit-modal');
const closeBulkEdit = document.querySelector('.close-bulk-edit');
const bulkEditForm = document.getElementById('bulk-edit-form');
const bulkFieldSelect = document.getElementById('bulk-field-select');
const bulkInputWrapper = document.getElementById('bulk-input-wrapper');
let currentBulkType = null;

if (closeBulkEdit) closeBulkEdit.onclick = () => bulkEditModal.classList.add('hidden');

window.openBulkEditModal = (type) => {
    const ids = Array.from(bulkState[type]);
    if (ids.length === 0) return;

    currentBulkType = type;
    document.getElementById('bulk-edit-subtitle').textContent = `Editando ${ids.length} registros (${type === 'lots' ? 'Lotes' : 'Cotizaciones'})`;

    // Populate Fields
    bulkFieldSelect.innerHTML = '<option value="">Seleccione campo...</option>';

    if (type === 'lots') {
        bulkFieldSelect.innerHTML += `
            <option value="precio_contado">Precio Contado</option>
            <option value="precio_financiado">Precio Financiado</option>
            <option value="precio_oferta">Precio Oferta</option>
            <option value="id_estado_lote">Estado</option>
            <option value="ubicacion">Ubicación</option>
        `;
    } else {
        bulkFieldSelect.innerHTML += `
            <option value="precio_base">Precio Base</option>
            <option value="id_usuario">Asesor (ID Usuario)</option> 
        `;
        // Note: Advisor should ideally be a list. For now, simple ID input or we fetch users.
    }

    bulkEditModal.classList.remove('hidden');
};

if (bulkFieldSelect) {
    bulkFieldSelect.addEventListener('change', (e) => {
        const field = e.target.value;
        if (!field) {
            bulkInputWrapper.innerHTML = '<input type="text" class="form-control" disabled placeholder="Seleccione un campo primero">';
            return;
        }

        // Generate Input based on field
        if (['precio_base', 'precio_contado', 'precio_financiado', 'precio_oferta'].includes(field)) {
            bulkInputWrapper.innerHTML = '<input type="number" id="bulk-input-value" step="0.01" class="form-control" required placeholder="Ingrese nuevo precio">';
        } else if (field === 'id_estado_lote') {
            bulkInputWrapper.innerHTML = `
                <select id="bulk-input-value" class="form-control" required>
                    <option value="1">DISPONIBLE</option>
                    <option value="2">RESERVADO</option>
                    <option value="3">VENDIDO</option>
                    <option value="4">ESPACIO PUBLICO</option>
                </select>
            `;
        } else if (field === 'id_usuario') {
            // Ideally fetch users. For MVP: simple number input with tooltip?
            // Let's stick to text for ID.
            bulkInputWrapper.innerHTML = '<input type="number" id="bulk-input-value" class="form-control" required placeholder="ID del Asesor">';
        } else if (field === 'ubicacion') {
            bulkInputWrapper.innerHTML = `
                <select id="bulk-input-value" class="form-control" required>
                    <option value="calle">Calle</option>
                    <option value="esquina">Esquina</option>
                </select>
            `;
        }
    });
}

if (bulkEditForm) {
    bulkEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ids = Array.from(bulkState[currentBulkType]);
        const field = bulkFieldSelect.value;
        const inputEl = document.getElementById('bulk-input-value');
        const value = inputEl.value;

        if (!ids.length || !field || !value) return;

        window.showLoader();

        try {
            const promises = ids.map(id => {
                const body = {};
                body[field] = value;
                return api.put(`/${currentBulkType}/${id}`, body);
            });

            await Promise.all(promises);
            window.hideLoader();
            window.showSuccessModal('Actualización masiva completada');
            bulkEditModal.classList.add('hidden');

            // Clear and Reload
            bulkState[currentBulkType].clear();
            updateBulkUI(currentBulkType);

            if (currentBulkType === 'lots') {
                if (currentProject) loadProjectDetail(currentProject.id_proyecto);
            } else {
                window.loadQuotes();
            }

        } catch (error) {
            window.hideLoader();
            alert('Error en actualización masiva: ' + error.message);
        }
    });
}

// --- Menu Visibility Control ---
document.addEventListener('DOMContentLoaded', () => {
    const userLocal = JSON.parse(localStorage.getItem('user'));
    const navSalesEl = document.getElementById('nav-sales');
    const navUsersEl = document.getElementById('nav-users');

    if (userLocal && userLocal.role === 'Administrador') {
        if (navSalesEl) navSalesEl.classList.remove('hidden');
        if (navUsersEl) navUsersEl.classList.remove('hidden');
    } else {
        if (navSalesEl) navSalesEl.classList.add('hidden');
        if (navUsersEl) navUsersEl.classList.add('hidden');
    }
});

// --- Logic for ESPACIO PUBLICO (ID 4) ---
(function () {
    // Inject Options
    function ensureOptions() {
        ['edit-lot-status', 'new-lot-status'].forEach(id => {
            const sel = document.getElementById(id);
            if (sel && !sel.querySelector('option[value="4"]')) {
                const opt = document.createElement('option');
                opt.value = "4";
                opt.textContent = "ESPACIO PUBLICO";
                sel.appendChild(opt);
            }
        });
    }

    // UI Logic
    function updateStateUI(prefix, isPublic) {
        ['price-contado', 'price-financiado', 'price-oferta'].forEach(f => {
            const el = document.getElementById(`${prefix}-${f}`);
            if (el) {
                if (isPublic) {
                    el.disabled = true;
                    el.value = '';
                } else {
                    el.disabled = false;
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        ensureOptions();

        const editStatus = document.getElementById('edit-lot-status');
        if (editStatus) {
            editStatus.addEventListener('change', (e) => updateStateUI('edit-lot', e.target.value == 4));
        }

        const newStatus = document.getElementById('new-lot-status');
        if (newStatus) {
            newStatus.addEventListener('change', (e) => updateStateUI('new-lot', e.target.value == 4));
        }
    });

    // Hook into openLotModalShared to apply initial state
    if (typeof openLotModalShared === 'function') {
        const _super = openLotModalShared;
        openLotModalShared = function (id, mode) {
            _super(id, mode);
            const statusEl = document.getElementById('edit-lot-status');
            if (statusEl && statusEl.value == 4 && mode !== 'view') {
                updateStateUI('edit-lot', true);
            }
        }
    }
})();


// --- Excel Upload & Export Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const btnExportExcelLots = document.getElementById('btn-export-excel-lots');
    const btnUploadExcel = document.getElementById('btn-upload-excel');
    const inputUploadExcel = document.getElementById('excel-upload-input');

    if (btnExportExcelLots) {
        btnExportExcelLots.addEventListener('click', () => {
            exportLotsToExcel();
        });
    }

    if (btnUploadExcel && inputUploadExcel) {
        btnUploadExcel.addEventListener('click', () => {
            inputUploadExcel.click();
        });

        inputUploadExcel.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!currentProject) {
                alert('No hay proyecto seleccionado.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('id_proyecto', currentProject.id_proyecto);

            // Reset input
            inputUploadExcel.value = '';

            try {
                window.showLoader();
                // Disable button still nice to have but obscured by loader
                const originalText = btnUploadExcel.innerHTML;
                btnUploadExcel.disabled = true;

                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token found');

                const response = await fetch(`${API_URL}/lots/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Error en la carga');
                }

                window.hideLoader();

                let msg = `Proceso completado.\nActualizados: ${result.updated}\nCreados: ${result.created}\nOmitidos: ${result.skipped}`;
                if (result.errorsCount > 0) {
                    msg += `\nErrores: ${result.errorsCount}. Revise la consola para detalles.`;
                    console.warn('Excel Errors:', result.errors);
                }

                if (window.showSuccessModal) {
                    window.showSuccessModal(msg);
                } else {
                    alert(msg);
                }

                if (window.loadProjectDetail && currentProject) {
                    window.loadProjectDetail(currentProject.id_proyecto);
                }

            } catch (error) {
                window.hideLoader();
                alert('Error subiendo Excel: ' + error.message);
                console.error(error);
            } finally {
                btnUploadExcel.disabled = false;
                btnUploadExcel.innerHTML = originalText;
            }
        });
    }

    // --- Resizable Gutter Logic ---
    const gutter = document.getElementById('layout-gutter');
    const container = document.querySelector('.project-layout');
    const leftSide = document.querySelector('.lots-list-container');
    // Map container takes flex:1, so we only adjust leftSide width via flex-basis

    if (gutter && container && leftSide) {
        let isDragging = false;

        const onMouseDown = (e) => {
            isDragging = true;
            gutter.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            // Calculate new width relative to container
            const containerRect = container.getBoundingClientRect();
            // X relative to container left
            const relativeX = e.clientX - containerRect.left;

            // Convert to percentage
            let newPercent = (relativeX / containerRect.width) * 100;

            // Constraints (min 20%, max 65% to keep map visible)
            newPercent = Math.max(20, Math.min(newPercent, 65));

            leftSide.style.flexBasis = `${newPercent}%`;
            leftSide.style.width = `${newPercent}%`; // Fallback/Force
            leftSide.style.maxWidth = 'none'; // Release CSS clamp
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                gutter.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        gutter.addEventListener('mousedown', onMouseDown);

        // Reset sidebar width on window resize to prevent layout breaking on small screens
        window.addEventListener('resize', () => {
            if (window.innerWidth < 1300) {
                leftSide.style.flexBasis = '';
                leftSide.style.width = '';
                leftSide.style.maxWidth = '';
            }
        });
    }
});

async function exportLotsToExcel() {
    if (!currentProject || !currentLots || currentLots.length === 0) {
        return alert('No hay datos para exportar');
    }

    try {
        // Prepare data for SheetJS
        const data = currentLots.map(l => ({
            'Manzana': l.manzana || '',
            'numero': l.numero || '',
            'ubicacion': l.ubicacion || 'calle',
            'area': l.area || 0,
            'precio': l.precio_contado || 0,
            'estado': l.EstadoLote ? l.EstadoLote.nombre_estado : (l.estado || '')
        }));

        // Create a new workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Lotes");

        // Generate Excel file and trigger download
        const fileName = `lotes_${currentProject.nombre.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error('Export error', error);
        alert('Error exportando lotes: ' + error.message);
    }
}


// --- Call Action Logic ---
const callModal = document.getElementById('call-modal');
const closeCallModal = document.querySelector('.close-call-modal');
const callForm = document.getElementById('call-form');
const callResultSelect = document.getElementById('call-result');
const reagendarContainer = document.getElementById('reagendar-container');

if (closeCallModal) closeCallModal.onclick = () => callModal.classList.add('hidden');

window.openCallActionModal = (clientId) => {
    closeAllModals();
    document.getElementById('call-client-id').value = clientId;

    // Reset defaults
    callResultSelect.value = 'CONTACTADO';
    reagendarContainer.classList.add('hidden');
    document.getElementById('call-reagendar-date').value = '';

    // Check current status to pre-fill? Optional.
    const client = currentClients.find(c => c.id_cliente === clientId);
    if (client && client.estado_contacto) {
        callResultSelect.value = client.estado_contacto;
        if (client.estado_contacto === 'REAGENDADO') {
            reagendarContainer.classList.remove('hidden');
            // Pre-fill date only if exists, formatting to datetime-local is tricky (YYYY-MM-DDTHH:MM)
            if (client.fecha_reagendado) {
                // Crude format
                const d = new Date(client.fecha_reagendado);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // local adjustment hack
                document.getElementById('call-reagendar-date').value = d.toISOString().slice(0, 16);
            }
        }
    }

    callModal.classList.remove('hidden');
}

window.toggleReagendarDate = () => {
    if (callResultSelect.value === 'REAGENDADO') {
        reagendarContainer.classList.remove('hidden');
        document.getElementById('call-reagendar-date').required = true;
    } else {
        reagendarContainer.classList.add('hidden');
        document.getElementById('call-reagendar-date').required = false;
        document.getElementById('call-reagendar-date').value = '';
    }
}

if (callForm) {
    callForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('call-client-id').value;
        const result = callResultSelect.value;
        let date = null;

        if (result === 'REAGENDADO') {
            date = document.getElementById('call-reagendar-date').value;
            if (!date) return alert('Seleccione una fecha y hora para reagendar.');
        }

        try {
            const body = {
                estado_contacto: result,
                fecha_reagendado: date
            };

            // Use generic update endpoint
            await api.put(`/clients/${id}`, body);

            window.showSuccessModal('Estado de llamada actualizado');
            callModal.classList.add('hidden');
            window.loadClients();
        } catch (error) {
            alert('Error al actualizar: ' + error.message);
        }
    });
}


// --- Resizable Gutter Logic ---
// ... (Keeping the rest)

// --- Map Zoom Logic ---
let mapZoom = {
    scale: 1,
    panning: false,
    pointX: 0,
    pointY: 0,
    startX: 0,
    startY: 0
};

function updateMapTransform() {
    const content = document.querySelector('.map-content');
    const container = document.querySelector('.map-container'); // Asegúrate de tener la referencia al padre
    
    if (content && container) {
        // --- CONFIGURACIÓN DEL GRIS ---
        const maxGutter = 150; // <--- CAMBIA ESTO: Cuántos píxeles de gris permites ver
        
        const rect = container.getBoundingClientRect();
        const contentWidth = content.offsetWidth * mapZoom.scale;
        const contentHeight = content.offsetHeight * mapZoom.scale;

        // Nuevos Límites Flexibles: Funcionan tanto si el mapa es grande como pequeño
        // Permitimos que el mapa se mueva siempre que quede un margen gris razonable (maxGutter)
        const minX = Math.min(0, rect.width - contentWidth) - maxGutter;
        const maxX = Math.max(0, rect.width - contentWidth) + maxGutter;

        const minY = Math.min(0, rect.height - contentHeight) - maxGutter;
        const maxY = Math.max(0, rect.height - contentHeight) + maxGutter;

        // Aplicamos el "Clamp" (Restricción)
        mapZoom.pointX = Math.min(Math.max(mapZoom.pointX, minX), maxX);
        mapZoom.pointY = Math.min(Math.max(mapZoom.pointY, minY), maxY);

        content.style.transform = `translate(${mapZoom.pointX}px, ${mapZoom.pointY}px) scale(${mapZoom.scale})`;
    }
}

window.resetMapZoom = () => {
    const container = document.querySelector('.map-container');
    const content = document.querySelector('.map-content'); // Ojo: asegúrate que este sea el wrapper de la imagen
    const img = content ? content.querySelector('img') : null;

    if (container && img) {
        // Esperamos a que la imagen cargue para saber su tamaño real
        const calculatePosition = () => {
            // 1. Calculamos el centro
            const containerW = container.offsetWidth;
            const containerH = container.offsetHeight;
            const imgW = img.offsetWidth;
            const imgH = img.offsetHeight;

            // Fórmula para centrar: (AnchoContenedor - AnchoImagen) / 2
            const centerX = (containerW - imgW) / 2;
            const centerY = (containerH - imgH) / 2;

            mapZoom = { 
                scale: 1.0, // Inicia a tamaño real 100%
                panning: false, 
                pointX: centerX, 
                pointY: centerY, 
                startX: 0, 
                startY: 0 
            };
            updateMapTransform();
        };

        // Si la imagen ya cargó, calculamos. Si no, esperamos.
        if (img.complete) {
            calculatePosition();
        } else {
            img.onload = calculatePosition;
        }
    } else {
        // Fallback por si algo falla
        mapZoom = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
        updateMapTransform();
    }
};

function setupMapZoom(container, content) {
    // Reset
    window.resetMapZoom();

    container.style.overflow = 'hidden';
    container.style.cursor = 'grab';
    content.style.transformOrigin = '0 0';
    content.style.transition = 'transform 0.1s ease-out';

    // Wheel Zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        const newScale = mapZoom.scale * delta;
        if (newScale < 1 || newScale > 11) return;

        // Calculate new position to keep mouse point stable
        // (offsetX - oldX) / oldScale = (offsetX - newX) / newScale
        // newX = offsetX - (offsetX - oldX) * (newScale / oldScale)
        
        mapZoom.pointX = offsetX - (offsetX - mapZoom.pointX) * (newScale / mapZoom.scale);
        mapZoom.pointY = offsetY - (offsetY - mapZoom.pointY) * (newScale / mapZoom.scale);
        mapZoom.scale = newScale;

        updateMapTransform();
    });

    // Panning (Mouse)
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.lot-dot')) return; // Don't drag if clicking a dot
        e.preventDefault();
        mapZoom.startX = e.clientX - mapZoom.pointX;
        mapZoom.startY = e.clientY - mapZoom.pointY;
        mapZoom.panning = true;
        container.style.cursor = 'grabbing';
        content.style.transition = 'none'; // Disable transition for direct manipulation
    });

    window.addEventListener('mousemove', (e) => {
        if (!mapZoom.panning) return;
        e.preventDefault();
        mapZoom.pointX = e.clientX - mapZoom.startX;
        mapZoom.pointY = e.clientY - mapZoom.startY;
        updateMapTransform();
    });

    window.addEventListener('mouseup', () => {
        if (mapZoom.panning) {
            mapZoom.panning = false;
            container.style.cursor = 'grab';
            content.style.transition = 'transform 0.1s ease-out';
        }
    });

    // Touch Support (Basic Pan + Pinch)
    let initialDist = 0;
    
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
             // Pan
             const touch = e.touches[0];
             mapZoom.startX = touch.clientX - mapZoom.pointX;
             mapZoom.startY = touch.clientY - mapZoom.pointY;
             mapZoom.panning = true;
             content.style.transition = 'none';
        } else if (e.touches.length === 2) {
             // Pinch Start
             mapZoom.panning = false;
             initialDist = Math.hypot(
                 e.touches[0].clientX - e.touches[1].clientX,
                 e.touches[0].clientY - e.touches[1].clientY
             );
        }
    });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent Browser Zoom
        
        if (e.touches.length === 1 && mapZoom.panning) {
            const touch = e.touches[0];
            mapZoom.pointX = touch.clientX - mapZoom.startX;
            mapZoom.pointY = touch.clientY - mapZoom.startY;
            updateMapTransform();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                 e.touches[0].clientX - e.touches[1].clientX,
                 e.touches[0].clientY - e.touches[1].clientY
            );
            
            if (initialDist > 0) {
                const delta = dist / initialDist;
                // Simple center zoom for pinch (improving this to focal point is harder but acceptable)
                const newScale = mapZoom.scale * delta;
                
                // Scale around center of screen (approx)
                if (newScale >= 1 && newScale <= 15) {
                    // Just scale for now, keeping current center? 
                    // To keep it simple: just scale. 
                    // Better: Scale around midpoint of touches.
                    // Doing robust pinch-zoom math in one-shot is risky.
                    // Let's stick to Scale adjustment.
                    
                    const rect = container.getBoundingClientRect();
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                    
                    mapZoom.pointX = centerX - (centerX - mapZoom.pointX) * (newScale / mapZoom.scale);
                    mapZoom.pointY = centerY - (centerY - mapZoom.pointY) * (newScale / mapZoom.scale);
                    mapZoom.scale = newScale;
                    
                    updateMapTransform();
                    initialDist = dist; // Reset for next move
                }
            }
        }
    });
    
    container.addEventListener('touchend', () => {
         mapZoom.panning = false;
         content.style.transition = 'transform 0.1s ease-out';
    });
}

// --- Commissions Logic ---

const commissionsLink = document.querySelector('a[data-view="commissions"]');
const commissionsView = document.getElementById('view-commissions');
const commProjectSelect = document.getElementById('commission-project-select');
const commLotsTableBody = document.getElementById('commissions-lots-body');
const checkAllComm = document.getElementById('check-all-commissions');

// New UI Elements
const commTabFinanced = document.getElementById('tab-financed');
const commTabCash = document.getElementById('tab-cash');
const financedOptions = document.getElementById('financed-options');
const commInitialRadiosV2 = document.querySelectorAll('input[name="comm-initial-v2"]');
const stepperValue = document.getElementById('stepper-value');

// Results
const resLotesPrecio = document.getElementById('res-lotes-precio');
const resTotalVenta = document.getElementById('res-total-venta');
const resComisionPerc = document.getElementById('res-comision-perc');
const resTotalCommission = document.getElementById('res-total-commission');
const btnCommAction = document.getElementById('btn-comm-action');

let commSelectedLots = new Set();
let commCurrentLots = [];
let currentCommType = 'financiado'; // 'financiado' or 'contado'

if (commissionsLink) {
    commissionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Hide all main view sections
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        
        // Show commissions view
        commissionsView.classList.remove('hidden');
        
        // Update active link in sidebar
        document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
        commissionsLink.classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 700) {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        }

        // Load projects if needed
        populateCommissionProjectSelect();
    });
}

// Hook into existing navigation
document.querySelectorAll('.sidebar-nav a:not([data-view="commissions"])').forEach(link => {
    link.addEventListener('click', () => {
        if(commissionsView) commissionsView.classList.add('hidden');
        if(commissionsLink) commissionsLink.classList.remove('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 700) {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        }
    });
});



// Tab Switching Logic
if (commTabFinanced) {
    commTabFinanced.onclick = () => {
        currentCommType = 'financiado';
        commTabFinanced.classList.add('active');
        commTabCash.classList.remove('active');
        if (financedOptions) financedOptions.classList.remove('hidden');
        updateCommissionCalculation();
    };
}
if (commTabCash) {
    commTabCash.onclick = () => {
        currentCommType = 'contado';
        commTabCash.classList.add('active');
        commTabFinanced.classList.remove('active');
        if (financedOptions) financedOptions.classList.add('hidden');
        updateCommissionCalculation();
    };
}

// Radio Card Active State
commInitialRadiosV2.forEach(radio => {
    radio.addEventListener('change', () => {
        // Remove active from all cards
        document.querySelectorAll('.initial-card').forEach(card => card.classList.remove('active'));
        // Add to parent label
        radio.closest('.initial-card').classList.add('active');
        updateCommissionCalculation();
    });
});

async function populateCommissionProjectSelect() {
    commProjectSelect.innerHTML = '<option value="">-- Seleccione un Proyecto --</option>';
    
    // Fetch if empty
    if (typeof allProjects === 'undefined' || allProjects.length === 0) {
        try {
            allProjects = await api.get('/projects');
        } catch (e) {
            console.error("Error loading projects for commissions", e);
            return;
        }
    }

    if (allProjects && allProjects.length > 0) {
        const activeProjects = allProjects.filter(p => p.estado === 'ACTIVO');
        activeProjects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_proyecto;
            opt.textContent = p.nombre;
            commProjectSelect.appendChild(opt);
        });

        // Auto-select and load first project if available
        if (activeProjects.length > 0) {
            commProjectSelect.value = activeProjects[0].id_proyecto;
            loadCommissionLots(activeProjects[0].id_proyecto);
        }
    }
}

async function loadCommissionLots(projectId) {
    if (!projectId) {
        commLotsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Seleccione un proyecto para ver los lotes.</td></tr>';
        commCurrentLots = [];
        updateCommissionCalculation();
        return;
    }
    
    let project = allProjects.find(p => p.id_proyecto == projectId);
    if (project && (!project.Lotes || project.Lotes.length === 0)) {
        window.showLoader();
        try {
            project = await api.get(`/projects/${projectId}`);
            const idx = allProjects.findIndex(p => p.id_proyecto == projectId);
            if (idx !== -1) allProjects[idx] = project;
        } catch (err) {
            console.error(err);
            commLotsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Error cargando lotes.</td></tr>';
            window.hideLoader();
            return;
        }
        window.hideLoader();
    }
    if (project && !project.Lotes && project.Lote) project.Lotes = project.Lote;
    commCurrentLots = project ? (project.Lotes || []) : [];
    renderCommissionsLots(commCurrentLots);
}

commProjectSelect.addEventListener('change', (e) => loadCommissionLots(e.target.value));

function renderCommissionsLots(lots) {
    commLotsTableBody.innerHTML = '';
    commSelectedLots.clear();
    if (checkAllComm) checkAllComm.checked = false;
    
    // Filter available lots (be more flexible with state detection)
    const availableLots = lots.filter(l => {
        const stateName = (l.EstadoLote && l.EstadoLote.nombre_estado) || l.estado || '';
        return stateName.toUpperCase() === 'DISPONIBLE';
    });
    
    if (availableLots.length === 0) {
        commLotsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay lotes disponibles en este proyecto.</td></tr>';
        updateCommissionCalculation();
        return;
    }

    availableLots.forEach(l => {
        const tr = document.createElement('tr');
        const priceContado = parseFloat(String(l.precio_contado || 0).replace(/,/g, ''));
        const priceFinanciado = parseFloat(String(l.precio_financiado || 0).replace(/,/g, ''));
        
        tr.innerHTML = `
            <td><input type="checkbox" class="comm-check" data-id="${l.id_lote}" data-price="${priceFinanciado}" data-price-cash="${priceContado}"></td>
            <td>${l.manzana || '-'}</td>
            <td>${l.numero || '-'}</td>
            <td>S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(priceContado)}</td>
            <td>S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(priceFinanciado)}</td>
            <td><span class="badge badge-available">DISPONIBLE</span></td>
        `;
        commLotsTableBody.appendChild(tr);
    });
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.comm-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            if (e.target.checked) commSelectedLots.add(e.target.dataset.id);
            else commSelectedLots.delete(e.target.dataset.id);
            updateCommissionCalculation();
        });
    });
    
    updateCommissionCalculation();
}

if (checkAllComm) {
    checkAllComm.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.comm-check').forEach(chk => {
            chk.checked = checked;
            if (checked) commSelectedLots.add(chk.dataset.id);
            else commSelectedLots.delete(chk.dataset.id);
        });
        updateCommissionCalculation();
    });
}

function updateCommissionCalculation() {
    const isCash = currentCommType === 'contado';
    
    let initialTier = 3000;
    const checkedRadio = document.querySelector('input[name="comm-initial-v2"]:checked');
    if(checkedRadio) initialTier = parseInt(checkedRadio.value);
    
    const count = commSelectedLots.size;
    let totalSales = 0;
    let avgPrice = 0;
    
    document.querySelectorAll('.comm-check:checked').forEach(chk => {
        const price = isCash ? parseFloat(chk.dataset.priceCash) : parseFloat(chk.dataset.price);
        totalSales += price;
    });

    if (count > 0) avgPrice = totalSales / count;
    
    let percentage = 0;
    
    if (count > 0) {
        if (isCash) {
            percentage = 7;
        } else {
            if (initialTier === 3000) {
                if (count >= 1 && count <= 3) percentage = 2;
                else if (count >= 4 && count <= 5) percentage = 2.2;
                else if (count >= 6) percentage = 2.35;
            } else if (initialTier === 6000) {
                if (count >= 1 && count <= 3) percentage = 3;
                else if (count >= 4 && count <= 5) percentage = 3.2;
                else if (count >= 6) percentage = 3.5;
            } else if (initialTier === 10000) {
                if (count >= 1 && count <= 3) percentage = 4;
                else if (count >= 4 && count <= 5) percentage = 4.2;
                else if (count >= 6) percentage = 4.5;
            }
        }
    }
    
    const commission = totalSales * (percentage / 100);
    
    // Update UI
    if(stepperValue) stepperValue.textContent = count;
    if(resLotesPrecio) resLotesPrecio.textContent = `${count} x S/ ${avgPrice.toLocaleString('es-PE', {minimumFractionDigits: 0})}`;
    if(resTotalVenta) resTotalVenta.textContent = `S/ ${totalSales.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    if(resComisionPerc) resComisionPerc.textContent = `${percentage}%`;
    if(resTotalCommission) resTotalCommission.textContent = `S/ ${commission.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
}

// Action button logic (placeholder)
if (btnCommAction) {
    btnCommAction.onclick = () => {
        if (commSelectedLots.size === 0) {
            alert('Por favor seleccione al menos un lote.');
            return;
        }
        alert('Esta funcionalidad permitirá generar una propuesta formal pronto.');
    };
}

