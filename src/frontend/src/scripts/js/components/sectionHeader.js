(function initSectionHeaderMenu() {
    const tabsPanel = document.getElementById('board-tabs-panel');
    const toggleButton = document.getElementById('board-menu-toggle');

    if (!tabsPanel || !toggleButton) {
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

    document.addEventListener('click', (event) => {
        if (tabsPanel.classList.contains('hidden')) {
            return;
        }
        if (tabsPanel.contains(event.target) || toggleButton.contains(event.target)) {
            return;
        }

        closeTabsPanel();
    });
})();
