let postId = null;
let currentCommentsPage = 1;
let currentPostAuthor = null;
let selectedMessageRecipient = null;
let replyingTo = null;

function initPostDetailPage() {
    const urlParams = getURLParams();
    postId = urlParams.id;
    if (!postId) {
        const pathParts = window.location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !isNaN(lastPart)) {
            postId = lastPart;
        }
    }

    if (!postId) {
        showError('게시글 ID를 찾을 수 없습니다.');
        return;
    }

    loadPost();
    setupEventListeners();
}

function setupEventListeners() {
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadPost());
    }
    
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeletePost);
    }
    
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', handleToggleLike);
    }
    
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', handleToggleBookmark);
    }
    
    const commentForm = document.getElementById('comment-create-form');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCreateComment);
    }

    setupMessageModal();
}

function setupMessageModal() {
    const messageBtn = document.getElementById('message-btn');
    if (messageBtn) {
        messageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleOpenMessageModal(currentPostAuthor);
        });
    }

    const messageModal = document.getElementById('message-modal');
    const messageCancelBtn = document.getElementById('message-cancel-btn');
    const messageSendBtn = document.getElementById('message-send-btn');

    if (messageCancelBtn) {
        messageCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleCloseMessageModal();
        });
    }

    if (messageSendBtn) {
        messageSendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSendMessage();
        });
    }

    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                handleCloseMessageModal();
            }
        });
    }
}

function handleOpenMessageModal(recipient) {
    if (!recipient || !recipient.nickname) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
    }

    selectedMessageRecipient = recipient;

    const modal = document.getElementById('message-modal');
    const recipientInput = document.getElementById('message-recipient');
    const contentTextarea = document.getElementById('message-content');

    if (recipientInput) {
        recipientInput.value = recipient.nickname;
    }

    if (contentTextarea) {
        contentTextarea.value = '';
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        if (contentTextarea) {
            setTimeout(() => contentTextarea.focus(), 100);
        }
    }
}

function handleCloseMessageModal() {
    const modal = document.getElementById('message-modal');
    const contentTextarea = document.getElementById('message-content');

    selectedMessageRecipient = null;

    if (contentTextarea) {
        contentTextarea.value = '';
    }

    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function handleSendMessage() {
    const contentTextarea = document.getElementById('message-content');
    const sendBtn = document.getElementById('message-send-btn');

    const content = contentTextarea.value.trim();

    if (!content) {
        alert('쪽지 내용을 입력해주세요.');
        contentTextarea.focus();
        return;
    }

    if (!selectedMessageRecipient || !selectedMessageRecipient.id) {
        alert('받는 사람 정보를 찾을 수 없습니다.');
        return;
    }

    try {
        sendBtn.disabled = true;
        sendBtn.textContent = '전송중...';

        if (typeof MessageAPI !== 'undefined') {
            await MessageAPI.sendMessage(selectedMessageRecipient.id, content);
            
            if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isMessageNotificationEnabled()) {
                showNotification('쪽지가 전송되었습니다.', 'message');
            } else {
                alert('쪽지가 전송되었습니다.');
            }
            
            handleCloseMessageModal();
        } else {
            alert('MessageAPI가 로드되지 않았습니다.');
        }

    } catch (error) {
        console.error('쪽지 전송 실패:', error);
        alert('쪽지 전송에 실패했습니다.');

    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '전송';
    }
}

function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');

    if (loading) loading.classList.add('hidden');
    if (errorMessage) errorMessage.textContent = message;
    if (errorBanner) errorBanner.classList.remove('hidden');
}

