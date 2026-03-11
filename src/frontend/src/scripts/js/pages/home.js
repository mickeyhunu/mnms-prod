/**
 * 파일 역할: home 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
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
