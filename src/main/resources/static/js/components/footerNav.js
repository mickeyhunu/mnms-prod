(function () {
    const footerItems = [
        { label: '홈', href: 'index.html', icon: '🏠' },
        { label: 'LIVE', href: 'live.html', icon: '🔴' },
        { label: '커뮤니티', href: 'community.html', icon: '💬' },
        { label: '업체정보', href: 'business-info.html', icon: '🏢' },
        { label: '내 정보', href: 'my-page.html', icon: '👤' }
    ];

    function normalizePath(pathname) {
        const path = pathname.split('/').pop();
        return path || 'index.html';
    }

    function createFooterNav() {
        const currentPath = normalizePath(window.location.pathname);
        const footer = document.createElement('footer');
        footer.className = 'bottom-nav-footer';

        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('aria-label', '하단 메뉴');

        const list = document.createElement('ul');
        list.className = 'bottom-nav-list';

        footerItems.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.className = 'bottom-nav-item';

            const link = document.createElement('a');
            link.className = 'bottom-nav-link';
            link.href = item.href;
            link.innerHTML = `<span class="bottom-nav-icon" aria-hidden="true">${item.icon}</span><span class="bottom-nav-label">${item.label}</span>`;

            if (currentPath === item.href) {
                link.classList.add('is-active');
                link.setAttribute('aria-current', 'page');
            }

            listItem.appendChild(link);
            list.appendChild(listItem);
        });

        nav.appendChild(list);
        footer.appendChild(nav);
        document.body.appendChild(footer);
        document.body.classList.add('has-bottom-nav');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFooterNav);
    } else {
        createFooterNav();
    }
})();
