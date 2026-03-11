/**
 * 파일 역할: likeButton UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
// 좋아요 버튼 컴포넌트 관련 함수들
// 게시글 목록과 상세 페이지에서 사용되는 좋아요 버튼 처리

// 좋아요 버튼 초기화 (모든 페이지에서 호출)
function initLikeButtons() {
    const likeButtons = document.querySelectorAll('.like-btn');
    
    likeButtons.forEach(button => {
        button.addEventListener('click', handleLikeClick);
    });
}

// 좋아요 버튼 클릭 처리
async function handleLikeClick(event) {
    event.preventDefault();
    event.stopPropagation(); // 게시글 카드 클릭 이벤트 방지
    
    // 로그인 체크
    if (!Auth.isAuthenticated()) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }
    
    const button = event.currentTarget;
    const postId = button.dataset.postId;
    
    if (!postId) {
        console.error('게시글 ID를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // 버튼 비활성화 (중복 클릭 방지)
        button.disabled = true;
        
        // API 호출
        const response = await LikeAPI.toggleLike(postId);
        
        // UI 업데이트
        updateLikeButton(button, response.isLiked, response.likeCount);
        
        // 살짝 애니메이션 효과
        animateLikeButton(button);
        
    } catch (error) {
        console.error('좋아요 처리 실패:', error);
        // 에러 메시지는 LikeAPI에서 이미 표시됨
    } finally {
        // 버튼 다시 활성화
        button.disabled = false;
    }
}

// 좋아요 버튼 상태 업데이트
function updateLikeButton(button, isLiked, likeCount) {
    const likeIcon = button.querySelector('.like-icon') || button.querySelector('[id*="like-icon"]');
    const likeCountElement = button.querySelector('.like-count') || button.querySelector('[id*="like-count"]');
    
    // 버튼 스타일 변경
    if (isLiked) {
        button.classList.add('liked');
        if (likeIcon) likeIcon.textContent = '❤️';
    } else {
        button.classList.remove('liked');
        if (likeIcon) likeIcon.textContent = '🤍';
    }
    
    // 좋아요 수 업데이트
    if (likeCountElement) {
        likeCountElement.textContent = likeCount || 0;
    }
}

// 좋아요 버튼 애니메이션
function animateLikeButton(button) {
    // 간단한 펄스 애니메이션
    button.style.transform = 'scale(1.1)';
    button.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 100);
    
    // 좋아요 아이콘에 하트 애니메이션 추가
    const likeIcon = button.querySelector('.like-icon') || button.querySelector('[id*="like-icon"]');
    if (likeIcon && button.classList.contains('liked')) {
        // 하트가 커졌다 작아지는 애니메이션
        likeIcon.style.animation = 'heartbeat 0.3s ease';
        
        setTimeout(() => {
            likeIcon.style.animation = '';
        }, 300);
    }
}

// 게시글 카드에 좋아요 버튼 추가 (동적으로 생성된 카드용)
function addLikeButtonToPostCard(postCard, postId, isLiked, likeCount) {
    const postStats = postCard.querySelector('.post-stats');
    if (!postStats) return;
    
    // 기존 좋아요 버튼이 있으면 제거
    const existingLikeBtn = postStats.querySelector('.like-btn');
    if (existingLikeBtn) {
        existingLikeBtn.remove();
    }
    
    // 새 좋아요 버튼 생성
    const likeButton = createLikeButton(postId, isLiked, likeCount);
    postStats.insertAdjacentHTML('beforeend', likeButton);
    
    // 이벤트 리스너 추가
    const newButton = postStats.querySelector('.like-btn[data-post-id="' + postId + '"]');
    if (newButton) {
        newButton.addEventListener('click', handleLikeClick);
    }
}

// 좋아요 버튼 HTML 생성
function createLikeButton(postId, isLiked = false, likeCount = 0) {
    const likedClass = isLiked ? 'liked' : '';
    const heartIcon = isLiked ? '❤️' : '🤍';
    
    return `
        <button class="like-btn ${likedClass}" data-post-id="${postId}" title="좋아요">
            <span class="like-icon">${heartIcon}</span>
            <span class="like-count">${likeCount}</span>
        </button>
    `;
}

// 특정 게시글의 좋아요 상태 새로고침
async function refreshLikeStatus(postId) {
    try {
        const likeData = await LikeAPI.getLikeCount(postId);
        
        // 해당 게시글의 모든 좋아요 버튼 업데이트
        const likeButtons = document.querySelectorAll(`[data-post-id="${postId}"]`);
        likeButtons.forEach(button => {
            updateLikeButton(button, likeData.isLiked, likeData.likeCount);
        });
        
        return likeData;
    } catch (error) {
        console.error('좋아요 상태 새로고침 실패:', error);
        return null;
    }
}

// 페이지의 모든 좋아요 버튼 상태 새로고침 (필요시 사용)
async function refreshAllLikeButtons() {
    const likeButtons = document.querySelectorAll('.like-btn[data-post-id]');
    
    // 중복 제거를 위해 Set 사용
    const postIds = new Set();
    likeButtons.forEach(button => {
        const postId = button.dataset.postId;
        if (postId) postIds.add(postId);
    });
    
    // 각 게시글의 좋아요 상태 갱신
    for (const postId of postIds) {
        await refreshLikeStatus(postId);
    }
}

// CSS 애니메이션 추가 (동적으로 스타일 추가)
function addLikeAnimationStyles() {
    if (document.getElementById('like-animation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'like-animation-styles';
    style.textContent = `
        @keyframes heartbeat {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        
        .like-btn {
            position: relative;
            overflow: hidden;
        }
        
        .like-btn:active {
            transform: scale(0.95);
        }
        
        .like-btn.liked .like-icon {
            color: #e91e63;
        }
        
        .like-btn:hover {
            transform: translateY(-1px);
        }
    `;
    
    document.head.appendChild(style);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    addLikeAnimationStyles();
    initLikeButtons();
});

// 동적으로 생성된 콘텐츠에서 좋아요 버튼 초기화 (다른 스크립트에서 호출)
window.initNewLikeButtons = function() {
    initLikeButtons();
};