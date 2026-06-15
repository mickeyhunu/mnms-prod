/**
 * 파일 역할: postCard UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
function renderPostList(posts, container) {
    if (!container) return;

    const noticeList = document.getElementById('notice-list');
    const includeAds = window.boardFilters ? window.boardFilters.includeAds : false;
    const hotFirst = window.boardFilters ? window.boardFilters.hotFirst : true;

    const visiblePosts = includeAds
        ? posts
        : posts.filter((post) => {
            const normalized = `${post.title || ''} ${post.content || ''}`.toLowerCase();
            return !normalized.includes('광고');
        });

    const sortedPosts = [...visiblePosts].sort((a, b) => {
        if (!hotFirst) {
            return (b.id || 0) - (a.id || 0);
        }

        const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
        if (likeDiff !== 0) {
            return likeDiff;
        }

        return (b.id || 0) - (a.id || 0);
    });

    const notices = sortedPosts.filter((post) => Boolean(post.isNotice));
    const normalPosts = sortedPosts.filter((post) => !post.isNotice);

    if (noticeList) {
        noticeList.innerHTML = notices.map((post) => createBoardRow(post, true)).join('');
    }

    container.innerHTML = normalPosts.map((post, index) => createBoardRow(post, false, index)).join('');
}

function createBoardRow(post, isNotice = false, index = 0) {
    const noticeType = String(post.noticeType || 'NOTICE').toUpperCase();
    const noticeText = noticeType === 'IMPORTANT' ? '필독' : '공지';
    const noticeBadge = isNotice ? `<span class="badge-notice">[${noticeText}]</span>` : '';
    const hotBadge = !isNotice && (post.likeCount || 0) >= 5 ? '<span class="badge-hot">추천</span>' : '';
    const newBadge = isPostWithin24Hours(post.createdAt)
        ? '<span class="badge-new" aria-label="24시간 이내 새 글">N</span>'
        : '';
    const numberLabel = isNotice ? (post.isPinned ? '📌' : noticeText) : post.id || index + 1;
    const detailHref = String(post.sourceType || '').toUpperCase() === 'SUPPORT'
        ? `/support?articleId=${encodeURIComponent(post.sourceId || post.id)}&sourceType=SUPPORT`
        : createPostDetailPath(post);

    const authorName = getDisplayAuthorName(post);
    const authorBadgeMarkup = getAuthorGradeBadgeMarkup(post);
    const ownBadgeMarkup = getOwnContentBadgeMarkup(post);

    return `
        <tr class="${isNotice ? 'notice-row' : 'post-row'}" data-post-id="${post.id}">
            <td class="col-num">${numberLabel}</td>
            <td class="col-title">
                ${noticeBadge}${hotBadge}
                <a href="${detailHref}">${sanitizeHTML(post.title || '제목 없음')}</a>
                ${newBadge}
                ${post.commentCount > 0 ? `<small>[${post.commentCount}]</small>` : ''}
            </td>
            <td class="col-author">${sanitizeHTML(authorName || `작성자 #${post.authorId || ''}`)}${authorBadgeMarkup}${ownBadgeMarkup}</td>
            <td class="col-date">${formatDate(post.createdAt)}</td>
            <td class="col-like">${post.likeCount || 0}</td>
            <td class="col-view">${post.viewCount || 0}</td>
        </tr>
    `;
}

function isPostWithin24Hours(createdAt) {
    if (!createdAt) return false;

    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;

    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    return (Date.now() - createdTime) < DAY_IN_MS;
}

function createPostCard(post) {
    const user = Auth.getUser();
    const isLoggedIn = !!user;
    const isAuthor = isLoggedIn && user.id === post.authorId;
    const isAdminNotice = Boolean(post.isNotice);
    const cardClass = isAdminNotice ? 'post-card admin-notice' : 'post-card';
    const noticeLabel = String(post.noticeType || 'NOTICE').toUpperCase() === 'IMPORTANT' ? '필독' : '공지';
    const pinPrefix = post.isPinned ? '📌 ' : '';
    const titlePrefix = isAdminNotice ? `${pinPrefix}[${noticeLabel}] ` : '';
    const commentIcon = getCommentIcon(post, isAdminNotice);

    const isLikedByMe = Boolean(post.isLiked || post.liked || post.likedByMe);

    const authorName = getDisplayAuthorName(post);
    const authorBadgeMarkup = getAuthorGradeBadgeMarkup(post);
    const ownBadgeMarkup = getOwnContentBadgeMarkup(post);

    return `
        <div class="${cardClass}" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">
                        <a href="${createPostDetailPath(post)}">${titlePrefix}${sanitizeHTML(post.title)}</a>
                    </h3>
                    <div class="post-meta">
                        <span class="post-author">${sanitizeHTML(authorName || '작성자 #' + post.authorId)}${authorBadgeMarkup}${ownBadgeMarkup}</span>
                        <span class="post-date">${formatDate(post.createdAt)}</span>
                        <span class="post-stats">
                            <span class="like-count">👍 ${post.likeCount || 0}</span>
                            <span class="comment-count">${commentIcon} ${post.commentCount || 0}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${renderLinkedText(truncateText(post.content, 150))}
            </div>
            ${post.imageUrls && post.imageUrls.length > 0 ? createImagePreview(post.imageUrls) : ''}
            <div class="post-actions">
                ${isLoggedIn ? `
                    <button class="btn btn-sm btn-outline like-btn ${isLikedByMe ? 'liked' : ''}" onclick="handlePostLike(${post.id})" ${isLikedByMe ? 'data-liked="true"' : ''}>
                        <span class="like-icon">${isLikedByMe ? '❤️' : '🤍'}</span>
                        <span class="like-count-value">${post.likeCount || 0}</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}


function resolveAuthorLevelBadgeImage(level) {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
        return '';
    }

    const normalizedLevel = Math.min(7, Math.max(1, Math.floor(numericLevel)));
    return `/src/assets/lv-badges/lv${normalizedLevel}.png`;
}

function isBusinessAuthor(post = {}) {
    const normalizedRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    const normalizedMemberType = String(
        post?.authorMemberType
        || post?.author_member_type
        || post?.memberType
        || post?.member_type
        || post?.accountType
        || ''
    ).toUpperCase();

    return normalizedRole === 'BUSINESS' || normalizedMemberType === 'BUSINESS' || Boolean(post?.authorIsBusiness);
}


function resolveAdvertiserRankLabel(source = {}) {
    const explicit = String(source?.authorAdvertiserLevelLabel || source?.advertiserLevelLabel || '').trim();
    if (explicit) return explicit;

    const days = Number(source?.authorAdvertiserAdDays ?? source?.cumulativeAdDays ?? 0);
    const normalizedDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
    const levels = [
        { emoji: '🌱', title: '미광고', minDays: 0 },
        { emoji: '🥉', title: '브론즈', minDays: 1 },
        { emoji: '🥈', title: '실버', minDays: 91 },
        { emoji: '🥇', title: '골드', minDays: 181 },
        { emoji: '💠', title: '플래티넘', minDays: 361 },
        { emoji: '💎', title: '다이아', minDays: 721 },
        { emoji: '👑', title: '레전드', minDays: 1441 }
    ];
    return levels.reduce((current, level) => (normalizedDays >= level.minDays ? level : current), levels[0]).emoji + ' ' + levels.reduce((current, level) => (normalizedDays >= level.minDays ? level : current), levels[0]).title;
}

function normalizeBusinessAdPlan(plan) {
    const normalized = String(plan || '').trim().toLowerCase();
    if (['basic', 'plus', 'premium', 'banner'].includes(normalized)) return normalized;
    if (normalized === 'normal') return 'basic';
    return '';
}

function resolveBusinessAuthorBadgeImage(post = {}) {
    if (!isBusinessAuthor(post)) return '';

    const adPlan = normalizeBusinessAdPlan(
        post?.authorAdPlan
        || post?.authorPlanType
        || post?.planType
        || post?.adPlan
        || post?.plan
        || post?.businessAdPlan
        || post?.businessPlan
    );
    if (adPlan) return `/src/assets/ad-plan-badges/${adPlan}-badge.png`;

    return Boolean(post?.authorHasActiveBusinessAd || post?.hasActiveBusinessAd)
        ? '/src/assets/ad-plan-badges/premium-badge.png'
        : '/src/assets/ad-plan-badges/none-badge.png';
}

function getAuthorGradeBadgeMarkup(post = {}) {
    const normalizedRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    if (normalizedRole === 'ADMIN') {
        return ' <img class="community-author-badge" src="/src/assets/lv-badges/admin.png" alt="관리자 배지" loading="lazy">';
    }

    if (isBusinessAuthor(post)) {
        return ` <span class="community-author-rank-badge">${sanitizeHTML(resolveAdvertiserRankLabel(post))}</span>`;
    }

    const badgeImage = resolveAuthorLevelBadgeImage(post?.authorLevel ?? post?.level ?? post?.authorRank ?? post?.rank ?? post?.authorGrade ?? post?.grade);
    return badgeImage
        ? ` <img class="community-author-badge" src="${badgeImage}" alt="회원 등급 배지" loading="lazy">`
        : '';
}

function getOwnContentBadgeMarkup(post) {
    const user = Auth.getUser();
    if (!user) return '';

    const postAuthorId = post?.authorId ?? post?.userId;
    if (!postAuthorId) return '';

    return String(user.id) === String(postAuthorId)
        ? ' <span class="own-content-badge">본인</span>'
        : '';
}


function getCommentIcon(post, isAdminNotice) {
    if (isAdminNotice) {
        return '📢';
    }

    const authorRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    const authorMemberType = String(post?.authorMemberType || post?.memberType || post?.member_type || '').toUpperCase();

    if (authorRole === 'BUSINESS' || authorMemberType === 'BUSINESS') {
        return '🎯';
    }

    return '💬';
}

function getDisplayAuthorName(post) {
    const boardType = String(post?.boardType || post?.board_type || '').toUpperCase();
    const currentUser = Auth.getUser();
    const isAdminViewer = String(currentUser?.role || '').toUpperCase() === 'ADMIN';

    if (boardType === 'ANON') {
        return isAdminViewer && post?.authorNickname ? post.authorNickname : '익명';
    }

    return post?.authorNickname;
}

function handlePostClick(postId) {
    window.location.href = createPostDetailPath(postId);
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
                window.location.href = titleLink.getAttribute('href') || createPostDetailPath(card.dataset.postId);
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
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = `<span class="like-icon">❤️</span><span class="like-count-value">${response.likeCount}</span>`;
            } else {
                likeBtn.removeAttribute('data-liked');
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = `<span class="like-icon">🤍</span><span class="like-count-value">${response.likeCount}</span>`;
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
    window.location.href = createPostDetailPath(postId);
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

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}
