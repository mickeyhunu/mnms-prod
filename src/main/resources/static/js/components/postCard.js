function renderPostList(posts, container) {
    if (!container) return;
    
    let html = '<div class="post-list">';
    
    posts.forEach(post => {
        html += createPostCard(post);
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    attachPostCardEvents(container);
}

function createPostCard(post) {
    const user = Auth.getUser();
    const isLoggedIn = !!user;
    const isAuthor = isLoggedIn && user.id === post.authorId;
    const isAdmin = post.isAdminPost || post.adminPost;
    const cardClass = isAdmin ? 'post-card admin-notice' : 'post-card';
    const titlePrefix = isAdmin ? '📌 [공지] ' : '';
    
    return `
        <div class="${cardClass}" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">
                        <a href="/post-detail?id=${post.id}" onclick="handlePostClick(${post.id}); return false;">${titlePrefix}${sanitizeHTML(post.title)}</a>
                    </h3>
                    <div class="post-meta">
                        <span class="post-author">${sanitizeHTML(post.authorNickname || '작성자 #' + post.authorId)}</span>
                        <span class="post-date">${formatDate(post.createdAt)}</span>
                        <span class="post-stats">
                            <span class="like-count">👍 ${post.likeCount || 0}</span>
                            <span class="comment-count">💬 ${post.commentCount || 0}</span>
                        </span>
                    </div>
                </div>
                ${isLoggedIn ? `
                    <div class="post-header-right">
                        <button class="bookmark-btn-mini ${post.isBookmarked ? 'bookmarked' : ''}" onclick="handlePostBookmark(${post.id})" data-post-id="${post.id}" title="${post.isBookmarked ? '북마크 해제' : '북마크 추가'}">
                            <span class="bookmark-icon">${post.isBookmarked ? '★' : '☆'}</span>
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="post-content">
                ${sanitizeHTML(truncateText(post.content, 150))}
            </div>
            ${post.imageUrls && post.imageUrls.length > 0 ? createImagePreview(post.imageUrls) : ''}
            <div class="post-actions">
                ${isLoggedIn ? `
                    <button class="btn btn-sm btn-outline like-btn" onclick="handlePostLike(${post.id})" ${post.isLiked ? 'data-liked="true"' : ''}>
                        ${post.isLiked ? '❤️' : '🤍'} ${post.likeCount || 0}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function handlePostClick(postId) {
    console.log("게시글 클릭:", postId);
    window.location.href = `/post-detail?id=${postId}`;
}

function createImagePreview(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return '';
    
    const maxPreview = 3;
    const previewUrls = imageUrls.slice(0, maxPreview);
    const remainingCount = imageUrls.length - maxPreview;
    
    let html = '<div class="post-images">';
    
    previewUrls.forEach((url, index) => {
        html += `<img src="${sanitizeHTML(url)}" alt="게시글 이미지 ${index + 1}" class="post-image-preview" loading="lazy">`;
    });
    
    if (remainingCount > 0) {
        html += `<div class="more-images">+${remainingCount}개 더</div>`;
    }
    
    html += '</div>';
    return html;
}

function attachPostCardEvents(container) {
    const postCards = container.querySelectorAll('.post-card');
    
    postCards.forEach(card => {
        const titleLink = card.querySelector('.post-title a');
        if (titleLink) {
            titleLink.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = card.dataset.postId;
                window.location.href = `/post-detail?id=${postId}`;
            });
        }
    });
}

async function handlePostLike(postId) {
    if (!Auth.isAuthenticated()) {
        showNotification('로그인이 필요합니다.', 'warning');
        return;
    }
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-btn`);
        const likeCountSpan = document.querySelector(`[data-post-id="${postId}"] .like-count`);
        
        if (likeBtn && response) {
            if (response.isLiked) {
                likeBtn.setAttribute('data-liked', 'true');
                likeBtn.innerHTML = `❤️ ${response.likeCount}`;
            } else {
                likeBtn.removeAttribute('data-liked');
                likeBtn.innerHTML = `🤍 ${response.likeCount}`;
            }
            
            if (likeCountSpan) {
                likeCountSpan.textContent = `👍 ${response.likeCount}`;
            }
        }
        
    } catch (error) {
        console.error('Like toggle error:', error);
        showNotification('좋아요 처리 중 오류가 발생했습니다.', 'error');
    }
}

async function handlePostBookmark(postId) {
    if (!Auth.isAuthenticated()) {
        showNotification('로그인이 필요합니다.', 'warning');
        return;
    }
    
    const bookmarkBtn = document.querySelector(`[data-post-id="${postId}"] .bookmark-btn-mini`);
    if (!bookmarkBtn) return;
    
    const isBookmarked = bookmarkBtn.classList.contains('bookmarked');
    const icon = bookmarkBtn.querySelector('.bookmark-icon');
    
    bookmarkBtn.classList.add('loading');
    
    try {
        const response = await APIClient.post(`/posts/${postId}/bookmark`);
        
        if (response.isBookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.setAttribute('title', '북마크 해제');
            icon.textContent = '★';
            showNotification('북마크에 추가되었습니다.', 'success');
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkBtn.setAttribute('title', '북마크 추가');
            icon.textContent = '☆';
            showNotification('북마크가 해제되었습니다.', 'info');
        }
        
    } catch (error) {
        console.error('Bookmark toggle error:', error);
        showNotification('북마크 처리 중 오류가 발생했습니다.', 'error');
    } finally {
        bookmarkBtn.classList.remove('loading');
    }
}

async function handlePostDelete(postId) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await PostAPI.deletePost(postId);
        showNotification('게시글이 삭제되었습니다.', 'success');
        
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            postCard.remove();
        }
        
    } catch (error) {
        console.error('Post delete error:', error);
        showNotification('게시글 삭제 중 오류가 발생했습니다.', 'error');
    }
}

function navigateToPost(postId) {
    window.location.href = `/post-detail?id=${postId}`;
}

async function toggleLike(postId, event) {
    event.stopPropagation();
    
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const button = event.currentTarget;
        const icon = button.querySelector('.action-icon');
        const likeCountElements = document.querySelectorAll(`[data-post-id="${postId}"] .stat-count`);
        
        if (response.isLiked) {
            button.classList.remove('btn-outline');
            button.classList.add('btn-primary');
            icon.textContent = '❤️';
        } else {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline');
            icon.textContent = '🤍';
        }
        
        likeCountElements.forEach(element => {
            if (element.previousElementSibling && element.previousElementSibling.textContent === '👍') {
                element.textContent = response.likeCount;
            }
        });
        
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function toggleBookmark(postId, event) {
    event.stopPropagation();
    
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await APIClient.post(`/bookmarks/${postId}/toggle`);
        
        const button = event.currentTarget;
        const icon = button.querySelector('.action-icon');
        
        if (response.isBookmarked) {
            button.classList.remove('btn-outline');
            button.classList.add('btn-warning');
            icon.textContent = '⭐';
            showNotification('북마크에 추가되었습니다.', 'success');
        } else {
            button.classList.remove('btn-warning');
            button.classList.add('btn-outline');
            icon.textContent = '☆';
            showNotification('북마크가 해제되었습니다.', 'info');
        }
        
    } catch (error) {
        console.error('북마크 토글 실패:', error);
        Auth.handleAuthError(error);
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

console.log('PostCard loaded');