class Auth {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
    }

    async login(password, role) {
        try {
            const adminPassword = await db.getSetting('adminPassword');
            const sellerPassword = await db.getSetting('sellerPassword');

            if (role === 'admin' && password === adminPassword) {
                this.currentUser = 'admin';
                this.currentRole = 'admin';
                return true;
            }

            if (role === 'vendedor' && password === sellerPassword) {
                this.currentUser = 'vendedor';
                this.currentRole = 'vendedor';
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error en login:', error);
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.currentRole = null;
        localStorage.removeItem('userSession');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentRole === 'admin';
    }

    getCurrentRole() {
        return this.currentRole;
    }

    saveSession() {
        localStorage.setItem('userSession', JSON.stringify({
            user: this.currentUser,
            role: this.currentRole,
            timestamp: Date.now()
        }));
    }

    loadSession() {
        const session = localStorage.getItem('userSession');
        if (session) {
            const data = JSON.parse(session);
            // Verificar si la sesión no ha expirado (24 horas)
            if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                this.currentUser = data.user;
                this.currentRole = data.role;
                return true;
            }
        }
        return false;
    }
}

const auth = new Auth();

// Funciones globales
function showLoginForm(role) {
    const title = role === 'admin' ? 'Acceso Administrador' : 'Acceso Vendedor';
    document.getElementById('loginTitle').textContent = title;
    document.getElementById('passwordInput').dataset.role = role;
}

function login() {
    const password = document.getElementById('passwordInput').value;
    const role = document.getElementById('passwordInput').dataset.role || 'vendedor';

    if (!password) {
        showToast('Por favor ingresa una contraseña', 'error');
        return;
    }

    showLoading('Verificando credenciales...');

    setTimeout(async () => {
        const success = await auth.login(password, role);
        
        hideLoading();

        if (success) {
            auth.saveSession();
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('dashboard').classList.remove('hidden');
            document.getElementById('userRole').textContent = 
                auth.isAdmin() ? 'Administrador' : 'Vendedor';
            
            // Cargar datos
            loadDashboard();
            
            showToast('¡Bienvenido!', 'success');
        } else {
            document.getElementById('loginError').textContent = 'Contraseña incorrecta';
            showToast('Contraseña incorrecta', 'error');
        }
    }, 500);
}

function logout() {
    auth.logout();
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginModal').classList.add('active');
    showToast('Sesión cerrada correctamente', 'info');
}

function closeLogin() {
    document.getElementById('loginModal').classList.remove('active');
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
    if (auth.loadSession()) {
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('userRole').textContent = 
            auth.isAdmin() ? 'Administrador' : 'Vendedor';
        loadDashboard();
    }
});