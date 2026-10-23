/**
 * 파일 역할: 배너광고 관리 페이지에서 위치별(홈 상단/커뮤니티 상단/LIVE 하단) 배너 이미지·제목·이동 링크를 설정하는 스크립트 파일.
 * 화면 구성은 업체광고프로필 관리(ad-profile-*)를 따르고, 이미지 영역은 실제 배너 크기로 보여주며 업로드 칸을 겸한다. 입찰은 광고 활성화(ad-purchase) 페이지의 배너광고 탭에서 한다.
 * 새로 고른 이미지는 저장 전까지 브라우저에만 보관하고, 저장 시 서버가 S3에 업로드하며 교체·삭제된 기존 이미지는 S3에서 지운다.
 */
(() => {
    const pageRoot = document.querySelector('.banner-ad-page');
    const creativeList = document.getElementById('banner-ad-creative-list');
    const saveButton = document.getElementById('banner-ad-save-btn');
    const placementTabs = Array.from(document.querySelectorAll('#banner-ad-placement-tabs [data-placement-tab]'));

    if (!pageRoot || !creativeList || !saveButton) return;

    const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const PLACEMENT_HELP = {
        HOME: '홈 화면 최상단에서 5초마다 넘어가는 슬라이드 배너로 노출됩니다.',
        COMMUNITY: '커뮤니티 게시판 상단에서 5초마다 넘어가는 슬라이드 배너로 노출됩니다.',
        LIVE: '낙찰받은 LIVE 매장 화면 하단에서 5초마다 넘어가는 슬라이드 배너로 노출됩니다.'
    };
    const requestedPlacement = String(new URLSearchParams(window.location.search).get('placement') || '').toUpperCase();
    // pendingImages: 새로 고른 이미지(data URL), removedImages: × 로 지운 기존 이미지, dirty: 저장할 변경이 있는 위치
    const state = {
        data: null,
        pendingImages: {},
        removedImages: new Set(),
        dirty: new Set(),
        isSubmitting: false,
        activePlacement: placementTabs.some((tab) => tab.dataset.placementTab === requestedPlacement) ? requestedPlacement : 'HOME'
    };

    const isOwnBusinessLink = (url) => !url || String(url).startsWith('/business-info/');
    // 직접 입력 링크는 https:// 고정 접두어 뒤의 주소만 입력받는다. (붙여넣은 http(s):// 는 떼어낸다)
    const LINK_PREFIX = 'https://';
    const stripLinkScheme = (url) => String(url || '').trim().replace(/^https?:\/\//i, '');
    const getCreative = (placement) => state.data?.creatives.find((item) => item.placement === placement);
    const getDisplayImageUrl = (placement) => {
        if (state.pendingImages[placement]) return state.pendingImages[placement];
        if (state.removedImages.has(placement)) return '';
        return getCreative(placement)?.imageUrl || '';
    };

    const renderImageControl = (key, label) => {
        const imageUrl = getDisplayImageUrl(key);
        const hasImage = Boolean(imageUrl);
        return `
            <button type="button" class="ad-image-dropzone ${hasImage ? 'has-image' : ''}" data-image-trigger="${key}" aria-label="${label} 배너 이미지 ${hasImage ? '변경' : '업로드'}" aria-describedby="banner-ad-image-help-${key}">
                ${hasImage
                    ? `<img src="${sanitizeHTML(imageUrl)}" alt="${label} 배너 미리보기">`
                    : `<svg class="ad-profile-image-add-icon stroke-font-gray" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                        <path stroke-linecap="round" stroke-width="1.5" d="M9.754.75v18M18.75 9.753h-18"></path>
                    </svg><span class="ad-image-dropzone-text">배너 이미지 업로드</span>`}
            </button>
            <button type="button" class="business-license-clear-btn ad-profile-image-clear-btn ${hasImage ? '' : 'hidden'}" data-image-clear="${key}" aria-label="${label} 배너 첨부 이미지 삭제"><span aria-hidden="true">×</span></button>
        `;
    };

    const renderCreativeSection = (creative) => {
        const key = creative.placement;
        const useOwnLink = isOwnBusinessLink(creative.linkUrl);
        return `
            <div class="ad-profile-section banner-ad-creative-section" id="banner-ad-creative-${key}" data-placement="${key}" role="tabpanel" ${key === state.activePlacement ? '' : 'hidden'}>
                <h3>${creative.label} 배너</h3>

                <div class="ad-image-field">
                    <span class="ad-profile-image-label">배너 이미지</span>
                    <div class="ad-image-control" data-image-control="${key}">
                        ${renderImageControl(key, creative.label)}
                    </div>
                    <p class="ad-profile-image-help" id="banner-ad-image-help-${key}">
                        이미지 권장 사이즈: 가로 1200px, 세로 300px (4:1 비율) · 실제 노출 크기로 표시됩니다.<br>
                        등록 가능 파일: JPG, JPEG, PNG, GIF, WEBP (5MB 이하)<br>
                        ${PLACEMENT_HELP[key] || ''} 이미지가 없으면 낙찰되어도 배너가 노출되지 않습니다.
                    </p>
                    <input class="hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-image-input="${key}">
                </div>
                <div class="ad-profile-grid ad-profile-grid--single">
                    <label>
                        <span>배너 제목</span>
                        <input id="banner-ad-title-${key}" type="text" maxlength="100" placeholder="배너 제목을 입력해주세요. (미입력 시 업체명)" value="${sanitizeHTML(creative.title)}">
                    </label>
                </div>

                <div class="ad-profile-grid ad-profile-grid--single">
                    <label>
                        <span>클릭 시 이동</span>
                        <select id="banner-ad-link-mode-${key}" data-link-mode="${key}">
                            <option value="own" ${useOwnLink ? 'selected' : ''}>내 업체 상세페이지</option>
                            <option value="custom" ${useOwnLink ? '' : 'selected'}>직접 입력</option>
                        </select>
                    </label>
                </div>
                <div class="ad-url-input" id="banner-ad-link-wrap-${key}" ${useOwnLink ? 'hidden' : ''}>
                    <span class="ad-url-input-prefix" aria-hidden="true">${LINK_PREFIX}</span>
                    <input id="banner-ad-link-${key}" type="text" inputmode="url" maxlength="990" placeholder="이동할 주소를 입력해주세요." aria-label="이동할 주소 (https:// 뒤에 입력)" value="${useOwnLink ? '' : sanitizeHTML(stripLinkScheme(creative.linkUrl))}" data-link-input="${key}">
                </div>
            </div>
        `;
    };

    // 탭에는 저장하지 않은 변경이 있는 위치를 점으로 표시한다. 탭을 바꿔도 작성 중인 내용은 유지된다.
    const renderTabs = () => {
        placementTabs.forEach((tab) => {
            const code = tab.dataset.placementTab;
            const active = code === state.activePlacement;
            tab.classList.toggle('is-active', active);
            tab.classList.toggle('has-changes', state.dirty.has(code));
            tab.setAttribute('aria-selected', String(active));
        });
    };

    const updateSaveButton = () => {
        saveButton.disabled = state.isSubmitting || state.dirty.size === 0;
        saveButton.textContent = state.isSubmitting ? '저장 중...' : '배너 설정 저장';
    };

    const selectPlacement = (placement) => {
        state.activePlacement = placement;
        renderTabs();
        creativeList.querySelectorAll('[data-placement]').forEach((section) => {
            section.hidden = section.dataset.placement !== placement;
        });
    };

    const render = () => {
        if (!state.data) return;
        creativeList.innerHTML = state.data.creatives.map(renderCreativeSection).join('');
        renderTabs();
        updateSaveButton();
    };

    const refreshImageControl = (placement) => {
        const control = pageRoot.querySelector(`[data-image-control="${placement}"]`);
        const creative = getCreative(placement);
        if (control && creative) control.innerHTML = renderImageControl(placement, creative.label);
    };

    const markDirty = (placement) => {
        if (!placement) return;
        state.dirty.add(placement);
        renderTabs();
        updateSaveButton();
    };

    const load = async () => {
        const response = await APIClient.get('/users/me/banner-ads/creatives');
        state.data = response?.content || null;
        state.pendingImages = {};
        state.removedImages.clear();
        state.dirty.clear();
        render();
    };

    const readCreative = (placement) => {
        const linkMode = document.getElementById(`banner-ad-link-mode-${placement}`)?.value || 'own';
        return {
            placement,
            label: getCreative(placement)?.label || placement,
            title: document.getElementById(`banner-ad-title-${placement}`)?.value.trim() || '',
            imageUrl: state.pendingImages[placement] || '',
            removeImage: !state.pendingImages[placement] && state.removedImages.has(placement),
            linkMode,
            linkUrl: (() => {
                if (linkMode !== 'custom') return '';
                const address = stripLinkScheme(document.getElementById(`banner-ad-link-${placement}`)?.value);
                return address ? `${LINK_PREFIX}${address}` : '';
            })()
        };
    };

    // 변경된 위치만 순서대로 저장한다. 검증에 실패하면 아무것도 저장하지 않는다.
    const saveAll = async () => {
        if (state.isSubmitting || !state.dirty.size) return;
        const targets = [...state.dirty].map(readCreative);
        const invalid = targets.find((item) => item.linkMode === 'custom' && !item.linkUrl);
        if (invalid) {
            selectPlacement(invalid.placement);
            alert(`${invalid.label} 배너의 이동할 주소를 입력해주세요.`);
            return;
        }
        const removing = targets.filter((item) => item.removeImage);
        if (removing.length && !window.confirm(`${removing.map((item) => item.label).join(', ')} 배너 이미지를 삭제합니다.\n이미지가 없으면 낙찰되어도 배너가 노출되지 않습니다. 저장할까요?`)) {
            return;
        }

        state.isSubmitting = true;
        updateSaveButton();
        const saved = [];
        try {
            for (const item of targets) {
                await APIClient.put(`/users/me/banner-ads/creatives/${item.placement}`, {
                    title: item.title,
                    imageUrl: item.imageUrl,
                    removeImage: item.removeImage,
                    linkUrl: item.linkUrl
                });
                saved.push(item);
            }
            alert('배너 설정이 저장되었습니다.');
            await load();
        } catch (error) {
            const savedText = saved.length ? `${saved.map((item) => item.label).join(', ')} 배너는 저장되었습니다.\n` : '';
            alert(`${savedText}${error.message || '배너 설정을 저장하지 못했습니다.'}`);
            saved.forEach((item) => state.dirty.delete(item.placement));
            renderTabs();
        } finally {
            state.isSubmitting = false;
            updateSaveButton();
        }
    };

    pageRoot.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const placementTab = target.closest('[data-placement-tab]');
        if (placementTab) {
            selectPlacement(placementTab.dataset.placementTab);
            return;
        }
        const trigger = target.closest('[data-image-trigger]');
        if (trigger) {
            pageRoot.querySelector(`[data-image-input="${trigger.dataset.imageTrigger}"]`)?.click();
            return;
        }
        const clear = target.closest('[data-image-clear]');
        if (clear) {
            const placement = clear.dataset.imageClear;
            delete state.pendingImages[placement];
            if (getCreative(placement)?.imageUrl) state.removedImages.add(placement);
            const input = pageRoot.querySelector(`[data-image-input="${placement}"]`);
            if (input) input.value = '';
            refreshImageControl(placement);
            markDirty(placement);
        }
    });

    pageRoot.addEventListener('input', (event) => {
        const linkInput = event.target instanceof HTMLInputElement && event.target.dataset.linkInput ? event.target : null;
        if (linkInput && /^https?:\/\//i.test(linkInput.value.trim())) linkInput.value = stripLinkScheme(linkInput.value);
        markDirty(event.target?.closest?.('[data-placement]')?.dataset.placement);
    });

    pageRoot.addEventListener('change', (event) => {
        const target = event.target;
        const placement = target?.closest?.('[data-placement]')?.dataset.placement;

        if (target instanceof HTMLSelectElement && target.dataset.linkMode) {
            const linkWrap = document.getElementById(`banner-ad-link-wrap-${target.dataset.linkMode}`);
            if (linkWrap) linkWrap.hidden = target.value !== 'custom';
            markDirty(placement);
            return;
        }

        if (!(target instanceof HTMLInputElement) || !target.dataset.imageInput || !target.files?.[0]) return;
        const key = target.dataset.imageInput;
        const file = target.files[0];
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert('JPG, JPEG, PNG, GIF, WEBP 파일만 등록할 수 있습니다.');
            target.value = '';
            return;
        }
        if (file.size > IMAGE_MAX_BYTES) {
            alert('배너 이미지는 5MB 이하만 등록할 수 있습니다.');
            target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            state.pendingImages[key] = String(reader.result || '');
            state.removedImages.delete(key);
            refreshImageControl(key);
            markDirty(key);
        };
        reader.readAsDataURL(file);
    });

    saveButton.addEventListener('click', saveAll);

    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    renderTabs();
    updateSaveButton();
    load().catch((error) => {
        creativeList.innerHTML = '';
        alert(error.message || '배너광고 정보를 불러오지 못했습니다.');
    });
})();
