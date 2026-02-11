// Navigation
const navLinks = document.querySelectorAll('.sidebar-nav a[data-view]');
const sections = document.querySelectorAll('.view-section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        // Active class
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.closest('a').classList.add('active');

        // Show section
        const viewId = link.getAttribute('data-view');
        sections.forEach(section => section.classList.add('hidden'));

        const targetSection = document.getElementById(`view-${viewId}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Load specific data
        if (viewId === 'projects' && window.loadProjects) window.loadProjects();
        if (viewId === 'quotes' && window.loadQuotes) window.loadQuotes();
        if (viewId === 'sales' && window.loadSales) window.loadSales();
        if (viewId === 'clients' && window.loadClients) window.loadClients();
        if (viewId === 'users' && window.loadUsers) window.loadUsers();
    });
});
