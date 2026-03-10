function initHomePage() {
    Auth.updateHeaderUI();
    bindLogoutButton();
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