async function loadPost() {
    const loading = document.getElementById('loading');
    const errorBanner = document.getElementById('error-banner');
    const postDetail = document.getElementById('post-detail');
    const commentsSection = document.getElementById('comments-section');

    try {
        if (loading) loading.classList.remove('hidden');
        if (errorBanner) errorBanner.classList.add('hidden');

        const response = await PostAPI.getPost(postId);
        
        renderPostDetail(response);

        if (loading) loading.classList.add('hidden');
        if (postDetail) postDetail.classList.remove('hidden');
        if (commentsSection) commentsSection.classList.remove('hidden');

        if (Auth.isAuthenticated()) {
            const commentForm = document.getElementById('comment-form');
            if (commentForm) commentForm.classList.remove('hidden');
        }

        loadComments();

    } catch (error) {
        console.error('게시글 로드 실패:', error);
        if (loading) loading.classList.add('hidden');
        showError('게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

function renderPostDetail(post) {
    const titleElement = document.getElementById('post-title');
    const contentElement = document.getElementById('post-content');
    const authorElement = document.getElementById('post-author');
    const dateElement = document.getElementById('post-date');

    if (titleElement) titleElement.textContent = post.title || '';
    if (contentElement) {
        contentElement.innerHTML = (post.content || '').replace(/\n/g, '<br>');
    }
    if (authorElement) authorElement.textContent = post.authorNickname || '';
    if (dateElement) dateElement.textContent = formatDateTime(post.createdAt) || '';

    currentPostAuthor = {
        id: post.authorId,
        nickname: post.authorNickname
    };

    console.log('게시글 데이터:', post);
    console.log('isAuthor:', post.isAuthor);

    const messageBtn = document.getElementById('message-btn');
    const ownerActions = document.getElementById('post-owner-actions');
    const editBtn = document.getElementById('edit-btn');

    if (post.isAuthor) {
        console.log('작성자임 - 수정/삭제 버튼 표시');
        if (messageBtn) messageBtn.style.display = 'none';
        if (ownerActions) ownerActions.classList.remove('hidden');
        if (editBtn) editBtn.href = `edit-post.html?id=${post.id}`;
    } else {
        console.log('작성자 아님 - 쪽지 버튼 표시');
        if (ownerActions) ownerActions.classList.add('hidden');
        if (messageBtn && Auth.isAuthenticated()) {
            messageBtn.style.display = 'inline-block';
        }
    }

    if (post.imageUrls && post.imageUrls.length > 0) {
        renderPostImages(post.imageUrls);
    }

    const likeBtn = document.getElementById('like-btn');
    const likeIcon = document.getElementById('like-icon');
    const likeCount = document.getElementById('like-count');
    
    if (likeBtn && likeIcon && likeCount) {
        likeBtn.className = post.isLiked ? 'like-btn liked' : 'like-btn';
        likeIcon.textContent = post.isLiked ? '❤️' : '🤍';
        likeCount.textContent = post.likeCount;
    }

    const bookmarkBtn = document.getElementById('bookmark-btn');
    const bookmarkIcon = document.getElementById('bookmark-icon');
    
    if (bookmarkBtn && bookmarkIcon) {
        bookmarkBtn.className = post.isBookmarked ? 'bookmark-btn bookmarked' : 'bookmark-btn';
        bookmarkIcon.textContent = post.isBookmarked ? '🔖' : '📑';
    }
}

function renderPostImages(imageUrls) {
    const imagesContainer = document.getElementById('post-images');
    const imagesGrid = document.getElementById('images-grid');

    if (!imagesContainer || !imagesGrid || !imageUrls || imageUrls.length === 0) {
        return;
    }

    imagesGrid.className = 'images-grid';
    if (imageUrls.length === 1) {
        imagesGrid.classList.add('single-image');
    } else if (imageUrls.length === 2) {
        imagesGrid.classList.add('two-images');
    } else if (imageUrls.length === 3) {
        imagesGrid.classList.add('three-images');
    } else {
        imagesGrid.classList.add('many-images');
    }

    let html = '';
    imageUrls.forEach((url, index) => {
        const cleanUrl = url.trim();
        html += `
            <div class="image-item ${imageUrls.length === 1 ? 'single' : ''}" onclick="showImageModal(${JSON.stringify(imageUrls)}, ${index})">
                <img src="${cleanUrl}" alt="게시글 이미지 ${index + 1}" loading="lazy" 
                     onerror="this.parentElement.style.display='none'" 
                     onload="this.style.opacity='1'">
                <div class="image-overlay">
                    <span>🔍</span>
                </div>
            </div>
        `;
    });

    imagesGrid.innerHTML = html;
    imagesContainer.classList.remove('hidden');
}

async function loadComments() {
    try {
        const response = await CommentAPI.getComments(postId, currentCommentsPage);
        
        const commentCount = document.getElementById('comment-count');
        if (commentCount) {
            commentCount.textContent = response.totalElements || 0;
        }
        
        renderComments(response.comments || []);
        
    } catch (error) {
        console.error('댓글 로드 실패:', error);
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">아직 댓글이 없습니다.</p>';
        return;
    }
    
    const commentsTree = buildCommentsTree(comments);
    commentsTree.forEach(comment => {
        const commentItem = createCommentItem(comment);
        commentsList.appendChild(commentItem);
    });
}

function buildCommentsTree(comments) {
    const commentMap = new Map();
    const rootComments = [];
    
    comments.forEach(comment => {
        comment.children = [];
        commentMap.set(comment.id, comment);
    });
    
    comments.forEach(comment => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
            commentMap.get(comment.parentId).children.push(comment);
        } else {
            rootComments.push(comment);
        }
    });
    
    return rootComments;
}

function createCommentItem(comment, depth = 0) {
    const div = document.createElement('div');
    div.className = `comment-item ${depth > 0 ? 'reply' : ''}`;
    div.setAttribute('data-depth', depth);
    
    const currentUser = Auth.getUser();
    
    const isAuthor = currentUser && (
        currentUser.id == comment.authorId ||
        String(currentUser.id) === String(comment.authorId) || 
        Number(currentUser.id) === Number(comment.authorId)
    );
    
    const isAdminComment = comment.authorRole === 'admin' || 
                          comment.authorRole === 'ADMIN' || 
                          comment.role === 'admin' || 
                          comment.role === 'ADMIN';
    const canReply = Auth.isAuthenticated() && depth < 3;
    const isOtherUser = Auth.isAuthenticated() && currentUser && !isAuthor;
    
    console.log(`댓글 ${comment.id}: user=${currentUser?.id}, author=${comment.authorId}, isAuthor=${isAuthor}, isAdmin=${isAdminComment}`);
    
    div.innerHTML = `
        <div class="comment-meta">
            <div>
                <span class="comment-author ${isAdminComment ? 'admin-comment-author' : ''}">${sanitizeHTML(comment.authorNickname)}</span>
                <span class="comment-date">${formatDateTime(comment.createdAt)}</span>
            </div>
            <div class="comment-meta-actions">
                ${isOtherUser ? 
                    `<button class="btn btn-sm btn-outline-primary comment-message-btn" onclick="openCommentMessageModal(${comment.authorId}, '${sanitizeHTML(comment.authorNickname)}')">쪽지</button>` 
                    : ''
                }
                ${canReply ? 
                    `<button class="btn btn-sm btn-outline-secondary reply-btn" onclick="showReplyForm(${comment.id}, '${sanitizeHTML(comment.authorNickname)}')">답글</button>`
                    : ''
                }
            </div>
        </div>
        <div class="comment-content ${isAdminComment ? 'admin-comment-content' : ''}">${sanitizeHTML(comment.content).replace(/\n/g, '<br>')}</div>
        ${isAuthor ? `
            <div class="comment-actions">
                <button class="btn btn-sm btn-warning" onclick="editComment(${comment.id})">수정</button>
                <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">삭제</button>
            </div>
        ` : ''}
        <div id="reply-form-${comment.id}" class="reply-form-container" style="display: none;">
            <form class="reply-form" onsubmit="handleReplySubmit(event, ${comment.id})">
                <div class="reply-input-container">
                    <textarea id="reply-content-${comment.id}" placeholder="답글을 작성하세요..." required rows="3"></textarea>
                </div>
                <div class="reply-form-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${comment.id})">취소</button>
                    <button type="submit" class="btn btn-sm btn-primary">답글 작성</button>
                </div>
            </form>
        </div>
        <div id="replies-${comment.id}" class="replies-container"></div>
    `;
    
    if (comment.children && comment.children.length > 0) {
        const repliesContainer = div.querySelector(`#replies-${comment.id}`);
        comment.children.forEach(reply => {
            const replyItem = createCommentItem(reply, depth + 1);
            repliesContainer.appendChild(replyItem);
        });
    }
    
    return div;
}

function showReplyForm(parentId, parentAuthor) {
    hideAllReplyForms();
    
    const replyForm = document.getElementById(`reply-form-${parentId}`);
    const textarea = document.getElementById(`reply-content-${parentId}`);
    
    if (replyForm && textarea) {
        replyForm.style.display = 'block';
        textarea.focus();
        replyingTo = { id: parentId, author: parentAuthor };
        
        const replyIndicator = document.createElement('div');
        replyIndicator.className = 'reply-indicator';
        replyIndicator.innerHTML = `
            <small class="text-muted">
                ${parentAuthor}님에게 답글 작성 중
                <button type="button" onclick="hideReplyForm(${parentId})" class="btn-close-small">×</button>
            </small>
        `;
        
        replyForm.insertBefore(replyIndicator, replyForm.firstChild);
    }
}

function hideReplyForm(parentId) {
    const replyForm = document.getElementById(`reply-form-${parentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        const textarea = document.getElementById(`reply-content-${parentId}`);
        if (textarea) {
            textarea.value = '';
        }
        const indicator = replyForm.querySelector('.reply-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    replyingTo = null;
}

function hideAllReplyForms() {
    const replyForms = document.querySelectorAll('.reply-form-container');
    replyForms.forEach(form => {
        form.style.display = 'none';
        const textarea = form.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
        }
        const indicator = form.querySelector('.reply-indicator');
        if (indicator) {
            indicator.remove();
        }
    });
    replyingTo = null;
}

async function handleReplySubmit(e, parentId) {
    e.preventDefault();
    
    if (!Auth.requireAuth()) return;
    
    const textarea = document.getElementById(`reply-content-${parentId}`);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const content = textarea.value.trim();
    
    if (!content) {
        addInputError(textarea, '답글 내용을 입력해주세요');
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        
        await CommentAPI.createComment(postId, { 
            content: content,
            parentId: parentId
        });
        
        if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isCommentNotificationEnabled()) {
            showNotification('답글이 작성되었습니다.', 'comment');
        } else {
            showNotification('답글이 작성되었습니다.', 'success');
        }
        
        hideReplyForm(parentId);
        loadComments();
        
    } catch (error) {
        console.error('답글 작성 실패:', error);
        showNotification('답글 작성에 실패했습니다.', 'error');
        Auth.handleAuthError(error);
        
    } finally {
        setLoading(submitBtn, false);
    }
}

function openCommentMessageModal(authorId, authorNickname) {
    const recipient = {
        id: authorId,
        nickname: authorNickname
    };
    
    handleOpenMessageModal(recipient);
}

async function handleToggleLike() {
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = document.getElementById('like-icon');
        const likeCount = document.getElementById('like-count');
        
        if (likeBtn && likeIcon && likeCount) {
            likeBtn.className = response.isLiked ? 'like-btn liked' : 'like-btn';
            likeIcon.textContent = response.isLiked ? '❤️' : '🤍';
            likeCount.textContent = response.likeCount;
        }
        
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function handleToggleBookmark() {
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await PostAPI.toggleBookmark(postId);
        
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const bookmarkIcon = document.getElementById('bookmark-icon');
        
        if (bookmarkBtn && bookmarkIcon) {
            bookmarkBtn.className = response.isBookmarked ? 'bookmark-btn bookmarked' : 'bookmark-btn';
            bookmarkIcon.textContent = response.isBookmarked ? '🔖' : '📑';
        }
        
        const message = response.isBookmarked ? '북마크에 추가되었습니다.' : '북마크에서 제거되었습니다.';
        showNotification(message, 'success');
        
    } catch (error) {
        console.error('북마크 토글 실패:', error);
        showNotification('북마크 처리에 실패했습니다.', 'error');
        Auth.handleAuthError(error);
    }
}

async function handleCreateComment(e) {
    e.preventDefault();
    
    if (!Auth.requireAuth()) return;
    
    const form = e.target;
    const submitBtn = document.getElementById('comment-submit-btn');
    const contentTextarea = document.getElementById('comment-content');
    
    const content = contentTextarea.value.trim();
    
    if (!content) {
        addInputError(contentTextarea, '댓글 내용을 입력해주세요');
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        
        await CommentAPI.createComment(postId, { content });
        
        if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isCommentNotificationEnabled()) {
            showNotification('댓글이 작성되었습니다.', 'comment');
        } else {
            showNotification('댓글이 작성되었습니다.', 'success');
        }
        
        form.reset();
        removeInputError(contentTextarea);
        
        loadComments();
        
    } catch (error) {
        console.error('댓글 작성 실패:', error);
        showNotification('댓글 작성에 실패했습니다.', 'error');
        Auth.handleAuthError(error);
        
    } finally {
        setLoading(submitBtn, false);
    }
}

async function handleDeletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await PostAPI.deletePost(postId);
        
        showNotification('게시글이 삭제되었습니다.', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('게시글 삭제 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function deleteComment(commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await CommentAPI.deleteComment(commentId);
        
        showNotification('댓글이 삭제되었습니다.', 'success');
        
        loadComments();
        
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function editComment(commentId) {
    console.log('댓글 수정 기능 - 구현 예정:', commentId);
    showNotification('댓글 수정 기능은 아직 구현되지 않았습니다.', 'info');
}

function addInputError(element, message) {
    removeInputError(element);
    
    if (element) {
        element.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.textContent = message;
        
        element.parentElement.appendChild(errorDiv);
    }
}

function removeInputError(element) {
    if (element) {
        element.classList.remove('error');
        
        const errorDiv = element.parentElement.querySelector('.input-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

function setLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = '처리중...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || '작성';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        background-color: ${type === 'success' ? '#28a745' : 
                          type === 'error' ? '#dc3545' : 
                          type === 'comment' ? '#17a2b8' :
                          type === 'message' ? '#6f42c1' : '#007bff'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 30) return `${diffDays}일 전`;
        
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

function getURLParams() {
    const params = {};
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    return params;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostDetailPage);
} else {
    initPostDetailPage();
}