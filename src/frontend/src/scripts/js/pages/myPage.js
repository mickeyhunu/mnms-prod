/**
 * 파일 역할: myPage 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentUser = null;
let nicknameCheckState = { checked: false, available: false, value: '' };
const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const DEFAULT_PROFILE_IMAGE_URL = '/src/assets/image/img_profile.png';
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function formatBirthDate(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.slice(0, 10);
}

function getProfileImageUrl(user = {}) {
    return String(user.profileImageUrl || '').trim() || DEFAULT_PROFILE_IMAGE_URL;
}

function setHelpMessage(element, message, color) {
    if (!element) return;
    element.textContent = message;
    if (color) element.style.color = color;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyPage);
} else {
    initMyPage();
}

async function initMyPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindLogoutActions();

    try {
        currentUser = await APIClient.get('/auth/me');
        Auth.setUser(currentUser);
        renderHeaderUser(currentUser);
        renderAdCenterSection(currentUser);
        renderProfileForm(currentUser);
        await Promise.all([
            renderBusinessProfileStatuses(),
            updateAdCenterStampCount(currentUser)
        ]);

        if (window.location.pathname === '/my-page/profile') {
            bindProfileForm();
        } else if (window.location.pathname === '/my-page/points') {
            await loadPointHistories();
        } else if (window.location.pathname === '/my-page/stamps') {
            await loadStampHistories();
        } else if (window.location.pathname === '/my-page/activity') {
            await loadActivityHistory();
        } else {
            await loadStats();
        }
    } catch (error) {
        console.error(error);
        alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
        Auth.logout();
    }
}

function bindLogoutActions() {
    Auth.bindLogoutButton();
}

function renderHeaderUser(user) {
    const nickname = (typeof Auth.resolveNicknameDisplayElement === 'function')
        ? Auth.resolveNicknameDisplayElement()
        : document.getElementById('user-nickname');
    if (nickname) Auth.applyNicknameDisplay(nickname, user);

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        if (user.isAdmin) adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
    }
}

function isAdAccount(user) {
    if (!user) return false;
    //if (typeof Auth !== 'undefined' && typeof Auth.isAdminAccount === 'function' && Auth.isAdminAccount(user)) return true;

    if (typeof user.isAdAccount === 'boolean') return user.isAdAccount;
    if (typeof user.isAdvertiser === 'boolean') return user.isAdvertiser;

    const role = String(user.role || '').toUpperCase();
    const accountType = String(user.accountType || user.userType || '').toUpperCase();

    return role === 'BUSINESS' || accountType === 'BUSINESS';
}

function resolveRankLabel(user, fallbackLabel = '') {
    return isAdAccount(user) ? '기업회원 등급' : String(fallbackLabel || '');
}

function resolveRankMarkup(user, fallbackLabel = '') {
    if (Auth.isAdminAccount(user)) {
        return `
            <span class="mypage-rank-with-label">
                <img class="mypage-level-badge" src="/src/assets/lv-badges/admin.png" alt="관리자 배지" loading="lazy">
                <span class="mypage-rank-label">관리자</span>
            </span>
        `;
    }

    if (!isAdAccount(user)) {
        return renderLevelBadgeLabel(fallbackLabel || '');
    }

    const badgeImage = Auth.resolveBusinessBadgeImage(user);
    const badgeLabel = Auth.resolveBusinessBadgeLabel(user) || fallbackLabel || '기업회원 등급';
    if (!badgeImage) return renderLevelBadgeLabel(badgeLabel);

    return `
        <span class="mypage-rank-with-label">
            <img class="mypage-level-badge" src="${badgeImage}" alt="회원 등급 배지" loading="lazy">
            <span class="mypage-rank-label">${sanitizeHTML(badgeLabel)}</span>
        </span>
    `;
}

function renderAdCenterSection(user) {
    const adCenterWrapper = document.getElementById('ad-center-wrapper');
    const adCenterSection = document.getElementById('ad-center-section');
    const businessApplyLink = document.getElementById('business-member-apply-link');
    if (!adCenterWrapper || !adCenterSection || !businessApplyLink) return;

    adCenterWrapper.classList.remove('hidden');
    adCenterSection.classList.remove('hidden');

    const isBusinessMember = isAdAccount(user);
    const adCenterItems = adCenterSection.querySelectorAll('.mypage-link-item');

    adCenterItems.forEach((item) => {
        const isBusinessApplyItem = item.id === 'business-member-apply-link';
        if (isBusinessMember) {
            item.classList.toggle('hidden', isBusinessApplyItem);
            return;
        }
        item.classList.toggle('hidden', !isBusinessApplyItem);
    });
}


function renderAdCenterStampCount(element, countText, label = '보유', unit = '개') {
    element.setAttribute('aria-label', `${label} 스탬프 ${countText}${unit}`);
    element.innerHTML = `
        <span class="mypage-link-badge-label">${label}</span>
        <span class="mypage-link-badge-count">${countText}</span>
        <span class="mypage-link-badge-unit">${unit}</span>
    `;
}

async function updateAdCenterStampCount(user) {
    const stampCountElement = document.getElementById('ad-center-stamp-count');
    if (!stampCountElement || !isAdAccount(user)) return;

    renderAdCenterStampCount(stampCountElement, '확인 중', '스탬프', '');

    try {
        const response = await APIClient.get('/users/me/stamps', { limit: 1 });
        const totalStamps = normalizeStampCount(response.totalStamps || 0);
        renderAdCenterStampCount(stampCountElement, totalStamps.toLocaleString());
    } catch (error) {
        renderAdCenterStampCount(stampCountElement, '-');
    }
}

function normalizeRegistrationStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'registered') return 'registered';
    if (value === 'draft') return 'draft';
    return 'unregistered';
}

function normalizeBusinessApprovalStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'approved') return 'approved';
    if (value === 'rejected') return 'rejected';
    return 'pending';
}

function hasCompleteAdProfile(profile) {
    if (!profile || typeof profile !== 'object') return false;
    const requiredValues = [
        profile.businessName || profile.storeName,
        profile.managerName,
        profile.managerContact,
        profile.title,
        profile.region,
        profile.district,
        profile.category,
        profile.openHour,
        profile.closeHour,
        profile.description
    ];
    return requiredValues.every((value) => String(value || '').trim());
}

function applyStatusBadge(elementId, status) {
    const badge = document.getElementById(elementId);
    if (!badge) return;

    badge.classList.remove('mypage-status-badge--registered', 'mypage-status-badge--pending', 'mypage-status-badge--draft', 'mypage-status-badge--unregistered', 'mypage-status-badge--rejected');

    const statusMap = {
        registered: { label: '등록', className: 'mypage-status-badge--registered' },
        pending: { label: '검토중', className: 'mypage-status-badge--pending' },
        rejected: { label: '반려', className: 'mypage-status-badge--rejected' },
        draft: { label: '임시저장', className: 'mypage-status-badge--draft' },
        unregistered: { label: '미등록', className: 'mypage-status-badge--unregistered' }
    };

    const target = statusMap[status] || statusMap.unregistered;
    badge.textContent = target.label;
    badge.classList.add(target.className);
}

function resolveBusinessInfoBadgeStatus(registrationStatus, approvalStatus) {
    if (registrationStatus !== 'registered') return registrationStatus;
    if (approvalStatus === 'pending') return 'pending';
    if (approvalStatus === 'rejected') return 'rejected';
    return 'registered';
}

function setBusinessApplyLinkDisabled(disabled) {
    const link = document.getElementById('business-member-apply-link');
    if (!link) return;

    link.classList.toggle('mypage-link-item--disabled', disabled);
    link.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (disabled) {
        if (!link.dataset.originalHref) link.dataset.originalHref = link.getAttribute('href') || '/business-apply';
        link.removeAttribute('href');
        link.setAttribute('tabindex', '-1');
    } else {
        link.setAttribute('href', link.dataset.originalHref || '/business-apply');
        link.removeAttribute('tabindex');
    }
}

function renderBusinessRejectionReason(elementId, isRejected, rejectionReason) {
    const reason = document.getElementById(elementId);
    if (!reason) return;

    const message = String(rejectionReason || '').trim() || '반려 사유가 등록되지 않았습니다. 고객센터로 문의해주세요.';
    reason.textContent = isRejected ? `반려 사유: ${message}` : '';
    reason.classList.toggle('hidden', !isRejected);
}

function applyStampEventStatusBadge(isEnabled) {
    const badge = document.getElementById('mypage-stamp-event-status');
    if (!badge) return;

    badge.classList.remove('mypage-status-badge--registered', 'mypage-status-badge--unregistered');
    badge.textContent = isEnabled ? 'ON' : 'OFF';
    badge.classList.add(isEnabled ? 'mypage-status-badge--registered' : 'mypage-status-badge--unregistered');
}

function renderAdActivationStatus(ad) {
    const badge = document.getElementById('mypage-ad-activation-status');
    if (!badge) return;

    const isVisible = Boolean(Number(ad?.isCurrentlyVisible || 0));
    const autoRenewEnabled = Boolean(Number(ad?.isActive || 0));

    badge.classList.remove('mypage-status-badge--registered', 'mypage-status-badge--pending', 'mypage-status-badge--unregistered');

    if (!isVisible) {
        badge.textContent = '비활성화';
        badge.classList.add('mypage-status-badge--unregistered');
        return;
    }

    badge.textContent = autoRenewEnabled ? '자동연장' : '활성화';
    badge.classList.add('mypage-status-badge--registered');
}

function renderBusinessInfoStatusBadge({ registrationStatus, approvalStatus, rejectionReason } = {}) {
    const normalizedApprovalStatus = normalizeBusinessApprovalStatus(approvalStatus);
    const resolvedStatus = resolveBusinessInfoBadgeStatus(registrationStatus, normalizedApprovalStatus);
    const isRejected = registrationStatus === 'registered' && normalizedApprovalStatus === 'rejected';

    applyStatusBadge('mypage-business-info-status', resolvedStatus);
    renderBusinessRejectionReason('mypage-business-info-rejection-reason', isRejected, rejectionReason);
}

function renderBusinessApplyStatusBadge({ registrationStatus, approvalStatus, rejectionReason } = {}) {
    const badge = document.getElementById('mypage-business-apply-status');
    if (!badge) return;

    const normalizedApprovalStatus = normalizeBusinessApprovalStatus(approvalStatus);
    const hasSubmittedApplication = !isAdAccount(currentUser) && registrationStatus === 'registered';
    const isReviewing = hasSubmittedApplication && normalizedApprovalStatus === 'pending';
    const isRejected = hasSubmittedApplication && normalizedApprovalStatus === 'rejected';

    badge.classList.toggle('hidden', !isReviewing && !isRejected);
    if (isReviewing) applyStatusBadge('mypage-business-apply-status', 'pending');
    if (isRejected) applyStatusBadge('mypage-business-apply-status', 'rejected');
    renderBusinessRejectionReason('mypage-business-apply-rejection-reason', isRejected, rejectionReason);

    setBusinessApplyLinkDisabled(isReviewing);
}

async function renderBusinessProfileStatuses() {
    let adStatus = 'unregistered';
    let businessStatus = 'unregistered';
    let businessApprovalStatus = 'pending';
    let businessRejectionReason = '';
    let stampEventEnabled = false;

    try {
        const response = await APIClient.get('/users/me/business-ads');
        const existingAd = Array.isArray(response?.content) ? response.content[0] : null;
        adStatus = normalizeRegistrationStatus(existingAd?.registrationStatus);
        if (adStatus === 'unregistered' && hasCompleteAdProfile(existingAd)) adStatus = 'registered';
        stampEventEnabled = Boolean(Number(existingAd?.useStampEvent || existingAd?.useVisitVerification || 0));
        renderAdActivationStatus(existingAd);
    } catch (error) {
        adStatus = 'unregistered';
        renderAdActivationStatus(null);
    }

    try {
        const profile = await APIClient.get('/users/me/business-profile');
        businessStatus = normalizeRegistrationStatus(profile?.registrationStatus);
        businessApprovalStatus = normalizeBusinessApprovalStatus(profile?.approvalStatus);
        businessRejectionReason = profile?.rejectionReason || '';
    } catch (error) {
        businessStatus = 'unregistered';
    }

    applyStatusBadge('mypage-ad-profile-status', adStatus);
    applyStampEventStatusBadge(stampEventEnabled);
    renderBusinessInfoStatusBadge({
        registrationStatus: businessStatus,
        approvalStatus: businessApprovalStatus,
        rejectionReason: businessRejectionReason
    });
    renderBusinessApplyStatusBadge({
        registrationStatus: businessStatus,
        approvalStatus: businessApprovalStatus,
        rejectionReason: businessRejectionReason
    });
}

function updateProfileCharCounter(input, counter, maxLength) {
    if (!input || !counter) return;
    const length = Array.from(String(input.value || '')).length;
    counter.textContent = `${length}/${maxLength}`;
}

function renderProfileForm(user) {
    const loginIdField = document.getElementById('profile-login-id');
    const nicknameInput = document.getElementById('profile-nickname');
    const phoneField = document.getElementById('profile-phone');
    const nameField = document.getElementById('profile-name');
    const birthField = document.getElementById('profile-birth');
    const smsConsent = document.getElementById('sms-consent');
    const profileIntroduction = document.getElementById('profile-introduction');
    const profileIntroductionCounter = document.getElementById('profile-introduction-counter');
    const nicknameCounter = document.getElementById('profile-nickname-counter');
    const profilePreview = document.getElementById('profile-image-preview');
    const profileRemoveButton = document.getElementById('profile-image-remove-btn');

    if (loginIdField) loginIdField.value = user.loginId || '';
    if (nicknameInput) nicknameInput.value = user.nickname || '';

    if (phoneField) {
        if (phoneField.tagName === 'INPUT') phoneField.value = formatPhoneNumber(user.phone || '');
        else phoneField.textContent = user.phone || '없음';
    }

    if (nameField) nameField.value = user.name || user.nickname || '';
    if (birthField) birthField.value = formatBirthDate(user.birthDate || user.birth || '');
    if (smsConsent) smsConsent.checked = Boolean(user.smsConsent);
    if (profileIntroduction) profileIntroduction.value = user.profileIntroduction || '';
    updateProfileCharCounter(profileIntroduction, profileIntroductionCounter, 200);
    updateProfileCharCounter(nicknameInput, nicknameCounter, VALIDATION.NICKNAME_MAX_LENGTH);
    if (profilePreview) {
        profilePreview.src = getProfileImageUrl(user);
        profilePreview.dataset.profileImageUrl = String(user.profileImageUrl || '').trim();
    }
    if (profileRemoveButton) profileRemoveButton.disabled = !String(user.profileImageUrl || '').trim();

    nicknameCheckState = { checked: true, available: true, value: user.nickname || '' };
}

function bindProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    const nicknameInput = form.querySelector('#profile-nickname');
    const nicknameCheckButton = form.querySelector('#nickname-check-btn');
    const nicknameCheckResult = form.querySelector('#nickname-check-result');
    const passwordInput = form.querySelector('#profile-password');
    const passwordConfirmInput = form.querySelector('#profile-password-confirm');
    const passwordMatchResult = form.querySelector('#profile-password-match-result');
    const phoneInput = form.querySelector('#profile-phone');
    const phoneVerifyButton = form.querySelector('#phone-verify-btn');
    const phoneVerifyResult = form.querySelector('#phone-verify-result');
    const profileIntroductionInput = form.querySelector('#profile-introduction');
    const profileIntroductionCounter = form.querySelector('#profile-introduction-counter');
    const nicknameCounter = form.querySelector('#profile-nickname-counter');
    const profileImageInput = form.querySelector('#profile-image-input');
    const profileImageUploadButton = form.querySelector('#profile-image-upload-btn');
    const profileImageRemoveButton = form.querySelector('#profile-image-remove-btn');
    const profileImagePreview = form.querySelector('#profile-image-preview');
    const withdrawOpenButton = document.getElementById('withdraw-open-btn');
    const withdrawFormSection = document.getElementById('withdraw-form-section');
    const withdrawCancelButton = document.getElementById('withdraw-cancel-btn');
    const withdrawSubmitButton = document.getElementById('withdraw-submit-btn');
    const withdrawReasonInput = document.getElementById('withdraw-reason');
    const withdrawResult = document.getElementById('withdraw-result');

    if (phoneInput) phoneInput.readOnly = true;

    updateProfileCharCounter(nicknameInput, nicknameCounter, VALIDATION.NICKNAME_MAX_LENGTH);
    updateProfileCharCounter(profileIntroductionInput, profileIntroductionCounter, 200);
    nicknameInput?.addEventListener('input', () => updateProfileCharCounter(nicknameInput, nicknameCounter, VALIDATION.NICKNAME_MAX_LENGTH));
    profileIntroductionInput?.addEventListener('input', () => updateProfileCharCounter(profileIntroductionInput, profileIntroductionCounter, 200));

    profileImageUploadButton?.addEventListener('click', () => profileImageInput?.click());
    profileImageRemoveButton?.addEventListener('click', () => {
        if (!profileImagePreview) return;
        profileImagePreview.src = DEFAULT_PROFILE_IMAGE_URL;
        profileImagePreview.dataset.profileImageUrl = '';
        if (profileImageInput) profileImageInput.value = '';
        profileImageRemoveButton.disabled = true;
    });
    profileImageInput?.addEventListener('change', () => {
        const file = profileImageInput.files?.[0];
        if (!file) return;
        if (!PROFILE_IMAGE_ALLOWED_MIME_TYPES.has(file.type)) {
            alert('JPG, PNG, WebP 정지 이미지만 선택해 주세요.');
            profileImageInput.value = '';
            return;
        }
        if (file.size > PROFILE_IMAGE_MAX_BYTES) {
            alert('프로필 이미지는 5MB 이하만 등록할 수 있습니다.');
            profileImageInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            if (!profileImagePreview || !dataUrl) return;
            profileImagePreview.src = dataUrl;
            profileImagePreview.dataset.profileImageUrl = dataUrl;
            if (profileImageRemoveButton) profileImageRemoveButton.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    const updatePasswordMatchMessage = () => {
        if (!passwordMatchResult || !passwordConfirmInput) return;

        const password = passwordInput?.value.trim() || '';
        const passwordConfirm = passwordConfirmInput.value.trim();

        if (!passwordConfirm) {
            passwordMatchResult.textContent = '';
            return;
        }

        if (password !== passwordConfirm) {
            passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 다릅니다.';
            passwordMatchResult.style.color = '#dc3545';
            return;
        }

        passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 일치합니다.';
        passwordMatchResult.style.color = '#198754';
    };

    if (passwordInput && passwordConfirmInput) {
        passwordInput.addEventListener('input', updatePasswordMatchMessage);
        passwordConfirmInput.addEventListener('input', updatePasswordMatchMessage);
    }

    if (nicknameInput && nicknameCheckButton) {
        nicknameInput.addEventListener('input', () => {
            const isChanged = nicknameInput.value.trim() !== (currentUser?.nickname || '');
            nicknameCheckButton.classList.toggle('hidden', !isChanged);
            nicknameCheckState = { checked: !isChanged, available: !isChanged, value: currentUser?.nickname || '' };
            if (nicknameCheckResult) nicknameCheckResult.textContent = '';
        });

        nicknameCheckButton.addEventListener('click', async () => {
            const nickname = nicknameInput.value.trim();
            const nicknameLength = Array.from(nickname).length;
            if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = `닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
                    nicknameCheckResult.style.color = '#dc3545';
                }
                return;
            }
            if (!validateNoBlockedExpression(nickname, '닉네임')) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = '닉네임에 사용할 수 없는 표현이 포함되어 있습니다.';
                    nicknameCheckResult.style.color = '#dc3545';
                }
                return;
            }
            if (!validateNicknameComposition(nickname)) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = '닉네임에는 단독 자음/모음을 사용할 수 없습니다.';
                    nicknameCheckResult.style.color = '#dc3545';
                }
                return;
            }

            try {
                const duplicateCheck = await APIClient.get('/auth/check-nickname', { nickname });
                nicknameCheckState = { checked: true, available: Boolean(duplicateCheck.available), value: nickname };

                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = duplicateCheck.available
                        ? '사용 가능한 닉네임입니다.'
                        : '이미 사용 중인 닉네임입니다.';
                    nicknameCheckResult.style.color = duplicateCheck.available ? '#198754' : '#dc3545';
                }
            } catch (error) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = error?.message || '중복 확인에 실패했습니다.';
                    nicknameCheckResult.style.color = '#dc3545';
                }
            }
        });
    }

    if (phoneVerifyButton && phoneInput) {
        phoneVerifyButton.addEventListener('click', async () => {
            const currentName = String(currentUser?.name || '').trim();
            try {
                phoneVerifyButton.disabled = true;
                setHelpMessage(phoneVerifyResult, '본인인증을 진행합니다...', '#6c757d');

                if (!window.KcpIdentity || typeof window.KcpIdentity.request !== 'function') {
                    throw new Error('KCP 본인인증 모듈을 찾을 수 없습니다.');
                }

                const requestOptions = {
                    ordr_idxx: generateIdentityVerificationId('myphone'),
                    kcpPageSubmitYn: 'N'
                };
                const response = await window.KcpIdentity.request(requestOptions);

                const identityVerificationId = String(response?.identityVerificationId || response?.regCertKey || '').trim();
                if (!identityVerificationId) {
                    throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
                }

                const verificationResult = await APIClient.get(`/auth/identity-verification/${encodeURIComponent(identityVerificationId)}`);
                const verifiedName = String(verificationResult?.normalized?.name || verificationResult?.verifiedCustomer?.name || '').trim();
                const verifiedPhone = formatPhoneNumber(
                    verificationResult?.normalized?.phone
                        || verificationResult?.verifiedCustomer?.phoneNumber
                        || verificationResult?.verifiedCustomer?.phone
                        || ''
                );

                if (!verifiedName || !verifiedPhone) {
                    throw new Error('본인인증 정보에서 이름 또는 연락처를 확인하지 못했습니다.');
                }

                if (!currentName || verifiedName !== currentName) {
                    throw new Error('동일 명의 본인인증만 연락처 변경이 가능합니다.');
                }

                phoneInput.value = verifiedPhone;
                setHelpMessage(phoneVerifyResult, '본인인증 완료: 인증된 연락처가 자동 입력되었습니다.', '#198754');
            } catch (error) {
                setHelpMessage(phoneVerifyResult, error?.message || '연락처 본인인증 중 오류가 발생했습니다.', '#dc3545');
            } finally {
                phoneVerifyButton.disabled = false;
            }
        });
    }

    if (withdrawOpenButton && withdrawFormSection) {
        withdrawOpenButton.addEventListener('click', () => {
            withdrawFormSection.classList.remove('hidden');
            withdrawOpenButton.classList.add('hidden');
            if (withdrawReasonInput) withdrawReasonInput.focus();
        });
    }

    if (withdrawCancelButton) {
        withdrawCancelButton.addEventListener('click', () => {
            window.history.back();
        });
    }

    if (withdrawSubmitButton && withdrawReasonInput) {
        withdrawSubmitButton.addEventListener('click', async () => {
            const withdrawReason = String(withdrawReasonInput.value || '').trim();
            if (!withdrawReason) {
                setHelpMessage(withdrawResult, '탈퇴 사유를 입력해 주세요.', '#dc3545');
                withdrawReasonInput.focus();
                return;
            }

            if (!window.confirm('본인인증 후 회원 탈퇴를 진행합니다. 계속하시겠습니까?')) {
                return;
            }

            try {
                withdrawSubmitButton.disabled = true;
                setHelpMessage(withdrawResult, '본인인증을 진행합니다...', '#6c757d');

                if (!window.KcpIdentity || typeof window.KcpIdentity.request !== 'function') {
                    throw new Error('KCP 본인인증 모듈을 찾을 수 없습니다.');
                }

                const requestOptions = {
                    ordr_idxx: generateIdentityVerificationId('withdraw'),
                    kcpPageSubmitYn: 'N'
                };
                const response = await window.KcpIdentity.request(requestOptions);

                const identityVerificationId = String(response?.identityVerificationId || response?.regCertKey || '').trim();
                if (!identityVerificationId) {
                    throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
                }

                setHelpMessage(withdrawResult, '탈퇴 처리 중입니다...', '#6c757d');
                await APIClient.delete('/users/me', { reason: withdrawReason, identityVerificationId });
                alert('회원 탈퇴가 완료되었습니다.');
                Auth.logout();
            } catch (error) {
                setHelpMessage(withdrawResult, error?.message || '회원 탈퇴 처리 중 오류가 발생했습니다.', '#dc3545');
            } finally {
                withdrawSubmitButton.disabled = false;
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = document.getElementById('profile-save-result');
        const submitButton = form.querySelector('button[type="submit"]');

        const nickname = form.nickname.value.trim();
        const password = form.password.value.trim();
        const passwordConfirm = form.passwordConfirm.value.trim();
        const phone = formatPhoneNumber(form.phone.value.trim());
        const profileIntroduction = (profileIntroductionInput?.value || '').trim();

        if (form.phone) form.phone.value = phone;

        if (password && !VALIDATION.PASSWORD_REGEX.test(password)) {
            setHelpMessage(result, `비밀번호는 ${VALIDATION.MIN_PASSWORD_LENGTH}자 이상 영문/숫자를 포함해야 하며 특수문자를 사용할 수 있습니다.`, '#dc3545');
            return;
        }

        if (password && password !== passwordConfirm) {
            setHelpMessage(passwordMatchResult, '비밀번호와 비밀번호 확인이 일치하지 않습니다.', '#dc3545');
            return;
        }

        const isNicknameChanged = nickname !== (currentUser?.nickname || '');
        if (isNicknameChanged) {
            const nicknameLength = Array.from(nickname).length;
            if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
                setHelpMessage(result, `닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`, '#dc3545');
                return;
            }
            if (!validateNoBlockedExpression(nickname, '닉네임')) {
                setHelpMessage(result, '닉네임에 사용할 수 없는 표현이 포함되어 있습니다.', '#dc3545');
                return;
            }
            if (!validateNicknameComposition(nickname)) {
                setHelpMessage(result, '닉네임에는 단독 자음/모음을 사용할 수 없습니다.', '#dc3545');
                return;
            }
            const checkedSameValue = nicknameCheckState.checked && nicknameCheckState.value === nickname;
            if (!checkedSameValue) {
                if (result) {
                    result.textContent = '닉네임 중복 확인을 진행해 주세요.';
                    result.style.color = '#dc3545';
                }
                return;
            }
            if (!nicknameCheckState.available) {
                if (result) {
                    result.textContent = '이미 사용 중인 닉네임입니다.';
                    result.style.color = '#dc3545';
                }
                return;
            }
        }

        if (phone && !PHONE_PATTERN.test(phone)) {
            setHelpMessage(result, '연락처 형식은 010-0000-0000으로 입력해 주세요.', '#dc3545');
            return;
        }

        if (Array.from(profileIntroduction).length > 200) {
            setHelpMessage(result, '자기소개는 200자 이하로 입력해 주세요.', '#dc3545');
            return;
        }

        const payload = {
            nickname,
            phone,
            smsConsent: form.smsConsent.checked,
            profileIntroduction,
            profileImageUrl: String(profileImagePreview?.dataset.profileImageUrl || '').trim()
        };

        if (password) {
            payload.password = password;
        }

        try {
            submitButton.disabled = true;
            setHelpMessage(result, '저장 중입니다...', '#6c757d');

            const response = await APIClient.put('/users/me', payload);
            if (response?.user) {
                currentUser = { ...currentUser, ...response.user };
                Auth.setUser(currentUser);
                renderHeaderUser(currentUser);
                renderProfileForm(currentUser);
                if (nicknameCheckButton) nicknameCheckButton.classList.add('hidden');
                if (nicknameCheckResult) nicknameCheckResult.textContent = '';
            }

            if (password) {
                alert('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
                Auth.logout();
                return;
            }

            alert('회원정보가 수정되었습니다.');
            window.location.href = '/my-page';
        } catch (error) {
            setHelpMessage(result, error?.message || '저장에 실패했습니다. 입력값을 확인해 주세요.', '#dc3545');
        } finally {
            submitButton.disabled = false;
            form.password.value = '';
            form.passwordConfirm.value = '';
            if (passwordMatchResult) passwordMatchResult.textContent = '';
        }
    });
}



function getBoardLabel(boardType) {
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

function formatActivityTitle(title, boardType) {
    const boardLabel = sanitizeHTML(getBoardLabel(boardType));
    const safeTitle = sanitizeHTML(title || '제목 없음');
    return `[${boardLabel}] ${safeTitle}`;
}

async function loadActivityHistory() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/activity');
        const myPosts = response.posts || [];
        const myComments = response.comments || [];
        const likedPosts = response.likedPosts || [];
        const participatedPieces = response.participatedPieces || [];

        container.innerHTML = `
            <section>
                <div class="mypage-activity-tab-header" role="tablist" aria-label="활동 내역 탭">
                    <button type="button" class="mypage-activity-tab is-active" role="tab" aria-selected="true" data-activity-tab="posts">작성글 ${myPosts.length}</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="comments">작성댓글 ${myComments.length}</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="liked-posts">추천한 글 ${likedPosts.length}</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="participated-pieces">참여한 조각 ${participatedPieces.length}</button>
                </div>

                <div class="mypage-activity-tab-panel is-active" role="tabpanel" data-activity-panel="posts">
                    ${myPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${myPosts.map((post) => `
                            <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="comments" hidden>
                    ${myComments.length ? `
                    <div class="mypage-point-history-list">
                        ${myComments.map((comment) => `
                            <a class="mypage-point-history-row" href="${createPostDetailPath(comment.postId, comment.postTitle)}">
                                <div>
                                    <strong>${formatActivityTitle(comment.postTitle || '원문 보기', comment.postBoardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(comment.createdAt))} · 댓글 : ${sanitizeHTML(comment.content || '')}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 댓글이 없습니다.</div>'}
                </div>


                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="liked-posts" hidden>
                    ${likedPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${likedPosts.map((post) => `
                            <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>추천일 ${sanitizeHTML(formatDate(post.likedAt || post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">추천한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="participated-pieces" hidden>
                    ${participatedPieces.length ? `
                    <div class="mypage-point-history-list">
                        ${participatedPieces.map((post) => `
                            <a class="mypage-point-history-row" href="${createPostDetailPath(post)}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType || 'PIECE')}</strong>
                                    <p>참여일 ${sanitizeHTML(formatDate(post.joinedAt || post.createdAt))} · 댓글 ${Number(post.commentCount || 0)} · 조회수 ${Number(post.viewCount || 0)} · 추천수 ${Number(post.likeCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">참여한 조각이 없습니다.</div>'}
                </div>
            </section>
        `;

        bindActivityTabs(container);
    } catch (error) {
        container.innerHTML = '<div class="error-message">활동 내역을 불러오지 못했습니다.</div>';
    }
}

function bindActivityTabs(container) {
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



function formatPointActionLabel(actionType) {
    const labels = {
        REGISTER: '회원가입',
        LOGIN_DAILY: '출석 체크',
        CREATE_POST: '게시글 작성',
        CREATE_REVIEW_BONUS: '후기 게시글 보너스 (+20P)',
        CREATE_COMMENT: '댓글 작성',
        LIKE_POST: '좋아요 누름',
        RECEIVE_POST_LIKE: '내 게시글 좋아요 받음',
        REVOKE_CREATE_POST: '게시글 삭제로 포인트 차감',
        REVOKE_CREATE_REVIEW_BONUS: '후기 보너스 포인트 차감',
        REVOKE_CREATE_COMMENT: '댓글 삭제로 포인트 차감',
        REVOKE_LIKE_POST: '좋아요 취소로 포인트 차감',
        REVOKE_RECEIVE_POST_LIKE: '받은 좋아요 취소로 포인트 차감',
        ADMIN_ADJUST_ADD: '관리자 수동 적립',
        ADMIN_ADJUST_DEDUCT: '관리자 수동 차감'
    };

    return labels[actionType] || actionType;
}

function renderPointRuleGuide(pointRuleGuide = []) {
    if (!pointRuleGuide.length) {
        return '<div class="no-data">포인트 지급 기준 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${pointRuleGuide.map((rule) => `
                <div class="mypage-guide-row">
                    <span>${sanitizeHTML(rule.actionLabel || formatPointActionLabel(rule.actionType || ''))}</span>
                    <strong>${Number(rule.points || 0).toLocaleString()}P</strong>
                    <em>${sanitizeHTML(rule.dailyLimitLabel || '제한 없음')}</em>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLevelGuide(levelGuide = []) {
    if (!levelGuide.length) {
        return '<div class="no-data">등급 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${levelGuide.map((level) => {
                const maxLabel = level.maxPoints == null ? '이상' : `${Number(level.maxPoints).toLocaleString()}P`;
                return `
                    <div class="mypage-guide-row">
                        <span>${renderLevelBadgeLabel(level.label || '')}</span>
                        <strong>${Number(level.minPoints || 0).toLocaleString()}P ~ ${maxLabel}</strong>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function parseLevelBadgeLabel(rawLabel = '') {
    const label = String(rawLabel || '')
        .replace(/<\/?strong>/gi, '')
        .replace(/\*\*/g, '')
        .trim();
    if (!label) return { image: '', title: '' };

    const match = label.match(/^((?:[a-z]:\\workspace\\mnms-prod\\)?(?:\/?src)?\/?assets\/lv-badges\/lv\d+\.png)\s*(.*)$/i);
    if (match) {
        const filenameMatch = String(match[1]).replace(/\\/g, '/').match(/(lv\d+\.png)$/i);
        const filename = (filenameMatch?.[1] || '').toLowerCase();
        if (filename) {
            return {
                image: `/src/assets/lv-badges/${filename}`,
                title: String(match[2] || '').trim()
            };
        }
    }

    const advertiserLevelBadges = [
        { level: 1, emoji: '🌱', title: '미광고' },
        { level: 2, emoji: '🥉', title: '브론즈' },
        { level: 3, emoji: '🥈', title: '실버' },
        { level: 4, emoji: '🥇', title: '골드' },
        { level: 5, emoji: '💠', title: '플래티넘' },
        { level: 6, emoji: '💎', title: '다이아' },
        { level: 7, emoji: '👑', title: '레전드' }
    ];
    const advertiserLevel = advertiserLevelBadges.find((levelInfo) => (
        label.includes(levelInfo.emoji) || label.includes(levelInfo.title)
    ));

    if (advertiserLevel) {
        return {
            image: '',
            emoji: advertiserLevel.emoji,
            title: advertiserLevel.title
        };
    }

    return { image: '', title: label };
}

