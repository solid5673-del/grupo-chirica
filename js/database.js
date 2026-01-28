// Base de datos IndexedDB
class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GrupoChiricaDB', 1);

            request.onerror = (event) => {
                console.error('Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Base de datos abierta exitosamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                
                // Crear almacenes de objetos
                if (!this.db.objectStoreNames.contains('products')) {
                    const productsStore = this.db.createObjectStore('products', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    productsStore.createIndex('name', 'name', { unique: false });
                    productsStore.createIndex('category', 'category', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('categories')) {
                    const categoriesStore = this.db.createObjectStore('categories', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    categoriesStore.createIndex('name', 'name', { unique: true });
                }

                if (!this.db.objectStoreNames.contains('pricing')) {
                    this.db.createObjectStore('pricing', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                }

                if (!this.db.objectStoreNames.contains('settings')) {
                    this.db.createObjectStore('settings', { 
                        keyPath: 'key' 
                    });
                }
            };
        });
    }

    // Productos
    async addProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.add(product);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateProduct(id, product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.put({ ...product, id });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getProductById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Categorías
    async addCategory(name) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            const request = store.add({ name });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCategories() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Configuración de precios
    async savePricingConfig(config) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pricing'], 'readwrite');
            const store = transaction.objectStore('pricing');
            const request = store.put(config);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPricingConfig(categoryId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pricing'], 'readonly');
            const store = transaction.objectStore('pricing');
            const index = store.index('categoryId');
            const request = index.getAll(categoryId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Configuración general
    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton
const db = new Database();

// Inicializar datos por defecto
async function initializeDefaultData() {
    try {
        // Verificar si ya existen categorías
        const categories = await db.getCategories();
        if (categories.length === 0) {
            // Crear categorías por defecto
            const defaultCategories = [
                'Electrónica',
                'Ropa',
                'Alimentos',
                'Hogar',
                'Belleza',
                'Deportes',
                'Juguetes',
                'Libros'
            ];

            for (const category of defaultCategories) {
                await db.addCategory(category);
            }

            console.log('Categorías por defecto creadas');
        }

        // Verificar configuración de contraseñas
        const adminPass = await db.getSetting('adminPassword');
        const sellerPass = await db.getSetting('sellerPassword');

        if (!adminPass) {
            await db.saveSetting('adminPassword', 'admin123');
        }
        if (!sellerPass) {
            await db.saveSetting('sellerPassword', 'vendedor123');
        }

    } catch (error) {
        console.error('Error al inicializar datos por defecto:', error);
    }
}

// Exportar
window.db = db;
window.initializeDefaultData = initializeDefaultData;