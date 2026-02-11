const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userNameDisplay = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/' || path.endsWith('login.html') || path.endsWith('index.html');

    if (token && user) {
        if (isLoginPage) {
            window.location.href = '/dashboard';
        } else if (userNameDisplay) {
            // We are on dashboard
            userNameDisplay.textContent = user.name + ' (' + user.role + ')';
            // Reveal content securely
            document.body.style.display = 'block';
            if (window.loadProjects) {
                window.loadProjects();
            }
        }
    } else {
        if (!isLoginPage) {
            window.location.href = '/login';
        }
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const data = await api.post('/auth/login', { email, password });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            window.location.href = '/dashboard';
        } catch (error) {
            loginError.textContent = error.message;
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });
}

// Check on load
document.addEventListener('DOMContentLoaded', checkAuth);