function renderLevelBadgeLabel(rawLabel = '') {
    const parsed = parseLevelBadgeLabel(rawLabel);
    const titleMarkup = parsed.title
        ? `<span class="mypage-rank-label">${sanitizeHTML(parsed.title)}</span>`
        : '';

    if (parsed.emoji) {
        return `<span class="mypage-rank-with-label"><span class="mypage-level-badge" aria-hidden="true">${sanitizeHTML(parsed.emoji)}</span>${titleMarkup}</span>`;
    }

    if (!parsed.image) return sanitizeHTML(parsed.title);

    return `<span class="mypage-rank-with-label"><img class="mypage-level-badge" src="${parsed.image}" alt="회원 등급 배지" loading="lazy">${titleMarkup}</span>`;
}

function renderLevelProgressLabel(currentLabel = '', nextLabel = '') {
    const currentMarkup = renderLevelBadgeLabel(currentLabel);
    const nextMarkup = renderLevelBadgeLabel(nextLabel || 'MAX');

    return `<span class="mypage-level-progress-rank">${currentMarkup} <span class="mypage-level-progress-arrow">→</span> ${nextMarkup}</span>`;
}


function formatStampActionLabel(actionType) {
    const labels = {
        STAMP_PURCHASE: '스탬프 구매',
        STAMP_PURCHASE_CANCEL: '스탬프 결제취소',
        VISIT_VERIFICATION: '업소 방문 인증',
        SERVICE_BOTTLE_USE: '이벤트 참여 사용',
        BUSINESS_AD_BASIC: '베이직 광고 활성화',
        BUSINESS_AD_PLUS: '플러스 광고 활성화',
        BUSINESS_AD_PREMIUM: '프리미엄 광고 활성화',
        BUSINESS_AD_PIECE: '조각제휴 광고 활성화',
        ADMIN_ADJUST_ADD: '관리자 수동 적립',
        ADMIN_ADJUST_DEDUCT: '관리자 수동 차감',
        EXPIRED: '유효기간 만료'
    };

    return labels[actionType] || actionType || '스탬프 적립';
}

