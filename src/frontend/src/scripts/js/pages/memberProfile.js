/**
 * 파일 역할: 공개 회원 프로필 페이지를 렌더링하는 페이지 스크립트 파일.
 */
const MEMBER_PROFILE_DEFAULT_IMAGE_URL = '/src/assets/image/img_profile.png';

function getMemberProfileNicknameFromPath() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const rawNickname = pathParts[0] && pathParts[0].startsWith('@') ? pathParts[0].slice(1) : '';
    return decodeURIComponent(rawNickname || '').trim();
}

function formatMemberProfileDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${String(date.getFullYear()).slice(-2)}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function renderMemberProfileError(message) {
    const root = document.getElementById('member-profile-root');
    if (!root) return;
    root.innerHTML = `<section class="member-profile-card member-profile-empty"><p>${sanitizeHTML(message)}</p><a class="btn btn-primary" href="/community">커뮤니티로 이동</a></section>`;
}


function parseMemberProfileLevelLabel(rawLabel = '') {
    const label = String(rawLabel || '')
        .replace(/<\/?strong>/gi, '')
        .replace(/\*\*/g, '')
        .trim();

    if (!label) return { image: '', emoji: '', title: '' };

    const imageMatch = label.match(/^((?:[a-z]:\\workspace\\mnms-prod\\)?(?:\/?src)?\/?assets\/lv-badges\/lv\d+\.png)\s*(.*)$/i);
    if (imageMatch) {
        const filenameMatch = String(imageMatch[1]).replace(/\\/g, '/').match(/(lv\d+\.png)$/i);
        const filename = (filenameMatch?.[1] || '').toLowerCase();

        if (filename) {
            return {
                image: `/src/assets/lv-badges/${filename}`,
                emoji: '',
                title: String(imageMatch[2] || '').trim()
            };
        }
    }

    const emojiMatch = label.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\s*\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)\s*(.*)$/u);
    if (emojiMatch) {
        return {
            image: '',
            emoji: emojiMatch[1].trim(),
            title: String(emojiMatch[2] || '').trim()
        };
    }

    return { image: '', emoji: '', title: label };
}

function renderMemberProfileLevelLabel(rawLabel = '') {
    const parsed = parseMemberProfileLevelLabel(rawLabel);
    const title = parsed.title || (!parsed.image && !parsed.emoji ? '-' : '');
    const titleMarkup = title
        ? `<span class="member-profile-level-title">${sanitizeHTML(title)}</span>`
        : '';

    if (parsed.image) {
        return `<span class="member-profile-level-label"><img class="member-profile-level-badge" src="${sanitizeHTML(parsed.image)}" alt="회원 등급 배지" loading="lazy">${titleMarkup}</span>`;
    }

    if (parsed.emoji) {
        return `<span class="member-profile-level-label"><span class="member-profile-level-emoji" aria-hidden="true">${sanitizeHTML(parsed.emoji)}</span>${titleMarkup}</span>`;
    }

    return sanitizeHTML(title);
}

function getMemberProfileIntroduction(profile = {}) {
    return String(
        profile.profileIntroduction
        || profile.profile_introduction
        || profile.introduction
        || ''
    ).trim();
}

function getMemberProfileBoardLabel(boardType) {
    const boardMap = {
        FREE: '자유',
        ANON: '익명',
        REVIEW: '후기',
        STORY: '썰',
        PIECE: '조각',
        ATTENDANCE: '출석',
        QUESTION: '질문',
        PROMOTION: '홍보'
    };

    return boardMap[String(boardType || '').toUpperCase()] || '자유';
}

function formatMemberProfileActivityTitle(title, boardType) {
    return `[${sanitizeHTML(getMemberProfileBoardLabel(boardType))}] ${sanitizeHTML(title || '제목 없음')}`;
}

function renderMemberProfileActivityList(items, emptyMessage, renderRow) {
    if (!items.length) return `<div class="no-data">${sanitizeHTML(emptyMessage)}</div>`;

    return `
        <div class="mypage-point-history-list">
            ${items.map(renderRow).join('')}
        </div>
    `;
}

