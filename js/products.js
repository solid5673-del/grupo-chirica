// Funciones para gestionar productos

async function loadDashboard() {
    await loadCategories();
    await loadProducts();
    await loadStats();
    updateLastUpdate();
}

async function loadCategories() {
    try {
        const categories = await db.getCategories();
        
        // Actualizar select de categorías
        const categorySelects = [
            'productCategory',
            'pricingCategory',
            'categoryFilter'
        ];

        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Selecciona una categoría</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    select.appendChild(option);
                });
            }
        });

    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
}

async function loadProducts() {
    try {
        showLoading('Cargando productos...');
        const products = await db.getProducts();
        hideLoading();

        const tbody = document.getElementById('productsTableBody');
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay productos disponibles. Agrega productos desde el panel administrador.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.categoryName || 'Sin categoría'}</td>
                <td>$${parseFloat(product.priceLocal || 0).toFixed(2)}</td>
                <td>$${parseFloat(product.priceDivisas || 0).toFixed(2)}</td>
                <td class="action-buttons">
                    ${auth.isAdmin() ? `
                        <button class="action-btn edit" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    ` : `
                        <button class="action-btn edit" onclick="viewProduct(${product.id})">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    `}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar productos:', error);
        showToast('Error al cargar productos', 'error');
    }
}

async function addProduct() {
    const form = document.getElementById('addProductForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const product = {
        name: document.getElementById('productName').value,
        categoryId: parseInt(document.getElementById('productCategory').value),
        categoryName: document.getElementById('productCategory').options[document.getElementById('productCategory').selectedIndex].text,
        priceLocal: parseFloat(document.getElementById('priceLocal').value),
        priceDivisas: parseFloat(document.getElementById('priceDivisas').value),
        description: document.getElementById('productDescription').value,
        createdAt: new Date().toISOString()
    };

    try {
        showLoading('Guardando producto...');
        await db.addProduct(product);
        hideLoading();
        
        showToast('Producto agregado exitosamente', 'success');
        clearForm();
        loadProducts();
        loadStats();
    } catch (error) {
        hideLoading();
        console.error('Error al agregar producto:', error);
        showToast('Error al agregar producto', 'error');
    }
}

function clearForm() {
    document.getElementById('addProductForm').reset();
}

async function editProduct(id) {
    const product = await db.getProductById(id);
    if (product) {
        showSection('add-product');
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.categoryId;
        document.getElementById('priceLocal').value = product.priceLocal;
        document.getElementById('priceDivisas').value = product.priceDivisas;
        document.getElementById('productDescription').value = product.description || '';
        
        // Guardar ID para actualizar
        document.getElementById('addProductForm').dataset.editId = id;
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        showLoading('Eliminando producto...');
        await db.deleteProduct(id);
        hideLoading();
        
        showToast('Producto eliminado exitosamente', 'success');
        loadProducts();
        loadStats();
    } catch (error) {
        hideLoading();
        console.error('Error al eliminar producto:', error);
        showToast('Error al eliminar producto', 'error');
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const category = row.cells[1].textContent;
        
        const matchesSearch = name.includes(searchTerm);
        const matchesCategory = !categoryFilter || category === document.getElementById('categoryFilter').options[document.getElementById('categoryFilter').selectedIndex].text;
        
        row.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
    });
}

async function loadStats() {
    const products = await db.getProducts();
    
    document.getElementById('totalProducts').textContent = products.length;
    
    if (products.length > 0) {
        const avgLocal = products.reduce((sum, p) => sum + parseFloat(p.priceLocal || 0), 0) / products.length;
        const avgDivisas = products.reduce((sum, p) => sum + parseFloat(p.priceDivisas || 0), 0) / products.length;
        
        document.getElementById('avgLocal').textContent = `$${avgLocal.toFixed(2)}`;
        document.getElementById('avgDivisas').textContent = `$${avgDivisas.toFixed(2)}`;
    }
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleString('es-ES');
}

// Exportar funciones
window.addProduct = addProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
window.clearForm = clearForm;