(function initSectionHeaderMenu() {
    const handleBackNavigation = (backLink) => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        window.location.href = backLink.getAttribute('href') || '/';
    };

    if (!window.__communityBackLinkBound) {
        document.addEventListener('click', (event) => {
            const backLink = event.target.closest('.community-back-link');
            if (!backLink) {
                return;
            }

            event.preventDefault();
            handleBackNavigation(backLink);
        });
        window.__communityBackLinkBound = true;
    }

    const getBoundToggleButtons = () => {
        if (!window.__sectionHeaderBoundToggleButtons) {
            window.__sectionHeaderBoundToggleButtons = new WeakSet();
        }

        return window.__sectionHeaderBoundToggleButtons;
    };

    window.initSectionHeader = function initSectionHeader() {
        const tabsPanel = document.getElementById('board-tabs-panel');
        const toggleButton = document.getElementById('board-menu-toggle');

        if (!window.__sectionHeaderOutsideClickBound) {
            document.addEventListener('click', (event) => {
                if (event.target.closest('.community-back-link')) {
                    return;
                }

                const currentTabsPanel = document.getElementById('board-tabs-panel');
                const currentToggleButton = document.getElementById('board-menu-toggle');

                if (!currentTabsPanel || !currentToggleButton || currentTabsPanel.classList.contains('hidden')) {
                    return;
                }

                if (currentTabsPanel.contains(event.target) || currentToggleButton.contains(event.target)) {
                    return;
                }

                currentTabsPanel.classList.add('hidden');
                currentToggleButton.setAttribute('aria-expanded', 'false');
            });
            window.__sectionHeaderOutsideClickBound = true;
        }

        if (!tabsPanel || !toggleButton) {
            return;
        }

        const boundToggleButtons = getBoundToggleButtons();
        if (boundToggleButtons.has(toggleButton)) {
            return;
        }

        const closeTabsPanel = () => {
            tabsPanel.classList.add('hidden');
            toggleButton.setAttribute('aria-expanded', 'false');
        };

        toggleButton.addEventListener('click', () => {
            const isOpen = !tabsPanel.classList.contains('hidden');
            if (isOpen) {
                closeTabsPanel();
                return;
            }

            tabsPanel.classList.remove('hidden');
            toggleButton.setAttribute('aria-expanded', 'true');
        });
        boundToggleButtons.add(toggleButton);
        toggleButton.dataset.sectionHeaderBound = 'true';
    };

    window.initSectionHeader();
})();
