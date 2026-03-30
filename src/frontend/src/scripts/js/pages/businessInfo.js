/**
 * 파일 역할: business-info 페이지의 업체 광고 생성/수정/삭제 UI를 담당하는 스크립트 파일.
 */
let editingBusinessAdId = null;
let businessAdsItems = [];

function setBusinessAdHelpMessage(message, color = '#6c757d') {
    const help = document.getElementById('business-ads-form-help');
    if (!help) return;
    help.textContent = message;
    help.style.color = color;
}

function isValidExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) {
        return false;
    }
}

function normalizeExternalUrl(url) {
    return isValidExternalUrl(url) ? url : '#';
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR');
}

function resetBusinessAdEditor() {
    editingBusinessAdId = null;
    document.getElementById('business-ads-editor-title').textContent = '새 업체 광고 등록';
    document.getElementById('business-ads-save-btn').textContent = '광고 등록';
    document.getElementById('business-ads-cancel-btn')?.classList.add('hidden');
    document.getElementById('business-ads-form-title').value = '';
    document.getElementById('business-ads-form-link-url').value = '';
    document.getElementById('business-ads-form-image-url').value = '';
    document.getElementById('business-ads-form-display-order').value = 0;
    document.getElementById('business-ads-form-is-active').value = 'true';
    document.getElementById('business-ads-form-image-file').value = '';
    document.getElementById('business-ads-form-image-help').textContent = '이미지를 선택하고 업로드 버튼을 누르세요.';
    setBusinessAdHelpMessage('');
}

function fillBusinessAdEditor(ad) {
    editingBusinessAdId = Number(ad.id);
    document.getElementById('business-ads-editor-title').textContent = `업체 광고 수정 #${ad.id}`;
    document.getElementById('business-ads-save-btn').textContent = '광고 수정 저장';
    document.getElementById('business-ads-cancel-btn')?.classList.remove('hidden');
    document.getElementById('business-ads-form-title').value = ad.title || '';
    document.getElementById('business-ads-form-link-url').value = ad.linkUrl || '';
    document.getElementById('business-ads-form-image-url').value = ad.imageUrl || '';
    document.getElementById('business-ads-form-display-order').value = Number(ad.displayOrder || 0);
    document.getElementById('business-ads-form-is-active').value = String(Boolean(ad.isActive));
    document.getElementById('business-ads-form-image-file').value = '';
    document.getElementById('business-ads-form-image-help').textContent = ad?.imageUrl ? '현재 이미지를 사용 중입니다. 새 파일 업로드 시 교체됩니다.' : '이미지를 선택하고 업로드 버튼을 누르세요.';
    setBusinessAdHelpMessage('');
}

