let currentSearchKeyword = '';
let searchMode = false;

function initSearchBar() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput.value.trim();

    if (!keyword) {
        alert('검색어를 입력해주세요.');
        return;
    }

    currentSearchKeyword = keyword;
    searchMode = true;

    try {
        showLoading();
        
        const response = await APIClient.get(`/api/search/posts?keyword=${encodeURIComponent(keyword)}&page=0&size=20`);
        
        if (response && response.posts) {
            displaySearchResults(response);
            updateSearchUI(keyword, response.totalCount);
        } else {
            displayNoResults(keyword);
        }
        
    } catch (error) {
        console.error('검색 실패:', error);
        alert('검색 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

function displaySearchResults(response) {
    const container = document.getElementById('post-list');
    const paginationContainer = document.getElementById('pagination');
    
    if (!container) return;

    let html = `<div class="search-results-header">
        <h3>"${currentSearchKeyword}" 검색 결과 (총 ${response.totalCount}개)</h3>
    </div>`;

    if (response.posts.length > 0) {
        html += '<div class="posts-grid">';
        response.posts.forEach(post => {
            html += createSearchPostCard(post);
        });
        html += '</div>';
    } else {
        html += '<div class="no-results"><p>검색 결과가 없습니다.</p></div>';
    }

    container.innerHTML = html;
    
    if (paginationContainer && response.totalPages > 1) {
        renderSearchPagination(response);
    } else if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function createSearchPostCard(post) {
    const createdAt = new Date(post.createdAt).toLocaleDateString('ko-KR');
    const isAdminPost = post.isAdminPost ? '<span class="admin-badge">관리자</span>' : '';
    const titleClass = post.isAdminPost ? 'admin-post' : '';
    
    const highlightedTitle = highlightSearchTerm(post.title, currentSearchKeyword);
    const highlightedContent = highlightSearchTerm(
        post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content, 
        currentSearchKeyword
    );

    return `
        <div class="post-card ${titleClass}" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-title-container">
                    <h3 class="post-title">
                        <a href="/post-detail?id=${post.id}">${highlightedTitle}</a>
                    </h3>
                    ${isAdminPost}
                </div>
            </div>
            <div class="post-content">
                <p>${highlightedContent}</p>
            </div>
            <div class="post-meta">
                <div class="post-author">${sanitizeHTML(post.authorNickname)}</div>
                <div class="post-date">${createdAt}</div>
                <div class="post-stats">
                    <span class="like-count">❤️ ${post.likeCount || 0}</span>
                    <span class="comment-count">💬 ${post.commentCount || 0}</span>
                </div>
            </div>
        </div>
    `;
}

function highlightSearchTerm(text, keyword) {
    if (!keyword || !text) return text;
    
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderSearchPagination(response) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    let html = '<div class="pagination">';
    
    if (response.currentPage > 0) {
        html += `<button class="page-btn" onclick="searchPage(${response.currentPage - 1})">이전</button>`;
    }
    
    for (let i = 0; i < response.totalPages; i++) {
        const activeClass = i === response.currentPage ? 'active' : '';
        html += `<button class="page-btn ${activeClass}" onclick="searchPage(${i})">${i + 1}</button>`;
    }
    
    if (response.currentPage < response.totalPages - 1) {
        html += `<button class="page-btn" onclick="searchPage(${response.currentPage + 1})">다음</button>`;
    }
    
    html += '</div>';
    paginationContainer.innerHTML = html;
}

async function searchPage(page) {
    if (!currentSearchKeyword) return;

    try {
        showLoading();
        
        const response = await APIClient.get(`/api/search/posts?keyword=${encodeURIComponent(currentSearchKeyword)}&page=${page}&size=20`);
        
        if (response && response.posts) {
            displaySearchResults(response);
        }
        
    } catch (error) {
        console.error('페이지 로드 실패:', error);
        alert('페이지를 불러오는 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

function updateSearchUI(keyword, resultCount) {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        searchInput.value = keyword;
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'inline-block';
    }
    
    document.title = `"${keyword}" 검색 결과 - 미드나잇 맨즈`;
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    
    currentSearchKeyword = '';
    searchMode = false;
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    document.title = '미드나잇 맨즈';
    
    if (typeof loadPosts === 'function') {
        loadPosts(0);
    } else {
        location.reload();
    }
}

function displayNoResults(keyword) {
    const container = document.getElementById('post-list');
    const paginationContainer = document.getElementById('pagination');
    
    if (container) {
        container.innerHTML = `
            <div class="search-results-header">
                <h3>"${keyword}" 검색 결과 (총 0개)</h3>
            </div>
            <div class="no-results">
                <p>검색 결과가 없습니다.</p>
                <p>다른 검색어로 시도해보세요.</p>
            </div>
        `;
    }
    
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading() {
    const container = document.getElementById('post-list');
    if (container) {
        container.innerHTML = '<div class="loading-spinner"><p>검색 중...</p></div>';
    }
}

function hideLoading() {
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchBar);
} else {
    initSearchBar();
}