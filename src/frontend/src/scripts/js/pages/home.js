/**
 * 파일 역할: home 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
function initHomePage() {
    const THEME_STORAGE_KEY = 'mnms-home-theme';
    const DARK_THEME = 'dark';
    const toggleButton = document.getElementById('home-theme-toggle');

    const setTheme = (theme) => {
        const isDark = theme === DARK_THEME;
        document.body.classList.toggle('home-dark', isDark);

        if (toggleButton) {
            toggleButton.textContent = isDark ? '다크모드 OFF' : '다크모드 ON';
            toggleButton.setAttribute('aria-pressed', String(isDark));
        }
    };

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    setTheme(savedTheme === DARK_THEME ? DARK_THEME : 'light');

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('home-dark') ? 'light' : DARK_THEME;
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
            setTheme(nextTheme);
        });
    }

    Auth.updateHeaderUI();
    Auth.bindLogoutButton();
    if (typeof initTopAds === 'function') {
        initTopAds({
            containerId: 'top-ads-container',
            placement: 'HOME'
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
