/**
 * 파일 역할: postDetail 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let postId = null;
let currentCommentsPage = 1;
let currentPostAuthor = null;
let currentPostBoardType = '';
let selectedMessageRecipient = null;
let replyingTo = null;
let activeCommentActionId = null;
const likedCommentIds = new Set();

function initPostDetailPage() {
    if (typeof Auth !== 'undefined') {
        Auth.updateHeaderUI();
    }

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

    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', handleEditPost);
    }
    
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', handleToggleLike);
    }
        
    const commentForm = document.getElementById('comment-create-form');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCreateComment);
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
            window.location.href = '/';
        });
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleSharePost);
    }

    const moreBtn = document.getElementById('post-more-btn');
    if (moreBtn) {
        moreBtn.addEventListener('click', togglePostMoreMenu);
    }

    const reportBtn = document.getElementById('report-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', reportPost);
    }

    document.addEventListener('click', (e) => {
        const moreWrapper = document.querySelector('.post-more-wrapper');
        const menu = document.getElementById('post-more-menu');
        if (!moreWrapper || !menu) return;
        if (!moreWrapper.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.comment-actions-wrapper')) {
            return;
        }
        hideActiveCommentActionMenu();
    });

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
        const normalizedPost = normalizePostDetailResponse(response);

        renderPostDetail(normalizedPost);

        if (loading) loading.classList.add('hidden');
        if (postDetail) postDetail.classList.remove('hidden');
        if (commentsSection) commentsSection.classList.remove('hidden');

        const commentForm = document.getElementById('comment-form');
        if (commentForm) commentForm.classList.remove('hidden');

        loadComments();

    } catch (error) {
        console.error('게시글 로드 실패:', error);
        if (loading) loading.classList.add('hidden');
        showError('게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

function normalizePostDetailResponse(post) {
    const normalizedImageUrls = Array.isArray(post.imageUrls)
        ? post.imageUrls
        : post.imageUrl
            ? [post.imageUrl]
            : [];

    const authorLevelRaw = post.authorLevel ?? post.level ?? post.authorRank ?? post.rank ?? post.authorGrade ?? post.grade;
    const authorLevel = Number(authorLevelRaw);

    return {
        ...post,
        id: post.id,
        authorId: post.authorId ?? post.userId,
        imageUrls: normalizedImageUrls,
        authorLevel: Number.isFinite(authorLevel) && authorLevel > 0 ? authorLevel : null,
        isAuthor: Boolean(post.isAuthor),
        isLiked: Boolean(post.isLiked)
    };
}

function isCurrentUserPostAuthor(post) {
    const currentUser = Auth.getUser();
    if (!currentUser) {
        return false;
    }

    const postAuthorId = post.authorId ?? post.userId;
    if (!postAuthorId) {
        return false;
    }

    return String(currentUser.id) === String(postAuthorId);
}


function renderPostDetail(post) {
    const titleElement = document.getElementById('post-title');
    const contentElement = document.getElementById('post-content');
    const authorElement = document.getElementById('post-author');
    const dateElement = document.getElementById('post-date');

    const boardNameMap = { FREE: '자유게시판', ANON: '익명게시판', REVIEW: '후기게시판', STORY: '썰게시판', QUESTION: '질문게시판' };
    const boardTagMap = { FREE: '자유', ANON: '익명', REVIEW: '후기', STORY: '썰', QUESTION: '질문' };
    const boardType = String(post.boardType || '').toUpperCase();
    currentPostBoardType = boardType;
    const isCurrentAuthor = post.isAuthor || isCurrentUserPostAuthor(post);
    const postAuthorLabel = boardType === 'ANON'
        ? `익명${isCurrentAuthor ? ' (본인)' : ''}`
        : (post.authorNickname || '');

    if (titleElement) titleElement.textContent = `[${boardTagMap[boardType] || '자유'}] ${post.title || ''}`;
    if (contentElement) {
        contentElement.innerHTML = (post.content || '').replace(/\n/g, '<br>');
    }
    const boardNameEl = document.getElementById('post-board-name');
    if (boardNameEl) boardNameEl.textContent = boardNameMap[boardType] || '게시판';

    if (authorElement) authorElement.textContent = postAuthorLabel;
    if (dateElement) dateElement.textContent = formatDateTime(post.createdAt) || '';

    const levelElement = document.getElementById('post-author-level');
    if (levelElement) {
        const hasLevel = Number.isFinite(post.authorLevel) && post.authorLevel > 0;
        if (hasLevel) {
            levelElement.textContent = post.authorLevel;
            levelElement.classList.remove('hidden');
        } else {
            levelElement.textContent = '';
            levelElement.classList.add('hidden');
        }
    }

    currentPostAuthor = {
        id: post.authorId ?? post.userId,
        nickname: post.authorNickname
    };

    console.log('게시글 데이터:', post);
    console.log('isAuthor:', post.isAuthor);

    const messageBtn = document.getElementById('message-btn');
    const ownerActions = document.getElementById('post-owner-actions');
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const reportBtn = document.getElementById('report-btn');
    const isGuestPost = !post.authorId && !post.userId;
    if (isCurrentAuthor || isGuestPost) {
        console.log('작성자임 - 수정/삭제 버튼 표시');
        if (messageBtn) messageBtn.style.display = 'none';
        if (ownerActions) ownerActions.classList.remove('hidden');
        if (editBtn) editBtn.classList.remove('hidden');
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        if (reportBtn) reportBtn.classList.add('hidden');
    } else {
        console.log('작성자 아님 - 쪽지 버튼 표시');
        if (ownerActions) ownerActions.classList.add('hidden');
        if (messageBtn && Auth.isAuthenticated()) {
            messageBtn.style.display = 'inline-block';
        }
        if (editBtn) editBtn.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        if (reportBtn) reportBtn.classList.remove('hidden');
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

    const viewCount = document.getElementById('view-count');
    if (viewCount) {
        viewCount.textContent = `조회수 ${post.viewCount || 0}`;
    }
}

function togglePostMoreMenu() {
    const menu = document.getElementById('post-more-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

async function handleSharePost() {
    const shareData = {
        title: document.getElementById('post-title')?.textContent || '게시글',
        text: '게시글을 공유합니다.',
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(window.location.href);
            alert('게시글 링크가 복사되었습니다.');
            return;
        }
    } catch (error) {
        console.error('공유 실패:', error);
    }

    prompt('아래 링크를 복사하세요.', window.location.href);
}

function reportPost() {
    if (!Auth.requireAuth()) return;

    const confirmed = confirm('이 게시글을 신고하시겠습니까?');
    if (!confirmed) return;

    showNotification('게시글 신고가 접수되었습니다.', 'success');
    const menu = document.getElementById('post-more-menu');
    if (menu) {
        menu.classList.add('hidden');
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
        const comments = Array.isArray(response)
            ? response
            : response.comments || response.content || [];
        const totalElements = response.totalElements ?? comments.length;
        
        const commentCount = document.getElementById('comment-count');
        if (commentCount) {
            commentCount.textContent = totalElements;
        }
        
        renderComments(comments);
        
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
        currentUser.id == (comment.authorId ?? comment.userId) ||
        String(currentUser.id) === String(comment.authorId ?? comment.userId) || 
        Number(currentUser.id) === Number(comment.authorId ?? comment.userId)
    );
    
    const isAdminComment = comment.authorRole === 'admin' || 
                          comment.authorRole === 'ADMIN' || 
                          comment.role === 'admin' || 
                          comment.role === 'ADMIN';
    const isSecretComment = Boolean(comment.isSecret);
    const isDeletedComment = Boolean(comment.isDeleted);
    const isAnonymousComment = currentPostBoardType === 'ANON' || String(comment.authorNickname || '').trim() === '익명';
    const showOwnBadge = isAuthor && (isAnonymousComment || isSecretComment);
    const authorName = sanitizeHTML(comment.authorNickname || '익명');
    const canReplyByServer = comment.canReply !== false;
    const canReply = Auth.isAuthenticated() && depth < 3 && !isDeletedComment && canReplyByServer;
    const canGuestEdit = !Auth.isAuthenticated() && !comment.userId;
    const isOtherUser = Auth.isAuthenticated() && currentUser && !isAuthor;
    const hasActionMenu = !isDeletedComment && (isAuthor || canGuestEdit || isOtherUser);
    const isCommentLiked = likedCommentIds.has(comment.id);
    const replyMarker = depth > 0 ? '<span class="comment-reply-marker" aria-hidden="true"></span>' : '';
    
    console.log(`댓글 ${comment.id}: user=${currentUser?.id}, author=${comment.authorId}, isAuthor=${isAuthor}, isAdmin=${isAdminComment}`);
    
    div.innerHTML = `
        <div class="comment-layout">
            ${replyMarker}
            <span class="comment-avatar" aria-hidden="true"></span>
            <div class="comment-body">
                <div class="comment-meta">
                    <div class="comment-meta-main">
                        <span class="comment-author ${isAdminComment ? 'admin-comment-author' : ''}">${authorName}</span>
                        ${showOwnBadge ? '<span class="own-content-badge">본인</span>' : ''}
                        ${isSecretComment ? '<span style="margin-left:6px;font-size:12px;color:#7a5;">🔒 비밀댓글</span>' : ''}
                        ${isDeletedComment ? '<span style="margin-left:6px;font-size:12px;color:#999;">삭제됨</span>' : ''}
                    </div>
                    <div class="comment-meta-actions">
                        ${isOtherUser ? `<button class="comment-action-icon-btn comment-like-toggle ${isCommentLiked ? 'liked' : ''}" type="button" title="댓글 좋아요" aria-label="댓글 좋아요" onclick="toggleCommentLike(${comment.id}, this)">${isCommentLiked ? '♥' : '♡'}</button>` : ''}
                        ${hasActionMenu ? `
                            <div class="comment-actions-wrapper">
                                <button class="comment-more-btn" type="button" aria-label="댓글 더보기" onclick="toggleCommentActions(${comment.id})">⋯</button>
                                <div class="comment-actions-menu hidden" id="comment-actions-${comment.id}">
                                    ${(isAuthor || canGuestEdit) ? `
                                        <button class="comment-action-menu-btn" type="button" onclick="showCommentEditForm(${comment.id})">수정</button>
                                        <button class="comment-action-menu-btn danger" type="button" onclick="deleteComment(${comment.id})">삭제</button>
                                    ` : ''}
                                    ${isOtherUser ? `<button class="comment-action-menu-btn danger" type="button" onclick="reportComment(${comment.id})">신고</button>` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="comment-content ${isAdminComment ? 'admin-comment-content' : ''}" id="comment-content-${comment.id}">${sanitizeHTML(comment.content).replace(/\n/g, '<br>')}</div>
                <div class="comment-footer">
                    <span class="comment-date">${formatDateTime(comment.createdAt)}</span>
                    ${canReply ? `<button class="comment-reply-link" onclick="showReplyForm(${comment.id}, '${sanitizeHTML(comment.authorNickname)}')">답글쓰기</button>` : ''}
                </div>
            </div>
        </div>
        <div id="reply-form-${comment.id}" class="reply-form-container" style="display: none;">
            <form class="reply-form" onsubmit="handleReplySubmit(event, ${comment.id})">
                <div class="reply-input-container">
                    <textarea id="reply-content-${comment.id}" placeholder="답글을 작성하세요..." required rows="3"></textarea>
                </div>
                <div class="reply-form-actions">
                    <button type="submit" class="btn btn-sm btn-primary">등록</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${comment.id})">취소</button>
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


function showCommentEditForm(commentId) {
    hideAllReplyForms();

    const container = document.getElementById(`reply-form-${commentId}`);
    const contentElement = document.getElementById(`comment-content-${commentId}`);
    if (!container || !contentElement) return;

    const currentContent = (contentElement.textContent || '').trim();

    container.innerHTML = `
        <form class="reply-form" onsubmit="handleCommentEditSubmit(event, ${commentId})">
            <div class="reply-input-container">
                <textarea id="comment-edit-content-${commentId}" placeholder="댓글을 수정하세요..." required rows="3">${sanitizeHTML(currentContent)}</textarea>
            </div>
            <div class="reply-form-actions">
                <button type="submit" class="btn btn-sm btn-primary">수정</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${commentId})">취소</button>
            </div>
        </form>
    `;

    container.style.display = 'block';

    const textarea = document.getElementById(`comment-edit-content-${commentId}`);
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

async function handleCommentEditSubmit(e, commentId) {
    e.preventDefault();

    const textarea = document.getElementById(`comment-edit-content-${commentId}`);
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
        addInputError(textarea, '댓글 내용을 입력해주세요');
        return;
    }

    try {
        await CommentAPI.updateComment(commentId, { content });
        showNotification('댓글이 수정되었습니다.', 'success');
        hideReplyForm(commentId);
        loadComments();
    } catch (error) {
        console.error('댓글 수정 실패:', error);
        Auth.handleAuthError(error);
    }
}


function toggleCommentActions(commentId) {
    const actions = document.getElementById(`comment-actions-${commentId}`);
    if (!actions) return;

    if (activeCommentActionId && activeCommentActionId !== commentId) {
        hideCommentActionMenu(activeCommentActionId);
    }

    const shouldOpen = actions.classList.contains('hidden');
    actions.classList.toggle('hidden', !shouldOpen);
    activeCommentActionId = shouldOpen ? commentId : null;
}

function hideCommentActionMenu(commentId) {
    const actions = document.getElementById(`comment-actions-${commentId}`);
    if (!actions) return;
    actions.classList.add('hidden');
}

function hideActiveCommentActionMenu() {
    if (!activeCommentActionId) return;
    hideCommentActionMenu(activeCommentActionId);
    activeCommentActionId = null;
}

function showReplyForm(parentId, parentAuthor) {
    hideAllReplyForms();

    const replyForm = document.getElementById(`reply-form-${parentId}`);
    if (!replyForm) return;

    replyForm.innerHTML = `
        <form class="reply-form" onsubmit="handleReplySubmit(event, ${parentId})">
            <div class="reply-input-container">
                <textarea id="reply-content-${parentId}" placeholder="답글을 작성하세요..." required rows="3"></textarea>
            </div>
            <div class="reply-form-actions">
                <button type="submit" class="btn btn-sm btn-primary">등록</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${parentId})">취소</button>
            </div>
        </form>
    `;

    const textarea = document.getElementById(`reply-content-${parentId}`);

    replyForm.style.display = 'block';
    if (textarea) {
        textarea.focus();
    }
    replyingTo = { id: parentId, author: parentAuthor };
}

function hideReplyForm(parentId) {
    const replyForm = document.getElementById(`reply-form-${parentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        const textarea = document.getElementById(`reply-content-${parentId}`);
        if (textarea) {
            textarea.value = '';
        }
        replyForm.innerHTML = '';
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
        form.innerHTML = '';
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

function reportComment(commentId) {
    if (!Auth.requireAuth()) return;

    const confirmed = confirm('이 댓글을 신고하시겠습니까?');
    if (!confirmed) {
        return;
    }

    showNotification('댓글 신고가 접수되었습니다.', 'success');
    console.log('댓글 신고 접수:', commentId);
}

function toggleCommentLike(commentId, button) {
    if (!Auth.requireAuth()) return;

    if (!button) {
        return;
    }

    const isLiked = likedCommentIds.has(commentId);

    if (isLiked) {
        likedCommentIds.delete(commentId);
        button.textContent = '♡';
        button.classList.remove('liked');
        return;
    }

    likedCommentIds.add(commentId);
    button.textContent = '♥';
    button.classList.add('liked');
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

async function handleCreateComment(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('comment-submit-btn');
    const contentTextarea = document.getElementById('comment-content');
    
    const content = contentTextarea.value.trim();
    const secretCheckbox = document.getElementById('comment-secret');
    
    if (!content) {
        addInputError(contentTextarea, '댓글 내용을 입력해주세요');
        return;
    }

    
    try {
        setLoading(submitBtn, true);
        
        await CommentAPI.createComment(postId, {
            content,
            isSecret: Boolean(secretCheckbox && secretCheckbox.checked)
        });
        
        if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isCommentNotificationEnabled()) {
            showNotification('댓글이 작성되었습니다.', 'comment');
        } else {
            showNotification('댓글이 작성되었습니다.', 'success');
        }
        
        form.reset();
        if (secretCheckbox) secretCheckbox.checked = false;
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

async function handleEditPost(e) {
    e.preventDefault();
    window.location.href = `/create?mode=edit&postId=${postId}`;
}

async function handleDeletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await APIClient.delete(`/posts/${postId}`);
        
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

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day}. ${hour}:${minute}`;
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