function renderBusinessAdsTable() {
    const tbody = document.getElementById('business-ads-tbody');
    if (!tbody) return;

    const total = document.getElementById('business-ads-total');
    if (total) total.textContent = Number(businessAdsItems.length || 0).toLocaleString();

    if (!businessAdsItems.length) {
        tbody.innerHTML = '<tr><td colspan="8">등록된 업체 광고가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = businessAdsItems.map((ad) => `
        <tr>
            <td>${ad.id}</td>
            <td>${sanitizeHTML(ad.title || '')}</td>
            <td><a href="${sanitizeHTML(normalizeExternalUrl(ad.linkUrl || ''))}" target="_blank" rel="noopener noreferrer">링크 열기</a></td>
            <td>${Number(ad.displayOrder || 0)}</td>
            <td>${ad.isActive ? '노출' : '숨김'}</td>
            <td>${formatDate(ad.createdAt || ad.created_at)}</td>
            <td>${formatDate(ad.updatedAt || ad.updated_at)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-secondary" data-business-ad-action="edit" data-business-ad-id="${ad.id}">수정</button>
                <button type="button" class="btn btn-sm btn-danger" data-business-ad-action="delete" data-business-ad-id="${ad.id}">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function loadBusinessAds() {
    const response = await APIClient.get('/users/me/business-ads');
    businessAdsItems = Array.isArray(response.content) ? response.content : [];
    renderBusinessAdsTable();
}

async function uploadBusinessAdImage() {
    const fileInput = document.getElementById('business-ads-form-image-file');
    const imageUrlInput = document.getElementById('business-ads-form-image-url');
    const uploadButton = document.getElementById('business-ads-image-upload-btn');
    const file = fileInput?.files?.[0];

    if (!file) {
        setBusinessAdHelpMessage('먼저 업로드할 이미지를 선택해주세요.', '#dc3545');
        return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
        reader.readAsDataURL(file);
    });

    try {
        uploadButton.disabled = true;
        uploadButton.textContent = '업로드 중...';
        const response = await APIClient.post('/uploads/ads/images', {
            files: [{ dataUrl, fileName: file.name }]
        });
        const uploaded = Array.isArray(response.files) ? response.files[0] : null;
        if (!uploaded?.url) throw new Error('업로드 URL을 받지 못했습니다.');
        imageUrlInput.value = uploaded.url;
        setBusinessAdHelpMessage('업체 광고 이미지가 업로드되었습니다.', '#198754');
    } catch (error) {
        setBusinessAdHelpMessage(error.message || '이미지 업로드에 실패했습니다.', '#dc3545');
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = '이미지 업로드';
    }
}

async function saveBusinessAd() {
    const saveButton = document.getElementById('business-ads-save-btn');
    const payload = {
        title: document.getElementById('business-ads-form-title')?.value?.trim() || '',
        imageUrl: document.getElementById('business-ads-form-image-url')?.value?.trim() || '',
        linkUrl: document.getElementById('business-ads-form-link-url')?.value?.trim() || '',
        displayOrder: Number(document.getElementById('business-ads-form-display-order')?.value || 0) || 0,
        isActive: String(document.getElementById('business-ads-form-is-active')?.value || 'true') === 'true'
    };
    const isEdit = Boolean(editingBusinessAdId);

    if (!payload.title || !payload.imageUrl || !payload.linkUrl) {
        setBusinessAdHelpMessage('제목, 이미지 URL, 링크 URL은 필수입니다.', '#dc3545');
        return;
    }
    if (!isValidExternalUrl(payload.linkUrl)) {
        setBusinessAdHelpMessage('광고 링크 URL은 http:// 또는 https:// 형식이어야 합니다.', '#dc3545');
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = '저장 중...';
        if (isEdit) await APIClient.put(`/users/me/business-ads/${editingBusinessAdId}`, payload);
        else await APIClient.post('/users/me/business-ads', payload);
        await loadBusinessAds();
        resetBusinessAdEditor();
        setBusinessAdHelpMessage('업체 광고가 저장되었습니다.', '#198754');
    } catch (error) {
        setBusinessAdHelpMessage(error.message || '업체 광고 저장에 실패했습니다.', '#dc3545');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = isEdit ? '광고 수정 저장' : '광고 등록';
    }
}

async function deleteBusinessAd(adId) {
    if (!window.confirm('선택한 업체 광고를 삭제하시겠습니까?')) return;
    await APIClient.delete(`/users/me/business-ads/${adId}`);
    await loadBusinessAds();
    if (Number(editingBusinessAdId) === Number(adId)) resetBusinessAdEditor();
}

function bindBusinessInfoEvents() {
    document.getElementById('business-ads-image-upload-btn')?.addEventListener('click', uploadBusinessAdImage);
    document.getElementById('business-ads-save-btn')?.addEventListener('click', saveBusinessAd);
    document.getElementById('business-ads-cancel-btn')?.addEventListener('click', resetBusinessAdEditor);
    document.getElementById('business-ads-tbody')?.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('button[data-business-ad-action]');
        if (!actionButton) return;
        const adId = Number.parseInt(actionButton.dataset.businessAdId || '', 10);
        if (!Number.isInteger(adId) || adId <= 0) return;

        if (actionButton.dataset.businessAdAction === 'edit') {
            const ad = businessAdsItems.find((item) => Number(item.id) === adId);
            if (!ad) return;
            fillBusinessAdEditor(ad);
            document.getElementById('business-ads-editor-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        if (actionButton.dataset.businessAdAction === 'delete') {
            try {
                await deleteBusinessAd(adId);
                setBusinessAdHelpMessage('업체 광고를 삭제했습니다.', '#198754');
            } catch (error) {
                setBusinessAdHelpMessage(error.message || '업체 광고 삭제에 실패했습니다.', '#dc3545');
            }
        }
    });
}

async function initBusinessInfoPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const me = await APIClient.get('/auth/me');
        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);
        if (typeof initHeader === 'function') initHeader();
        Auth.bindLogoutButton();
        bindBusinessInfoEvents();
        resetBusinessAdEditor();
        await loadBusinessAds();
    } catch (error) {
        alert(error.message || '업체 광고 정보를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBusinessInfoPage, { once: true });
} else {
    initBusinessInfoPage();
}