function normalizeStampCount(value) {
    return Math.max(0, Number(value || 0));
}

const STAMP_ASSET_PATHS = {
    MEMBER: {
        empty: '/src/assets/stamp/stamp-empty.png',
        filled: '/src/assets/stamp/stamp-filled.png'
    },
    BUSINESS: {
        empty: '/src/assets/stamp/business-stamp-empty.png',
        filled: '/src/assets/stamp/business-stamp-filled.png'
    }
};

const ADVERTISER_AD_DAY_LEVELS = [
    { level: 1, emoji: '🌱', title: '미광고', minDays: 0 },
    { level: 2, emoji: '🥉', title: '브론즈', minDays: 1 },
    { level: 3, emoji: '🥈', title: '실버', minDays: 91 },
    { level: 4, emoji: '🥇', title: '골드', minDays: 181 },
    { level: 5, emoji: '💠', title: '플래티넘', minDays: 361 },
    { level: 6, emoji: '💎', title: '다이아', minDays: 721 },
    { level: 7, emoji: '👑', title: '레전드', minDays: 1441 }
];

function formatAdvertiserLevelRange(level, index) {
    const nextLevel = ADVERTISER_AD_DAY_LEVELS[index + 1];
    const minDays = Number(level.minDays || 0).toLocaleString('ko-KR');
    if (!nextLevel) return `${minDays}일 ~ 이상`;

    const maxDays = Math.max(Number(nextLevel.minDays || 0) - 1, Number(level.minDays || 0)).toLocaleString('ko-KR');
    return `${minDays}일 ~ ${maxDays}일`;
}

