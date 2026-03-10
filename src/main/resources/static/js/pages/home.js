let currentPage = 1;
let totalPages = 1;
window.boardFilters = {
    includeAds: localStorage.getItem('boardIncludeAds') === 'Y',
    hotFirst: localStorage.getItem('boardHotFirst') !== 'N'
};

function initHomePage() {
    console.log("=== initHomePage() 시작 ===");
    Auth.updateHeaderUI();
    bindLogoutButton();
    loadPosts(currentPage);
    setupEventListeners();
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

function setupEventListeners() {
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadPosts(currentPage));
    }

    bindFilterModal();
}

function bindFilterModal() {
    const filterBtn = document.getElementById('filter-btn');
    const filterModal = document.getElementById('filter-modal');
    const filterClose = document.getElementById('filter-close');
    const adSwitch = document.getElementById('ad-switch');
    const hotSwitch = document.getElementById('hot-switch');

    if (!filterBtn || !filterModal || !filterClose || !adSwitch || !hotSwitch) {
        return;
    }

    adSwitch.checked = !!window.boardFilters.includeAds;
    hotSwitch.checked = !!window.boardFilters.hotFirst;

    filterBtn.addEventListener('click', () => {
        filterModal.classList.remove('hidden');
    });

    filterClose.addEventListener('click', () => {
        filterModal.classList.add('hidden');
    });

    filterModal.addEventListener('click', (event) => {
        if (event.target === filterModal) {
            filterModal.classList.add('hidden');
        }
    });

    adSwitch.addEventListener('change', () => {
        window.boardFilters.includeAds = adSwitch.checked;
        localStorage.setItem('boardIncludeAds', adSwitch.checked ? 'Y' : 'N');
        loadPosts(currentPage);
    });

    hotSwitch.addEventListener('change', () => {
        window.boardFilters.hotFirst = hotSwitch.checked;
        localStorage.setItem('boardHotFirst', hotSwitch.checked ? 'Y' : 'N');
        loadPosts(currentPage);
    });
}

async function loadPosts(page = 1) {
    console.log("=== loadPosts() 시작, page:", page);
    
    const loading = document.getElementById('loading');
    const errorBanner = document.getElementById('error-banner');
    const postList = document.getElementById('post-list');
    const pagination = document.getElementById('pagination');
    const emptyState = document.getElementById('empty-state');

    console.log("DOM 요소들:", {
        loading: !!loading,
        errorBanner: !!errorBanner,
        postList: !!postList,
        pagination: !!pagination,
        emptyState: !!emptyState
    });

    try {
        showElement(loading);
        hideElement(errorBanner);
        hideElement(pagination);
        hideElement(emptyState);

        console.log("PostAPI.getPosts() 호출 시작...");
        const response = await PostAPI.getPosts({ page: page - 1, size: 10 });
        console.log("PostAPI 응답 타입:", typeof response);
        console.log("PostAPI 응답 데이터:", response);
        console.log("응답이 배열인가:", Array.isArray(response));
        
        let posts = [];
        if (Array.isArray(response)) {
            posts = response;
        } else if (response && Array.isArray(response.posts)) {
            posts = response.posts;
        } else if (response && response.content && Array.isArray(response.content)) {
            posts = response.content;
        }
        
        console.log("처리된 posts 배열:", posts);
        console.log("posts 길이:", posts.length);
        
        if (posts && posts.length > 0) {
            console.log("게시글 렌더링 시작...");
            renderPostList(posts, postList);
            
            currentPage = page;
            totalPages = response && typeof response.totalPages === 'number'
                ? response.totalPages
                : Math.ceil(posts.length / 10) || 1;
            
            if (totalPages > 1) {
                createPagination(currentPage, totalPages, handlePageChange, '#pagination');
            }
        } else {
            console.log("게시글 없음, emptyState 표시");
            if (emptyState) {
                showElement(emptyState);
            }
        }

    } catch (error) {
        console.error('loadPosts 에러:', error);
        console.error('에러 스택:', error.stack);
        
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = error.message || 'API 호출 중 오류가 발생했습니다.';
        }
        
        if (errorBanner) {
            showElement(errorBanner);
        }
        
    } finally {
        if (loading) {
            hideElement(loading);
        }
    }
}

function handlePageChange(page) {
    console.log("페이지 변경:", page);
    currentPage = page;
    loadPosts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}

console.log('Home.js loaded');