function renderMemberProfileActivity(profile = {}) {
    const activity = profile.activity || {};
    const posts = activity.posts || [];
    const comments = activity.comments || [];
    const likedPosts = activity.likedPosts || [];
    const participatedPieces = activity.participatedPieces || [];

    return `
        <section class="member-profile-activity" aria-label="회원 활동 내역">
            <div class="mypage-activity-tab-header" role="tablist" aria-label="활동 내역 탭">
                <button type="button" class="mypage-activity-tab is-active" role="tab" aria-selected="true" data-activity-tab="posts">작성글 ${posts.length}</button>
                <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="comments">작성댓글 ${comments.length}</button>
                <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="liked-posts">추천한 글 ${likedPosts.length}</button>
                <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="participated-pieces">참여한 조각 ${participatedPieces.length}</button>
            </div>

            <div class="mypage-activity-tab-panel is-active" role="tabpanel" data-activity-panel="posts">
                ${renderMemberProfileActivityList(posts, '작성한 게시글이 없습니다.', (post) => `
                    <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                        <div>
                            <strong>${formatMemberProfileActivityTitle(post.title, post.boardType)}</strong>
                            <p>${sanitizeHTML(formatDate(post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                        </div>
                    </a>
                `)}
            </div>

            <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="comments" hidden>
                ${renderMemberProfileActivityList(comments, '작성한 댓글이 없습니다.', (comment) => `
                    <a class="mypage-point-history-row" href="${createPostDetailPath(comment.postId, comment.postTitle)}">
                        <div>
                            <strong>${formatMemberProfileActivityTitle(comment.postTitle || '원문 보기', comment.postBoardType)}</strong>
                            <p>${sanitizeHTML(formatDate(comment.createdAt))} · 댓글 : ${sanitizeHTML(comment.content || '')}</p>
                        </div>
                    </a>
                `)}
            </div>

            <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="liked-posts" hidden>
                ${renderMemberProfileActivityList(likedPosts, '추천한 게시글이 없습니다.', (post) => `
                    <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                        <div>
                            <strong>${formatMemberProfileActivityTitle(post.title, post.boardType)}</strong>
                            <p>추천일 ${sanitizeHTML(formatDate(post.likedAt || post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                        </div>
                    </a>
                `)}
            </div>

            <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="participated-pieces" hidden>
                ${renderMemberProfileActivityList(participatedPieces, '참여한 조각이 없습니다.', (post) => `
                    <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                        <div>
                            <strong>${formatMemberProfileActivityTitle(post.title, post.boardType || 'PIECE')}</strong>
                            <p>참여일 ${sanitizeHTML(formatDate(post.joinedAt || post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                            <p>참여자 ${Number(post.participantCount || 0)}명</p>
                        </div>
                    </a>
                `)}
            </div>
        </section>
    `;
}

function bindMemberProfileActivityTabs(container) {
    const tabs = container.querySelectorAll('[data-activity-tab]');
    const panels = container.querySelectorAll('[data-activity-panel]');
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.activityTab;

            tabs.forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.activityPanel === target;
                panel.classList.toggle('is-active', isActive);
                panel.hidden = !isActive;
            });
        });
    });
}

function renderMemberProfile(profile) {
    const root = document.getElementById('member-profile-root');
    if (!root) return;

    const profileImageUrl = String(profile.profileImageUrl || '').trim() || MEMBER_PROFILE_DEFAULT_IMAGE_URL;
    const levelLabel = profile.isBusinessMember ? profile.advertiserLevelLabel : profile.levelLabel;
    const levelCaption = profile.isBusinessMember ? '광고 활동 등급' : '회원 활동 등급';
    const profileIntroduction = getMemberProfileIntroduction(profile);

    root.innerHTML = `
        <section class="member-profile-card" aria-label="회원 프로필">
            <div class="member-profile-hero">
                <img class="member-profile-avatar" src="${sanitizeHTML(profileImageUrl)}" alt="${sanitizeHTML(profile.nickname || '회원')} 프로필 이미지">
                <div class="member-profile-title">
                    <h2>${sanitizeHTML(profile.nickname || '회원')}</h2>
                    <p>${sanitizeHTML(levelCaption)} · ${renderMemberProfileLevelLabel(levelLabel || '-')}</p>
                </div>
            </div>
            <div class="member-profile-introduction" aria-label="자기소개">
                <p>${profileIntroduction ? sanitizeHTML(profileIntroduction) : '등록된 자기소개가 없습니다.'}</p>
            </div>
            <div class="member-profile-joined-date" aria-label="가입일">
                <span>가입일</span>
                <time datetime="${sanitizeHTML(profile.joinedAt || '')}">${sanitizeHTML(formatMemberProfileDate(profile.joinedAt))}</time>
            </div>
        </section>
        ${renderMemberProfileActivity(profile)}
    `;

    bindMemberProfileActivityTabs(root);
}

async function initMemberProfilePage() {
    if (typeof Auth !== 'undefined') Auth.updateHeaderUI();

    const nickname = getMemberProfileNicknameFromPath();
    if (!nickname) {
        renderMemberProfileError('프로필 주소를 확인해주세요.');
        return;
    }

    try {
        const profile = await APIClient.get(`/users/profiles/${encodeURIComponent(nickname)}`);
        renderMemberProfile(profile);
    } catch (error) {
        renderMemberProfileError(error?.message || '회원 프로필을 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMemberProfilePage);
} else {
    initMemberProfilePage();
}
