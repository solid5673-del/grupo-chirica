// Funciones principales de la aplicación

document.addEventListener('DOMContentLoaded', async () => {
    await initializeDefaultData();
});

// Cambiar entre secciones
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remover clase active de todos los items del menú
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });

    // Mostrar la sección seleccionada
    document.getElementById(`section-${sectionName}`).classList.add('active');

    // Agregar clase active al item del menú correspondiente
    event.currentTarget.classList.add('active');

    // Scroll al top
    window.scrollTo(0, 0);
}

// Exportar/Importar
function exportToCSV() {
    db.getProducts().then(products => {
        if (products.length === 0) {
            showToast('No hay productos para exportar', 'warning');
            return;
        }

        const headers = ['ID', 'Nombre', 'Categoría', 'Precio Local', 'Precio Divisas', 'Descripción'];
        const rows = products.map(p => [
            p.id,
            p.name,
            p.categoryName || '',
            p.priceLocal || 0,
            p.priceDivisas || 0,
            p.description || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        downloadFile(csvContent, 'productos_grupo_chirica.csv', 'text/csv');
        showToast('Exportación exitosa', 'success');
    });
}

function exportToJSON() {
    db.getProducts().then(products => {
        if (products.length === 0) {
            showToast('No hay productos para exportar', 'warning');
            return;
        }

        const jsonContent = JSON.stringify(products, null, 2);
        downloadFile(jsonContent, 'productos_grupo_chirica.json', 'application/json');
        showToast('Exportación exitosa', 'success');
    });
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

let importedData = null;

function handleFileSelect() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            if (file.name.endsWith('.json')) {
                importedData = JSON.parse(e.target.result);
            } else if (file.name.endsWith('.csv')) {
                importedData = parseCSV(e.target.result);
            }
            
            document.getElementById('importButton').disabled = false;
            showImportPreview();
        } catch (error) {
            showToast('Error al leer el archivo', 'error');
            console.error(error);
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        
        headers.forEach((header, index) => {
            obj[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
        });
        
        data.push(obj);
    }
    
    return data;
}

function showImportPreview() {
    if (!importedData) return;

    const preview = document.getElementById('importPreview');
    preview.innerHTML = `
        <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
            <h4>Previsualización (${importedData.length} productos)</h4>
            <ul style="max-height: 200px; overflow-y: auto;">
                ${importedData.slice(0, 5).map(item => `
                    <li><strong>${item.name || item.Nombre || 'Sin nombre'}</strong> - $${item.priceLocal || item.preciolocal || 0}</li>
                `).join('')}
                ${importedData.length > 5 ? `<li>... y ${importedData.length - 5} más</li>` : ''}
            </ul>
        </div>
    `;
}

async function importData() {
    if (!importedData) {
        showToast('No hay datos para importar', 'warning');
        return;
    }

    try {
        showLoading(`Importando ${importedData.length} productos...`);
        
        let successCount = 0;
        
        for (let i = 0; i < importedData.length; i++) {
            const item = importedData[i];
            
            const product = {
                name: item.name || item.Nombre || '',
                categoryId: parseInt(item.categoryId || item.categoria || 1),
                categoryName: item.categoryName || 'Importado',
                priceLocal: parseFloat(item.priceLocal || item.preciolocal || 0),
                priceDivisas: parseFloat(item.priceDivisas || item.preciodivisas || 0),
                description: item.description || item.descripcion || '',
                createdAt: new Date().toISOString()
            };
            
            await db.addProduct(product);
            successCount++;
            
            // Actualizar progreso
            const progress = Math.round((i + 1) / importedData.length * 100);
            updateProgress(progress);
        }
        
        hideLoading();
        showToast(`Importación exitosa: ${successCount} productos agregados`, 'success');
        
        // Limpiar
        document.getElementById('importFile').value = '';
        document.getElementById('importButton').disabled = true;
        document.getElementById('importPreview').innerHTML = '';
        importedData = null;
        
        // Recargar productos
        loadProducts();
        loadStats();
        
    } catch (error) {
        hideLoading();
        console.error('Error al importar:', error);
        showToast('Error al importar productos', 'error');
    }
}

// Configuración de precios
async function loadPricingConfig() {
    const categoryId = document.getElementById('pricingCategory').value;
    if (!categoryId) return;

    try {
        const configs = await db.getPricingConfig(parseInt(categoryId));
        
        if (configs.length > 0) {
            configs.forEach(config => {
                switch(config.method) {
                    case 'transfer':
                        document.getElementById('discountTransfer').value = config.discount || 0;
                        document.getElementById('ivaTransfer').value = config.iva || 0;
                        document.getElementById('applyIvaTransfer').checked = config.applyIva !== false;
                        break;
                    case 'cash':
                        document.getElementById('discountCash').value = config.discount || 0;
                        document.getElementById('ivaCash').value = config.iva || 0;
                        document.getElementById('applyIvaCash').checked = config.applyIva !== false;
                        break;
                    case 'currency':
                        document.getElementById('discountCurrency').value = config.discount || 0;
                        document.getElementById('ivaCurrency').value = config.iva || 0;
                        document.getElementById('applyIvaCurrency').checked = config.applyIva !== false;
                        break;
                }
            });
        }
        
        updatePreview();
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
    }
}

function savePricingConfig(method) {
    const categoryId = document.getElementById('pricingCategory').value;
    if (!categoryId) {
        showToast('Selecciona una categoría primero', 'warning');
        return;
    }

    const config = {
        categoryId: parseInt(categoryId),
        categoryName: document.getElementById('pricingCategory').options[document.getElementById('pricingCategory').selectedIndex].text,
        method: method,
        discount: parseFloat(document.getElementById(`discount${capitalize(method)}`).value) || 0,
        iva: parseFloat(document.getElementById(`iva${capitalize(method)}`).value) || 0,
        applyIva: document.getElementById(`applyIva${capitalize(method)}`).checked,
        updatedAt: new Date().toISOString()
    };

    db.savePricingConfig(config).then(() => {
        showToast('Configuración guardada exitosamente', 'success');
        updatePreview();
    }).catch(error => {
        console.error('Error al guardar:', error);
        showToast('Error al guardar configuración', 'error');
    });
}

function updatePreview() {
    const basePrice = 100;
    const methods = [
        { id: 'transfer', name: 'Transferencia', icon: 'exchange-alt' },
        { id: 'cash', name: 'Efectivo', icon: 'money-bill-wave' },
        { id: 'currency', name: 'Divisas', icon: 'dollar-sign' }
    ];

    const previewHTML = methods.map(method => {
        const discount = parseFloat(document.getElementById(`discount${capitalize(method.id)}`).value) || 0;
        const iva = parseFloat(document.getElementById(`iva${capitalize(method.id)}`).value) || 0;
        const applyIva = document.getElementById(`applyIva${capitalize(method.id)}`).checked;
        
        let price = basePrice - (basePrice * discount / 100);
        if (applyIva) {
            price = price + (price * iva / 100);
        }
        
        return `
            <div class="preview-card">
                <i class="fas fa-${method.icon}"></i>
                <h4>${method.name}</h4>
                <p>$${price.toFixed(2)}</p>
            </div>
        `;
    }).join('');

    document.getElementById('previewResults').innerHTML = previewHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Cambiar contraseñas
document.getElementById('changeAdminPasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPass = document.getElementById('currentAdminPassword').value;
    const newPass = document.getElementById('newAdminPassword').value;
    const confirmPass = document.getElementById('confirmAdminPassword').value;
    
    if (newPass !== confirmPass) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    const adminPass = await db.getSetting('adminPassword');
    
    if (currentPass !== adminPass) {
        showToast('Contraseña actual incorrecta', 'error');
        return;
    }
    
    await db.saveSetting('adminPassword', newPass);
    document.getElementById('currentAdminPass').textContent = '••••••••';
    showToast('Contraseña de administrador actualizada', 'success');
    document.getElementById('changeAdminPasswordForm').reset();
});

document.getElementById('changeSellerPasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const adminPassVerify = document.getElementById('adminPasswordVerify').value;
    const newPass = document.getElementById('newSellerPassword').value;
    const confirmPass = document.getElementById('confirmSellerPassword').value;
    
    if (newPass !== confirmPass) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    const adminPass = await db.getSetting('adminPassword');
    
    if (adminPassVerify !== adminPass) {
        showToast('Contraseña de administrador incorrecta', 'error');
        return;
    }
    
    await db.saveSetting('sellerPassword', newPass);
    document.getElementById('currentSellerPass').textContent = '••••••••';
    showToast('Contraseña de vendedor actualizada', 'success');
    document.getElementById('changeSellerPasswordForm').reset();
});

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Loading overlay
function showLoading(message = 'Procesando...') {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function updateProgress(percent) {
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `${percent}%`;
}

// Event Listeners
document.getElementById('addProductForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    addProduct();
});