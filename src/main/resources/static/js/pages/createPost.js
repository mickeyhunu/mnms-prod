let isSubmitting = false;

function initCreatePost() {
    if (!Auth.isAuthenticated()) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }

    setupEventListeners();
    setupImageUpload();
    validateForm();
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

async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const titleValue = document.getElementById('title')?.value.trim() || '';
    const contentValue = document.getElementById('content')?.value.trim() || '';
    const submitBtn = document.getElementById('submit-btn');

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
        submitBtn.textContent = '작성 중...';
    }

    try {
        const imageUrl = await readFirstImageAsDataUrl();
        await APIClient.post('/posts', {
            title: titleValue,
            content: contentValue,
            imageUrl
        });

        alert('글이 작성되었습니다!');
        window.location.href = '/';
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
            submitBtn.textContent = '작성하기';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}
