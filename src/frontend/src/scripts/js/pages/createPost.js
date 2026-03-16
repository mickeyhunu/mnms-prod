/**
 * 파일 역할: createPost 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let isEditMode = false;
let editingPostId = null;
let existingImageUrl = null;

function getModeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const postId = params.get('postId') || params.get('id');

    isEditMode = mode === 'edit' && Boolean(postId);
    editingPostId = isEditMode ? postId : null;
}

function initCreatePost() {
    getModeFromQuery();
    setupEventListeners();
    setupImageUpload();
    setupBoardOptions();
    setupAdminOptions();
    setupModeUI();
    validateForm();

    if (isEditMode) {
        loadPostForEdit();
    }
}

function setupModeUI() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.textContent = '등록';
    }
}

function setupBoardOptions() {
    // 카테고리 선택은 모든 로그인 사용자에게 동일하게 제공됩니다.
}


function setupAdminOptions() {
    const user = Auth.getUser();
    const adminOptionSection = document.getElementById('admin-post-options');
    const noticeCheckbox = document.getElementById('is-notice');
    const noticeTypeWrap = document.getElementById('notice-type-wrap');

    if (!adminOptionSection) return;

    if (!user || !user.isAdmin) {
        adminOptionSection.classList.add('hidden');
        return;
    }

    adminOptionSection.classList.remove('hidden');

    if (noticeCheckbox && noticeTypeWrap) {
        const syncNoticeTypeVisibility = () => {
            noticeTypeWrap.classList.toggle('hidden', !noticeCheckbox.checked);
        };

        noticeCheckbox.addEventListener('change', syncNoticeTypeVisibility);
        syncNoticeTypeVisibility();
    }
}

function setupEventListeners() {
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    if (postForm) {
        postForm.addEventListener('submit', handleSubmit);
    }

    if (titleInput) {
        titleInput.addEventListener('input', function() {
            updateCharCount('title', 255);
            validateForm();
        });
    }

    if (contentInput) {
        contentInput.addEventListener('input', function() {
            updateCharCount('content', 1000);
            validateForm();
        });
    }

}

function setupImageUpload() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput) return;

    imageInput.addEventListener('change', function(event) {
        const files = event.target.files;
        if (files.length > 5) {
            alert('이미지는 최대 5개까지 선택할 수 있습니다.');
            imageInput.value = '';
            displayImagePreview([]);
            return;
        }

        displayImagePreview(files);
    });
}

function displayImagePreview(files) {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="미리보기 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
                <button type="button" onclick="removeImage(${index})" class="remove-image-btn" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

function displayExistingImagePreview(imageUrl) {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer || !imageUrl) return;

    previewContainer.innerHTML = `
        <div class="image-preview-item" style="position: relative; display:inline-block; margin:5px;">
            <img src="${sanitizeHTML(imageUrl)}" alt="기존 이미지" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
            <small style="display:block;text-align:center;margin-top:4px;color:#666;">기존 이미지</small>
        </div>
    `;
}

function removeImage(index) {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files) return;

    const dt = new DataTransfer();
    Array.from(imageInput.files).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    imageInput.files = dt.files;
    displayImagePreview(imageInput.files);
}

function updateCharCount(fieldId, maxLength) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(`${fieldId}-count`);

    if (!field || !counter) return;

    const currentLength = field.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.style.color = currentLength > maxLength ? '#dc3545' : '#6c757d';
}

function validateForm() {
    const title = document.getElementById('title');
    const content = document.getElementById('content');
    const submitBtn = document.getElementById('submit-btn');
    if (!title || !content || !submitBtn) return;

    const isValid = title.value.trim().length > 0 &&
        content.value.trim().length >= 10 &&
        title.value.length <= 255 &&
        content.value.length <= 1000;

    submitBtn.disabled = !isValid || isSubmitting;
}

function readFirstImageAsDataUrl() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        return Promise.resolve(null);
    }

    const first = imageInput.files[0];
    if (!first.type.startsWith('image/')) {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 읽기에 실패했습니다.'));
        reader.readAsDataURL(first);
    });
}

async function loadPostForEdit() {
    try {
        const response = await APIClient.get(`/posts/${editingPostId}`);
        const post = response.post || response;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');

        if (titleInput) titleInput.value = post.title || '';
        if (contentInput) contentInput.value = post.content || '';

        const isNoticeInput = document.getElementById('is-notice');
        const noticeTypeInput = document.getElementById('notice-type');
        const isPinnedInput = document.getElementById('is-pinned');
        const noticeTypeWrap = document.getElementById('notice-type-wrap');

        if (isNoticeInput && Auth.getUser()?.isAdmin) {
            isNoticeInput.checked = Boolean(post.isNotice);
            if (noticeTypeInput) noticeTypeInput.value = post.noticeType || 'NOTICE';
            if (isPinnedInput) isPinnedInput.checked = Boolean(post.isPinned);
            if (noticeTypeWrap) noticeTypeWrap.classList.toggle('hidden', !isNoticeInput.checked);
        }

        existingImageUrl = post.imageUrl || (post.images && post.images[0]) || null;
        if (existingImageUrl) {
            displayExistingImagePreview(existingImageUrl);
        }

        updateCharCount('title', 255);
        updateCharCount('content', 1000);
        validateForm();
    } catch (error) {
        console.error('수정할 게시글 로드 실패:', error);
        alert('수정할 게시글을 불러오지 못했습니다.');
        window.location.href = '/';
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const titleValue = document.getElementById('title')?.value.trim() || '';
    const contentValue = document.getElementById('content')?.value.trim() || '';
    const submitBtn = document.getElementById('submit-btn');
    const boardType = document.getElementById('board-type')?.value || 'FREE';
    const isNotice = document.getElementById('is-notice')?.checked || false;
    const noticeType = document.getElementById('notice-type')?.value || 'NOTICE';
    const isPinned = document.getElementById('is-pinned')?.checked || false;
    const isAdmin = Boolean(Auth.getUser()?.isAdmin);

    if (!titleValue || !contentValue) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (contentValue.length < 10) {
        alert('내용은 최소 10자 이상 입력해주세요.');
        return;
    }

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
    }

    try {
        const newImageUrl = await readFirstImageAsDataUrl();
        const payload = {
            title: titleValue,
            content: contentValue,
            boardType,
            imageUrl: newImageUrl || existingImageUrl
        };

        if (isAdmin) {
            payload.isNotice = isNotice;
            payload.noticeType = isNotice ? noticeType : null;
            payload.isPinned = isPinned;
        }

        if (isEditMode) {
            await APIClient.put(`/posts/${editingPostId}`, payload);
        } else {
            await APIClient.post('/posts', payload);
        }

        alert(isEditMode ? '글이 수정되었습니다!' : '글이 작성되었습니다!');
        window.location.href = isEditMode ? `/post-detail?id=${editingPostId}` : '/';
    } catch (error) {
        console.error('글 작성 에러:', error);
        if (error.status === 401) {
            alert('로그인이 필요합니다. 다시 로그인해주세요.');
            window.location.href = '/login';
            return;
        }

        alert(error.message || '글 작성 중 오류가 발생했습니다.');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '등록';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}