function renderAdvertiserAdDayLevelGuide() {
    return `
        <div class="mypage-guide-list">
            ${ADVERTISER_AD_DAY_LEVELS.map((level, index) => `
                <div class="mypage-guide-row">
                    <span>
                        <span class="mypage-rank-with-label">
                            <span aria-hidden="true">${sanitizeHTML(level.emoji)}</span>
                            <span class="mypage-rank-label">${sanitizeHTML(level.title)}</span>
                        </span>
                    </span>
                    <strong>${formatAdvertiserLevelRange(level, index)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}


function resolveStampAssetPaths(stampType = 'MEMBER') {
    const normalizedType = String(stampType || '').trim().toUpperCase();
    return STAMP_ASSET_PATHS[normalizedType] || STAMP_ASSET_PATHS.MEMBER;
}

function renderStampSlots(totalStamps = 0, options = {}) {
    const filledCount = Math.max(0, Math.min(5, Math.floor(normalizeStampCount(totalStamps))));
    const assetPaths = resolveStampAssetPaths(options.stampType);
    const stampType = String(options.stampType || '').trim().toUpperCase();
    const isBusinessStamp = stampType === 'BUSINESS';
    const stampLabel = options.stampLabel || '스탬프';
    const slotCount = isBusinessStamp ? filledCount : 5;

    return Array.from({ length: slotCount }, (_, index) => {
        const isFilled = index < filledCount;
        const statusLabel = `${index + 1}번째 ${stampLabel} ${isFilled ? '적립됨' : '비어 있음'}`;
        const stampImage = isFilled ? assetPaths.filled : assetPaths.empty;

        return `<img class="mypage-stamp-slot${isFilled ? ' is-filled' : ''}" src="${stampImage}" alt="${statusLabel}" loading="lazy">`;
    }).join('');
}

function renderStampSummary(totalStamps = 0, options = {}) {
    const normalizedTotal = normalizeStampCount(totalStamps);
    const title = options.title || '보유 스탬프';
    const stampType = options.stampType || 'MEMBER';
    const stampLabel = options.stampLabel || '스탬프';

    return `
        <div class="mypage-stamp-summary">
            <div class="mypage-stamp-summary-head">
                <span>${sanitizeHTML(title)}</span>
                <strong>${normalizedTotal.toLocaleString()}개</strong>
            </div>
            <div class="mypage-stamp-slots" aria-label="최대 5개 ${sanitizeHTML(stampLabel)} 적립 현황">
                ${renderStampSlots(normalizedTotal, { stampType, stampLabel })}
            </div>
        </div>
    `;
}

function resolveStampHistoryActionLabel(item = {}) {
    if (item.actionLabel && item.actionLabel !== item.actionType) return item.actionLabel;
    return formatStampActionLabel(item.actionType || '');
}

function formatStampHistoryReason(item = {}) {
    if (item.actionType !== 'BUSINESS_AD_PIECE') return item.reason || '';

    const reason = item.reason || '';
    const sourceLabel = String(item.sourceLabel || '');
    if (sourceLabel.includes('-AUTO-') || reason.includes('자동연장')) return reason;

    return '조각제휴 광고 활성화';
}

function renderStampHistoryList(stampHistories = []) {
    if (!stampHistories.length) {
        return '<div class="no-data">스탬프 내역이 없습니다.</div>';
    }

    return `
        <div class="mypage-point-history-list">
            ${stampHistories.map((item) => {
                const amountValue = Number(item.amount || 0);
                const amountClass = amountValue >= 0 ? 'plus' : 'minus';
                const amountText = `${amountValue >= 0 ? '+' : ''}${amountValue.toLocaleString()}개`;
                const sourceText = item.sourceLabel ? `<p>${sanitizeHTML(item.sourceLabel)}</p>` : '';
                const reasonText = formatStampHistoryReason(item);
                return `
                    <div class="mypage-point-history-row">
                        <div>
                            <strong>${sanitizeHTML(resolveStampHistoryActionLabel(item))}</strong>
                            ${sourceText}
                            ${reasonText ? `<p>${sanitizeHTML(reasonText)}</p>` : ''}
                            <p>${sanitizeHTML(formatDate(item.createdAt))}</p>
                        </div>
                        <span class="point-change ${amountClass}">${amountText}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function loadPointHistories(page = 1) {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    const currentPage = Math.max(1, Number(page) || 1);

    try {
        const response = await APIClient.get('/users/me/points', { page: currentPage, limit: 20 });
        const histories = response.pointHistories || [];
        const pagination = response.pagination || {};
        const pageNumber = Math.max(1, Number(pagination.page) || currentPage);
        const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

        container.innerHTML = `
            <div class="mypage-point-layout">
                <div class="mypage-point-primary-column">
                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">보유 포인트</h3>
                        </div>
                        <div class="mypage-summary-row"><span>현재 등급</span><strong>${renderLevelBadgeLabel(response.levelLabel || '-')}</strong></div>
                        <div class="mypage-summary-row"><span>누적 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                    </section>

                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">포인트 적립/차감 내역</h3>
                        </div>
                        ${histories.length ? `
                            <div class="mypage-point-history-list">
                                ${histories.map((item) => {
                                    const pointValue = Number(item.points || 0);
                                    const pointClass = pointValue >= 0 ? 'plus' : 'minus';
                                    const pointText = `${pointValue >= 0 ? '+' : ''}${pointValue.toLocaleString()}P`;
                                    return `
                                        <div class="mypage-point-history-row">
                                            <div>
                                                <strong>${sanitizeHTML(item.actionLabel || formatPointActionLabel(item.actionType || ''))}</strong>
                                                ${item.reason ? `<p>${sanitizeHTML(item.reason)}</p>` : ''}
                                                <p>${sanitizeHTML(formatDate(item.createdAt))}</p>
                                            </div>
                                            <span class="point-change ${pointClass}">${pointText}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="mypage-point-pagination" aria-label="포인트 내역 페이지">
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.max(1, pageNumber - 1)}" ${pageNumber <= 1 ? 'disabled' : ''}>이전</button>
                                <span class="mypage-point-page-indicator">${pageNumber} / ${totalPages}</span>
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.min(totalPages, pageNumber + 1)}" ${pageNumber >= totalPages ? 'disabled' : ''}>다음</button>
                            </div>
                        ` : '<div class="no-data">포인트 내역이 없습니다.</div>'}
                    </section>
                </div>

                <div class="mypage-point-reference-grid">
                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">포인트 지급 기준</h3>
                        </div>
                        ${renderPointRuleGuide(response.pointRuleGuide || [])}
                    </section>

                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">회원 등급 기준</h3>
                        </div>
                        ${renderLevelGuide(response.levelGuide || [])}
                    </section>
                </div>
            </div>
        `;

        scrollToRequestedHistorySection(container);

        const pageButtons = container.querySelectorAll('.mypage-point-page-btn[data-page]');
        pageButtons.forEach((button) => {
            if (button.disabled) return;
            button.addEventListener('click', async () => {
                const nextPage = Number(button.dataset.page || pageNumber);
                await loadPointHistories(nextPage);
            });
        });
    } catch (error) {
        container.innerHTML = '<div class="error-message">포인트 내역을 불러오지 못했습니다.</div>';
    }
}



async function loadStampHistories(page = 1) {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    const currentPage = Math.max(1, Number(page) || 1);

    try {
        const response = await APIClient.get('/users/me/stamps', { page: currentPage, limit: 20 });
        const stampHistories = response.stampHistories || [];
        const pagination = response.pagination || {};
        const pageNumber = Math.max(1, Number(pagination.page) || currentPage);
        const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
        const totalStamps = normalizeStampCount(response.totalStamps || 0);
        const stampType = String(response.stampType || (isAdAccount(currentUser) ? 'BUSINESS' : 'MEMBER')).toUpperCase();
        const isBusinessStamp = stampType === 'BUSINESS';
        const summaryTitle = isBusinessStamp ? '보유 광고 스탬프' : '보유 스탬프';
        const historyTitle = isBusinessStamp ? '광고 스탬프 적립/사용 내역' : '스탬프 적립/사용 내역';
        const levelGuideSection = isBusinessStamp ? `
                <div class="mypage-point-reference-grid">
                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">광고 회원 등급 기준</h3>
                        </div>
                        ${renderAdvertiserAdDayLevelGuide()}
                    </section>
                </div>
        ` : '';

        container.innerHTML = `
            <div class="mypage-point-layout">
                <div class="mypage-point-primary-column">
                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">${isBusinessStamp ? '광고 스탬프' : '스탬프'}</h3>
                        </div>
                        ${renderStampSummary(totalStamps, {
                            title: summaryTitle,
                            stampType,
                            stampLabel: isBusinessStamp ? '광고 스탬프' : '스탬프'
                        })}
                    </section>

                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">${historyTitle}</h3>
                        </div>
                        ${stampHistories.length ? `
                            ${renderStampHistoryList(stampHistories)}
                            <div class="mypage-point-pagination" aria-label="스탬프 내역 페이지">
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.max(1, pageNumber - 1)}" ${pageNumber <= 1 ? 'disabled' : ''}>이전</button>
                                <span class="mypage-point-page-indicator">${pageNumber} / ${totalPages}</span>
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.min(totalPages, pageNumber + 1)}" ${pageNumber >= totalPages ? 'disabled' : ''}>다음</button>
                            </div>
                        ` : '<div class="no-data">스탬프 내역이 없습니다.</div>'}
                    </section>
                </div>

                ${levelGuideSection}
            </div>
        `;

        const pageButtons = container.querySelectorAll('.mypage-point-page-btn[data-page]');
        pageButtons.forEach((button) => {
            if (button.disabled) return;
            button.addEventListener('click', async () => {
                const nextPage = Number(button.dataset.page || pageNumber);
                await loadStampHistories(nextPage);
            });
        });
    } catch (error) {
        container.innerHTML = '<div class="error-message">스탬프 내역을 불러오지 못했습니다.</div>';
    }
}

function scrollToRequestedHistorySection(container) {
    const hash = String(window.location.hash || '').trim();
    if (!hash) return;

    const targetId = hash.startsWith('#') ? hash.slice(1) : hash;
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || !container.contains(target)) return;

    window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

async function loadStats() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/stats');
        const joinedAt = response.joinedAt
            ? formatDate(response.joinedAt).split(' ')[0].replace(/\.$/, '')
            : '-';
        const rankLabel = isAdAccount(currentUser)
            ? (response.advertiserLevelLabel || '🌱 새싹')
            : resolveRankLabel(currentUser, response.levelLabel || '');
        const rankMarkup = resolveRankMarkup(currentUser, rankLabel);
        const totalStamps = normalizeStampCount(response.totalStamps || 0);
        const stampType = String(response.stampType || (isAdAccount(currentUser) ? 'BUSINESS' : 'MEMBER')).toUpperCase();
        const isBusinessStamp = stampType === 'BUSINESS';
        const stampSectionTitle = isBusinessStamp ? '광고 스탬프' : '스탬프';
        const stampSummaryTitle = isBusinessStamp ? '보유 광고 스탬프' : '보유 스탬프';
        const stampSection = isAdAccount(currentUser) ? '' : `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">${stampSectionTitle}</h3>
                    <a class="mypage-summary-action" href="/my-page/stamps">스탬프 내역 보기</a>
                </div>
                ${renderStampSummary(totalStamps, {
                    title: stampSummaryTitle,
                    stampType,
                    stampLabel: stampSectionTitle
                })}
            </section>
        `;
        const pointsSection = isAdAccount(currentUser) ? `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">광고</h3>
                    <a class="mypage-summary-action" href="/my-page/stamps">스탬프 내역 보기</a>
                </div>
                <div class="mypage-summary-row"><span>보유 광고 스탬프</span><strong class="point-value">${Number(response.totalStamps || 0).toLocaleString()}개</strong></div>
                <div class="mypage-summary-row"><span>누적 광고일수</span><strong class="point-value">${Number(response.cumulativeAdDays || 0).toLocaleString()}일</strong></div>
                <div class="mypage-level-progress">
                    <div class="mypage-level-progress-meta">
                        ${renderLevelProgressLabel(response.advertiserLevelLabel || '🌱 미광고', response.nextAdvertiserLevelLabel || 'MAX')}
                        <span>${Number(response.neededAdDaysToNextAdvertiserLevel || 0).toLocaleString()}일 필요</span>
                    </div>
                    <progress class="mypage-progress-bar" max="100" value="${Number(response.advertiserProgressRate || 0)}"></progress>
                    <div class="mypage-level-progress-meta"><span>${Number(response.cumulativeAdDays || 0).toLocaleString()}일</span><span>${Number(response.nextAdvertiserLevelMinDays || response.cumulativeAdDays || 0).toLocaleString()}일</span></div>
                </div>
            </section>
        ` : `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">포인트</h3>
                    <a class="mypage-summary-action" href="/my-page/points">포인트 내역 보기</a>
                </div>
                <div class="mypage-summary-row"><span>보유 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                <div class="mypage-level-progress">
                    <div class="mypage-level-progress-meta">
                        ${renderLevelProgressLabel(response.levelLabel || '', response.nextLevelLabel || 'MAX')}
                        <span>${Number(response.neededPointsToNextLevel || 0).toLocaleString()}P 필요</span>
                    </div>
                    <progress class="mypage-progress-bar" max="100" value="${Number(response.progressRate || 0)}"></progress>
                    <div class="mypage-level-progress-meta"><span>${Number(response.totalPoints || 0).toLocaleString()}P</span><span>${Number(response.nextLevelMinPoints || response.totalPoints || 0).toLocaleString()}P</span></div>
                </div>
            </section>
        `;

        container.innerHTML = `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">기본 정보</h3>
                    <a class="mypage-summary-action" href="/my-page/profile">정보 수정</a>
                </div>
                <div class="mypage-profile-image-wrap">
                    <img class="mypage-profile-image" src="${sanitizeHTML(getProfileImageUrl(response))}" alt="프로필 이미지" loading="lazy">
                </div>
                <div>
                    <div class="mypage-summary-row mypage-summary-row--introduction"><span>자기소개</span><strong>${sanitizeHTML(response.profileIntroduction || '-')}</strong></div>
                    <div class="mypage-summary-row"><span>아이디</span><strong>${sanitizeHTML(response.loginId || '')}</strong></div>
                    <div class="mypage-summary-row"><span>닉네임</span><strong>@${sanitizeHTML(response.nickname || '')}</strong></div>
                    <div class="mypage-summary-row"><span>랭크</span>${rankMarkup}</div>
                    <div class="mypage-summary-row"><span>가입일</span><strong>${sanitizeHTML(joinedAt)}</strong></div>
                </div>
            </section>

            ${pointsSection}
            ${stampSection}

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">활동 내역</h3>
                    <a class="mypage-summary-action" href="/my-page/activity">활동 내역 보기</a>
                </div>
                <div class="mypage-activity-grid">
                    <div class="mypage-activity-item"><span>출석</span><strong>${Number(response.attendanceCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>게시글</span><strong>${Number(response.postCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>댓글</span><strong>${Number(response.commentCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>추천</span><strong>${Number(response.recommendCount || 0)}</strong></div>
                </div>
            </section>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">통계를 불러오지 못했습니다.</div>';
    }
}
