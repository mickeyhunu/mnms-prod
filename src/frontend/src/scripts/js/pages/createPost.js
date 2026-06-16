/**
 * 파일 역할: createPost 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let isEditMode = false;
let editingPostId = null;
let existingImageUrls = [];
let isBusinessUser = false;

const MAX_POST_IMAGE_COUNT = 5;
const MAX_POST_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_COMPRESSION_TARGET_BYTES = 3 * 1024 * 1024;
const IMAGE_RESIZE_MAX_DIMENSION = 1920;
const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DIRECT_UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

function getFileMimeType(file) {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();

    if (/\.jpe?g$/.test(name)) return 'image/jpeg';
    if (/\.png$/.test(name)) return 'image/png';
    if (/\.gif$/.test(name)) return 'image/gif';
    if (/\.webp$/.test(name)) return 'image/webp';
    if (/\.heic$/.test(name)) return 'image/heic';
    if (/\.heif$/.test(name)) return 'image/heif';

    if (type && type !== 'application/octet-stream') return type;

    // 일부 모바일 브라우저는 갤러리 사진명을 `image:...` 또는 `image%3A...`처럼 주고 MIME 타입을 비워둡니다.
    if (/^image(?::|%3a)/i.test(name)) return 'image/jpeg';

    return '';
}

function hasKnownNonImageExtension(file) {
    const name = String(file?.name || '').toLowerCase();
    if (!/\.[a-z0-9]{2,10}$/.test(name)) return false;
    return !/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name);
}

function isImageFile(file) {
    const mimeType = getFileMimeType(file);
    if (mimeType) return mimeType.startsWith('image/');

    // accept="image/*"로 열린 모바일 선택기는 실제 이미지여도 type/name이 비어 있을 수 있어 우선 허용하고, 제출 직전에 헤더로 재검증합니다.
    return !hasKnownNonImageExtension(file);
}

async function detectImageMimeTypeFromHeader(file) {
    try {
        const headerBuffer = await file.slice(0, 16).arrayBuffer();
        const bytes = new Uint8Array(headerBuffer);
        const ascii = Array.from(bytes).map((byte) => String.fromCharCode(byte)).join('');

        if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
        if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'image/gif';
        if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
        if (ascii.slice(4, 8) === 'ftyp' && /(heic|heix|hevc|hevx|mif1|msf1)/i.test(ascii.slice(8, 16))) {
            return 'image/heic';
        }
    } catch (_error) {
        return '';
    }

    return '';
}

function normalizeDataUrlMimeType(dataUrl, mimeType) {
    const normalizedMimeType = String(mimeType || '').toLowerCase();
    if (!normalizedMimeType.startsWith('image/')) return dataUrl;

    return String(dataUrl || '').replace(/^data:[^;,]*;base64,/i, `data:${normalizedMimeType};base64,`);
}

function estimateDataUrlBytes(dataUrl) {
    const base64Body = String(dataUrl || '').split(',')[1] || '';
    if (!base64Body) return 0;
    const padding = base64Body.endsWith('==') ? 2 : (base64Body.endsWith('=') ? 1 : 0);
    return Math.floor((base64Body.length * 3) / 4) - padding;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('이미지 미리보기 변환에 실패했습니다.'));
        };
        image.src = imageUrl;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('이미지 압축에 실패했습니다.'));
        }, type, quality);
    });
}

async function compressImageFile(file) {
    const image = await loadImageFromFile(file);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, IMAGE_RESIZE_MAX_DIMENSION / Math.max(originalWidth, originalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.85;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob.size > IMAGE_COMPRESSION_TARGET_BYTES && quality > 0.45) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (blob.size > IMAGE_COMPRESSION_TARGET_BYTES) {
        const reducedCanvas = document.createElement('canvas');
        reducedCanvas.width = Math.max(1, Math.round(canvas.width * 0.75));
        reducedCanvas.height = Math.max(1, Math.round(canvas.height * 0.75));
        reducedCanvas.getContext('2d').drawImage(canvas, 0, 0, reducedCanvas.width, reducedCanvas.height);
        blob = await canvasToBlob(reducedCanvas, 'image/jpeg', 0.65);
    }

    if (blob.size > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }

    return readFileAsDataUrl(blob);
}

async function prepareImageForUpload(file) {
    const declaredMimeType = getFileMimeType(file);
    const headerMimeType = await detectImageMimeTypeFromHeader(file);
    const mimeType = headerMimeType || declaredMimeType;

    if (!DIRECT_UPLOAD_IMAGE_TYPES.includes(mimeType)) {
        throw new Error('JPG, PNG, GIF, WEBP, HEIC 이미지만 업로드할 수 있습니다.');
    }

    if (file.size > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }

    if (mimeType === 'image/gif') {
        return normalizeDataUrlMimeType(await readFileAsDataUrl(file), mimeType);
    }

    if (COMPRESSIBLE_IMAGE_TYPES.includes(mimeType)) {
        try {
            return await compressImageFile(file);
        } catch (error) {
            // iOS/Android 일부 브라우저는 HEIC 또는 content URI 이미지를 canvas로 열지 못할 수 있습니다.
            // 서버 허용 용량(8MB) 이내라면 원본 data URL로 폴백해 모바일 업로드 실패를 방지합니다.
            console.warn('이미지 압축 실패, 원본 업로드로 전환:', error);
        }
    }

    const dataUrl = normalizeDataUrlMimeType(await readFileAsDataUrl(file), mimeType);
    if (estimateDataUrlBytes(dataUrl) > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }
    return dataUrl;
}

function getModeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const postId = params.get('postId') || params.get('id');

    isEditMode = mode === 'edit' && Boolean(postId);
    editingPostId = isEditMode ? postId : null;
}

async function initCreatePost() {
    getModeFromQuery();
    setupEventListeners();
    setupImageUpload();
    await setupBoardOptions();
    setupModeUI();
    validateForm();

    if (isEditMode) {
        await loadPostForEdit();
    }
}

function setupModeUI() {
    const submitBtn = document.getElementById('submit-btn');
    const boardName = document.querySelector('.community-board-name');
    const description = document.querySelector('.main-content .text-muted');

    if (boardName) {
        boardName.textContent = isEditMode ? '게시글 수정' : '새 글 작성';
    }

    if (description) {
        description.textContent = isEditMode
            ? '기존 게시글 내용을 수정해보세요'
            : '미드나잇 맨즈에 새로운 이야기를 공유해보세요';
    }

    if (submitBtn) {
        submitBtn.textContent = isEditMode ? '수정' : '등록';
    }
}

async function setupBoardOptions() {
    const boardTypeSelect = document.getElementById('board-type');
    if (!boardTypeSelect) return;

    let me = Auth.getUser();
    if (!me) {
        try {
            me = await APIClient.get('/auth/me');
        } catch (_error) {
            me = null;
        }
    }

    isBusinessUser = Boolean(me?.isBusiness || me?.isAdvertiser || String(me?.role || '').toUpperCase() === 'BUSINESS');
    const isAdmin = Boolean(me?.isAdmin || String(me?.role || '').toUpperCase() === 'ADMIN');

    if (!isAdmin) {
        const eventOption = Array.from(boardTypeSelect.options).find((option) => option.value === 'EVENT');
        if (eventOption) {
            eventOption.remove();
        }
    }

    if (!isBusinessUser && !isAdmin) {
        const promotionOption = Array.from(boardTypeSelect.options).find((option) => option.value === 'PROMOTION');
        if (promotionOption) {
            promotionOption.remove();
        }
        if (boardTypeSelect.value === 'PROMOTION') {
            boardTypeSelect.value = 'FREE';
        }
        return;
    }

    if (!isBusinessUser) return;

    boardTypeSelect.value = 'PROMOTION';
    Array.from(boardTypeSelect.options)
        .filter((option) => option.value !== 'PROMOTION')
        .forEach((option) => option.remove());
}

function setupEventListeners() {
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const boardTypeSelect = document.getElementById('board-type');

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

    if (boardTypeSelect) {
        boardTypeSelect.addEventListener('change', validateForm);
    }

}

function setupImageUpload() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput) return;

    imageInput.addEventListener('change', function(event) {
        const files = event.target.files;
        const maxNewImageCount = MAX_POST_IMAGE_COUNT - existingImageUrls.length;
        const selectedFiles = Array.from(files);

        if (selectedFiles.some((file) => !isImageFile(file))) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            imageInput.value = '';
            renderImagePreview();
            return;
        }

        if (selectedFiles.length > maxNewImageCount) {
            alert(`현재 기존 이미지를 포함해 최대 ${MAX_POST_IMAGE_COUNT}개까지 업로드할 수 있습니다. (추가 가능: ${Math.max(0, maxNewImageCount)}개)`);
            imageInput.value = '';
            renderImagePreview();
            return;
        }

        renderImagePreview();
    });
}

function renderImagePreview() {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    existingImageUrls.forEach((imageUrl, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview-item';
        previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
        previewDiv.innerHTML = `
            <img src="${sanitizeHTML(imageUrl)}" alt="기존 이미지 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
            <button type="button" onclick="removeExistingImage(${index})" class="remove-image-btn" aria-label="기존 이미지 삭제" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
            <small style="display:block;text-align:center;margin-top:4px;color:#666;">기존 이미지</small>
        `;
        previewContainer.appendChild(previewDiv);
    });

    const files = document.getElementById('image-files')?.files || [];

    Array.from(files).forEach((file, index) => {
        if (!isImageFile(file)) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="미리보기 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
                <button type="button" onclick="removeImage(${index})" class="remove-image-btn" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
                <small style="display:block;text-align:center;margin-top:4px;color:#666;">새 이미지</small>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

function handlePostSubmitSuccess() {
    window.location.href = '/community';
}

function removeImage(index) {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files) return;

    const dt = new DataTransfer();
    Array.from(imageInput.files).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    imageInput.files = dt.files;
    renderImagePreview();
}

function removeExistingImage(index) {
    existingImageUrls = existingImageUrls.filter((_, i) => i !== index);
    renderImagePreview();
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
    const boardTypeSelect = document.getElementById('board-type');
    if (!title || !content || !submitBtn) return;

    const hasSelectedBoard = isBusinessUser || Boolean(boardTypeSelect?.value);
    const isValid = hasSelectedBoard &&
        title.value.trim().length > 0 &&
        content.value.trim().length >= 6 &&
        title.value.length <= 255 &&
        content.value.length <= 1000;

    submitBtn.disabled = !isValid || isSubmitting;
}

function readSelectedImagesAsDataUrls() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        return Promise.resolve([]);
    }

    const imageFiles = Array.from(imageInput.files)
        .filter(isImageFile)
        .slice(0, MAX_POST_IMAGE_COUNT - existingImageUrls.length);

    return Promise.all(imageFiles.map(prepareImageForUpload));
}

async function loadPostForEdit() {
    try {
        const response = await APIClient.get(`/posts/${editingPostId}`);
        const post = response.post || response;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');

        if (titleInput) titleInput.value = post.title || '';
        if (contentInput) contentInput.value = post.content || '';

        const boardTypeSelect = document.getElementById('board-type');
        if (boardTypeSelect && post.boardType) {
            boardTypeSelect.value = String(post.boardType).toUpperCase();
        }

        const normalizedImageUrls = Array.isArray(post.imageUrls)
            ? post.imageUrls
            : Array.isArray(post.images)
                ? post.images
                : (post.imageUrl ? [post.imageUrl] : []);

        existingImageUrls = normalizedImageUrls
            .map((url) => String(url || '').trim())
            .filter((url) => url.length > 0)
            .slice(0, MAX_POST_IMAGE_COUNT);
        renderImagePreview();

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
    const boardTypeSelect = document.getElementById('board-type');
    const boardType = isBusinessUser
        ? 'PROMOTION'
        : (boardTypeSelect?.value || '');
    const isNotice = false;
    const noticeTargetBoards = [];

    if (!boardType) {
        alert('게시판을 선택해주세요.');
        boardTypeSelect?.focus();
        return;
    }

    if (!titleValue || !contentValue) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (contentValue.length < 6) {
        alert('내용은 최소 6자 이상 입력해주세요.');
        return;
    }

    if (!validateNoBlockedExpression(titleValue, '게시글 제목')) {
        return;
    }

    if (!validateNoBlockedExpression(contentValue, '게시글 내용')) {
        return;
    }

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
    }

    try {
        const imageUrls = await readSelectedImagesAsDataUrls();
        const payload = {
            title: titleValue,
            content: contentValue,
            boardType,
            isNotice,
            noticeType: isNotice ? 'IMPORTANT' : null,
            noticeTargetBoards,
            imageUrls: [...existingImageUrls, ...imageUrls].slice(0, MAX_POST_IMAGE_COUNT)
        };

        if (isEditMode) {
            await APIClient.put(`/posts/${editingPostId}`, payload);
        } else {
            await APIClient.post('/posts', payload);
        }

        alert(isEditMode ? '글이 수정되었습니다!' : '글이 작성되었습니다!');
        handlePostSubmitSuccess();
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
            submitBtn.textContent = isEditMode ? '수정' : '등록';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}
