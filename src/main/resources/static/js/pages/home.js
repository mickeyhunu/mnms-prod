function initHomePage() {
    Auth.updateHeaderUI();
    bindLogoutButton();
    bindServiceTabs();
}

function bindLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
            await AuthAPI.logout();
            return;
        }

        Auth.logout();
    });
}

function bindServiceTabs() {
    const tabs = Array.from(document.querySelectorAll('.service-tab'));
    const panels = Array.from(document.querySelectorAll('.service-grid'));

    if (!tabs.length || !panels.length) {
        return;
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;

            tabs.forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.panel === category;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
