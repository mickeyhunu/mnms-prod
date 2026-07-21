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
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function renderMemberProfileError(message) {
    const root = document.getElementById('member-profile-root');
    if (!root) return;
    root.innerHTML = `<section class="member-profile-card member-profile-empty"><p>${sanitizeHTML(message)}</p><a class="btn btn-primary" href="/community">커뮤니티로 이동</a></section>`;
}

function renderMemberProfile(profile) {
    const root = document.getElementById('member-profile-root');
    if (!root) return;

    const profileImageUrl = String(profile.profileImageUrl || '').trim() || MEMBER_PROFILE_DEFAULT_IMAGE_URL;
    const levelLabel = profile.isBusinessMember ? profile.advertiserLevelLabel : profile.levelLabel;
    const levelCaption = profile.isBusinessMember ? '광고 활동 등급' : '회원 활동 등급';

    root.innerHTML = `
        <section class="member-profile-card" aria-label="회원 프로필">
            <div class="member-profile-hero">
                <img class="member-profile-avatar" src="${sanitizeHTML(profileImageUrl)}" alt="${sanitizeHTML(profile.nickname || '회원')} 프로필 이미지">
                <div class="member-profile-title">
                    <span class="member-profile-label">/@${sanitizeHTML(profile.nickname || '')}</span>
                    <h2>${sanitizeHTML(profile.nickname || '회원')}</h2>
                    <p>${sanitizeHTML(levelCaption)} · ${sanitizeHTML(levelLabel || '-')}</p>
                </div>
            </div>
            <dl class="member-profile-stats">
                <div><dt>게시글</dt><dd>${Number(profile.postCount || 0).toLocaleString()}</dd></div>
                <div><dt>댓글</dt><dd>${Number(profile.commentCount || 0).toLocaleString()}</dd></div>
                <div><dt>후기</dt><dd>${Number(profile.reviewCount || 0).toLocaleString()}</dd></div>
                <div><dt>가입일</dt><dd>${sanitizeHTML(formatMemberProfileDate(profile.joinedAt))}</dd></div>
            </dl>
        </section>
    `;
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
