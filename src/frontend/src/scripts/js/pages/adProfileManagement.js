/**
 * 파일 역할: business-info(광고프로필 관리) 페이지의 입력/미리보기/저장 상호작용을 담당하는 스크립트 파일.
 */
const REGION_DISTRICT_MAP = {
    서울: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    경기: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
    인천: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
    부산: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
    대구: ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    광주: ['광산구', '남구', '동구', '북구', '서구'],
    대전: ['대덕구', '동구', '서구', '유성구', '중구'],
    울산: ['남구', '동구', '북구', '울주군', '중구'],
    강원: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
    경남: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
    경북: ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
    전남: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    전북: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
    충남: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
    충북: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청원군', '청주시', '충주시'],
    세종: ['세종시'],
    제주: ['서귀포시', '제주시']
};

const adProfileState = {
    currentAdId: null,
    uploadedImageUrl: '',
    me: null,
    isSaving: false,
    syncPreview: null
};
const DEFAULT_AD_IMAGE_URL = 'https://image.bubblealba.com/assets/advertiser/pending.webp';
const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const EDITOR_TEXT_STYLE_COMMANDS = ['bold', 'italic', 'underline'];
const EDITOR_STATE_COMMANDS = [...EDITOR_TEXT_STYLE_COMMANDS, 'insertUnorderedList'];
const EDITOR_DEFAULT_FONT_SIZE = 15;
const EDITOR_FONT_SIZE_STYLE_PROPERTY = 'font-size';
const EDITOR_FONT_SIZE_OPTIONS = Array.from({ length: 15 }, (_, index) => 11 + (index * 2));
const EDITOR_COLOR_PALETTE = [
    '#212529', '#495057', '#868e96', '#ced4da', '#ffffff', '#fff3bf', '#ffd8a8', '#ffc9c9',
    '#ff8787', '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a', '#a61e4d', '#862e9c',
    '#f783ac', '#e599f7', '#da77f2', '#be4bdb', '#9c36b5', '#7048e8', '#5c7cfa', '#339af0',
    '#74c0fc', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#12b886', '#40c057', '#82c91e',
    '#c0eb75', '#8ce99a', '#63e6be', '#38d9a9', '#20c997', '#2b8a3e', '#5c940d', '#f59f00',
    '#ffd43b', '#fab005', '#fd7e14', '#e8590c', '#d9480f', '#7f4f24', '#343a40', '#000000'
];

function normalizeEditorColor(value) {
    const color = String(value || '').trim().toLowerCase();
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        return `#${rgbMatch.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
    }
    return color;
}

function getEditorElementFromSelection(descriptionEditor) {
    const selection = window.getSelection();
    const selectedNode = selection?.anchorNode;
    if (!selectedNode) return null;
    const selectedElement = selectedNode.nodeType === Node.ELEMENT_NODE ? selectedNode : selectedNode.parentElement;
    return selectedElement && descriptionEditor?.contains(selectedElement) ? selectedElement : null;
}

function normalizeEditorFontSize(fontSize) {
    const parsedFontSize = Number.parseInt(fontSize, 10);
    const fallbackFontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : EDITOR_DEFAULT_FONT_SIZE;
    return EDITOR_FONT_SIZE_OPTIONS.reduce((closestSize, optionSize) => {
        const currentDistance = Math.abs(optionSize - fallbackFontSize);
        const closestDistance = Math.abs(closestSize - fallbackFontSize);
        return currentDistance < closestDistance ? optionSize : closestSize;
    }, EDITOR_DEFAULT_FONT_SIZE);
}

function setEditorElementFontSize(element, fontSize) {
    if (!element?.style) return;
    element.style.setProperty(EDITOR_FONT_SIZE_STYLE_PROPERTY, `${fontSize}px`, 'important');
}

function getEditorFontSizeFromSelection(descriptionEditor) {
    let element = getEditorElementFromSelection(descriptionEditor);
    while (element && element !== descriptionEditor) {
        const inlineFontSize = element.style?.fontSize;
        if (inlineFontSize) return normalizeEditorFontSize(inlineFontSize);
        element = element.parentElement;
    }
    return EDITOR_DEFAULT_FONT_SIZE;
}

function runWithPreservedEditorSelection(descriptionEditor, callback) {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const container = range?.commonAncestorContainer?.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range?.commonAncestorContainer?.parentElement;

    if (!range || !container || !descriptionEditor?.contains(container)) {
        callback();
        return;
    }

    const markerId = `ad-editor-selection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startMarker = document.createElement('span');
    const endMarker = document.createElement('span');
    startMarker.id = `${markerId}-start`;
    endMarker.id = `${markerId}-end`;
    startMarker.style.display = 'none';
    endMarker.style.display = 'none';

    const workingRange = range.cloneRange();
    workingRange.collapse(false);
    workingRange.insertNode(endMarker);
    workingRange.setStart(range.startContainer, range.startOffset);
    workingRange.collapse(true);
    workingRange.insertNode(startMarker);

    callback();

    const restoredStartMarker = document.getElementById(startMarker.id);
    const restoredEndMarker = document.getElementById(endMarker.id);
    if (!restoredStartMarker || !restoredEndMarker) return;

    const restoredRange = document.createRange();
    restoredRange.setStartAfter(restoredStartMarker);
    restoredRange.setEndBefore(restoredEndMarker);
    selection.removeAllRanges();
    selection.addRange(restoredRange);
    restoredStartMarker.remove();
    restoredEndMarker.remove();
}

function replaceEditorFontTags(descriptionEditor, fontSize) {
    if (!descriptionEditor) return;
    runWithPreservedEditorSelection(descriptionEditor, () => {
        descriptionEditor.querySelectorAll('font[size="7"]').forEach((fontElement) => {
            const span = document.createElement('span');
            setEditorElementFontSize(span, fontSize);
            span.innerHTML = fontElement.innerHTML;
            fontElement.replaceWith(span);
        });
    });
}


function getEditorRangeContainer(range) {
    if (!range) return null;
    return range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
}

function isEditorRange(descriptionEditor, range) {
    const container = getEditorRangeContainer(range);
    return Boolean(container && descriptionEditor?.contains(container));
}

function applyEditorFontSizeToRange(descriptionEditor, range, fontSize) {
    if (!descriptionEditor || !range) return false;

    if (range.collapsed) {
        document.execCommand('fontSize', false, '7');
        replaceEditorFontTags(descriptionEditor, fontSize);
        return true;
    }

    const fontSizeSpan = document.createElement('span');
    setEditorElementFontSize(fontSizeSpan, fontSize);
    fontSizeSpan.appendChild(range.extractContents());
    range.insertNode(fontSizeSpan);

    const selection = window.getSelection();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(fontSizeSpan);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);

    return true;
}

function resolveEditorAlignmentCommand() {
    if (document.queryCommandState('justifyCenter')) return 'justifyCenter';
    if (document.queryCommandState('justifyRight')) return 'justifyRight';
    return 'justifyLeft';
}

function buildEditorFontSizeOptions(fontSizeSelect) {
    if (!fontSizeSelect) return;
    fontSizeSelect.innerHTML = EDITOR_FONT_SIZE_OPTIONS.map((size) => (
        `<option value="${size}"${size === EDITOR_DEFAULT_FONT_SIZE ? ' selected' : ''}>${size}</option>`
    )).join('');
}

function buildEditorPalette(panel) {
    if (!panel) return;
    panel.innerHTML = EDITOR_COLOR_PALETTE.map((color) => `
        <button type="button" class="ad-profile-editor-color-option" data-editor-palette-color="${color}" style="background-color: ${color};" title="${color}" aria-label="${color}"></button>
    `).join('');
}


function createHourOptions(hourSelect) {
    if (!hourSelect) return;
    const options = ['시간선택'];
    for (let hour = 0; hour <= 24; hour += 1) {
        options.push(`${String(hour).padStart(2, '0')}:00`);
    }

    hourSelect.innerHTML = options
        .map((label, index) => `<option value="${index === 0 ? '' : label}">${label}</option>`)
        .join('');
}

function updateSelectOptions(selectElement, values, placeholder = '선택') {
    if (!selectElement) return;

    const options = [`<option value="" selected>${placeholder}</option>`]
        .concat(values.map((value) => `<option value="${value}">${value}</option>`));

    selectElement.innerHTML = options.join('');
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
        reader.readAsDataURL(file);
    });
}

async function uploadAdImage(file) {
    const dataUrl = await fileToDataUrl(file);
    const response = await APIClient.post('/uploads/ads/images', {
        files: [{
            dataUrl,
            fileName: file.name || 'ad-profile-image.png'
        }]
    });

    const uploaded = Array.isArray(response?.files) ? response.files[0] : null;
    if (!uploaded?.url) {
        throw new Error('대표이미지 업로드에 실패했습니다.');
    }

    return uploaded.url;
}

function bindAdProfileInteractions() {
    const regionSelect = document.getElementById('ad-profile-region');
    const districtSelect = document.getElementById('ad-profile-district');
    const categorySelect = document.getElementById('ad-profile-category');
    const openHourSelect = document.getElementById('ad-profile-open-hour');
    const closeHourSelect = document.getElementById('ad-profile-close-hour');
    const titleInput = document.getElementById('ad-profile-title');
    const businessNameInput = document.getElementById('ad-profile-name');
    const managerNameInput = document.getElementById('ad-profile-manager');
    const managerContactInput = document.getElementById('ad-profile-manager-contact');
    const descriptionInput = document.getElementById('ad-profile-description');
    const descriptionEditor = document.getElementById('ad-profile-description-editor');
    const editorToolbar = document.querySelector('.ad-profile-editor-toolbar');
    const editorFontSizeSelect = document.getElementById('ad-profile-editor-font-size');
    const editorImageButton = document.getElementById('ad-profile-editor-image-btn');
    const editorImageInput = document.getElementById('ad-profile-editor-image-input');
    let lastEditorRange = null;
    let pendingEditorFontSize = EDITOR_DEFAULT_FONT_SIZE;

    const previewTitle = document.getElementById('ad-profile-preview-title');
    const previewManager = document.getElementById('ad-profile-preview-manager');
    const previewDetail = document.getElementById('ad-profile-preview-detail');

    const syncDescriptionValue = () => {
        if (!descriptionInput || !descriptionEditor) return '';
        const html = descriptionEditor.innerHTML.trim();
        descriptionInput.value = html;
        return descriptionEditor.textContent?.trim() || '';
    };

    createHourOptions(openHourSelect);
    createHourOptions(closeHourSelect);
    updateSelectOptions(regionSelect, Object.keys(REGION_DISTRICT_MAP));
    buildEditorFontSizeOptions(editorFontSizeSelect);
    editorToolbar?.querySelectorAll('[data-editor-popover-panel="font-color"], [data-editor-popover-panel="font-bg-color"]')
        .forEach(buildEditorPalette);

    const syncPreview = () => {
        const storeName = businessNameInput?.value?.trim() || '업소명';
        const title = titleInput?.value?.trim() || '제목을 입력해주세요.';
        syncDescriptionValue();
        const region = regionSelect?.value?.trim() || '선택';
        const district = districtSelect?.value?.trim() || '선택';
        const category = categorySelect?.value?.trim() || '선택';
        const managerName = managerNameInput?.value?.trim() || '담당자';
        const managerContact = managerContactInput?.value?.trim() || '연락처';
        const openHour = openHourSelect?.value?.trim() || '시간선택';
        const closeHour = closeHourSelect?.value?.trim() || '시간선택';
        const isOpenHourSelected = openHour && openHour !== '시간선택';
        const isCloseHourSelected = closeHour && closeHour !== '시간선택';
        const formattedTime = (isOpenHourSelected && isCloseHourSelected)
            ? `${openHour} ~ ${closeHour}`
            : '시간선택 ~ 시간선택';

        if (previewTitle) previewTitle.textContent = `[${region}-${storeName}] ${title}`;
        if (previewManager) previewManager.textContent = `${managerName} · ${managerContact}`;
        if (previewDetail) previewDetail.textContent = `${region} ${district} · ${category} · ${formattedTime}`;
    };

    const saveEditorSelection = () => {
        if (!descriptionEditor) return;
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (isEditorRange(descriptionEditor, range)) {
            lastEditorRange = range.cloneRange();
        }
    };

    const restoreEditorSelection = () => {
        if (!descriptionEditor || !lastEditorRange) return;
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(lastEditorRange);
    };

    const closeEditorPopovers = (exceptName = '') => {
        editorToolbar?.querySelectorAll('[data-editor-popover]').forEach((button) => {
            const isExcepted = button.dataset.editorPopover === exceptName;
            if (!isExcepted) button.setAttribute('aria-expanded', 'false');
        });
        editorToolbar?.querySelectorAll('[data-editor-popover-panel]').forEach((panel) => {
            const isExcepted = panel.dataset.editorPopoverPanel === exceptName;
            if (!isExcepted) panel.classList.remove('is-open');
        });
    };

    const getEditorTextStyleButtonState = (styleCommand) => {
        const button = editorToolbar?.querySelector(`[data-editor-command="${styleCommand}"]`);
        return button?.getAttribute('aria-pressed') === 'true'
            || button?.classList.contains('is-active')
            || document.queryCommandState(styleCommand);
    };

    const applyEditorCommand = (command, value = null) => {
        if (!descriptionEditor) return;
        restoreEditorSelection();
        descriptionEditor.focus();

        const isTextStyleCommand = EDITOR_TEXT_STYLE_COMMANDS.includes(command);
        const desiredTextStyleStates = isTextStyleCommand
            ? Object.fromEntries(EDITOR_TEXT_STYLE_COMMANDS.map((styleCommand) => {
                const isActive = getEditorTextStyleButtonState(styleCommand);
                return [styleCommand, styleCommand === command ? !isActive : isActive];
            }))
            : null;

        document.execCommand(command, false, value);

        if (desiredTextStyleStates) {
            EDITOR_TEXT_STYLE_COMMANDS.forEach((styleCommand) => {
                if (document.queryCommandState(styleCommand) !== desiredTextStyleStates[styleCommand]) {
                    document.execCommand(styleCommand, false, null);
                }
            });
        }

        saveEditorSelection();
        syncPreview();
        updateActiveEditorButtons();
    };

    const applyEditorFontSize = (fontSize) => {
        if (!descriptionEditor) return;
        const normalizedFontSize = normalizeEditorFontSize(fontSize);
        pendingEditorFontSize = normalizedFontSize;
        restoreEditorSelection();
        descriptionEditor.focus();

        const selection = window.getSelection();
        const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : lastEditorRange;
        if (isEditorRange(descriptionEditor, activeRange)) {
            applyEditorFontSizeToRange(descriptionEditor, activeRange, normalizedFontSize);
        }
        replaceEditorFontTags(descriptionEditor, normalizedFontSize);

        saveEditorSelection();
        syncPreview();
        updateActiveEditorButtons();
        pendingEditorFontSize = normalizedFontSize;
        if (editorFontSizeSelect) editorFontSizeSelect.value = String(normalizedFontSize);
    };

    const updateActiveEditorButtons = () => {
        if (!editorToolbar || !descriptionEditor) return;
        const selection = window.getSelection();
        const selectedNode = selection?.anchorNode;
        const isSelectionInEditor = selectedNode && descriptionEditor.contains(selectedNode.nodeType === Node.ELEMENT_NODE ? selectedNode : selectedNode.parentNode);
        if (!isSelectionInEditor && document.activeElement !== descriptionEditor) return;

        const currentFontColor = normalizeEditorColor(document.queryCommandValue('foreColor'));
        const currentBackColor = normalizeEditorColor(document.queryCommandValue('backColor') || document.queryCommandValue('hiliteColor'));
        const currentFontSize = getEditorFontSizeFromSelection(descriptionEditor);
        pendingEditorFontSize = currentFontSize;
        if (editorFontSizeSelect) editorFontSizeSelect.value = String(currentFontSize);

        editorToolbar.querySelectorAll('[data-editor-command]').forEach((button) => {
            const command = button.dataset.editorCommand;
            const isActive = EDITOR_STATE_COMMANDS.includes(command) && document.queryCommandState(command);

            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        editorToolbar.querySelector('[data-editor-popover="font-color"]')?.style.setProperty('text-decoration-color', currentFontColor || '#212529');
        editorToolbar.querySelector('[data-editor-popover="font-bg-color"]')?.style.setProperty('--editor-bg-swatch-color', currentBackColor || 'rgba(255, 235, 59, 0.65)');
        const currentAlignmentCommand = resolveEditorAlignmentCommand();
        editorToolbar.querySelector('[data-editor-popover="align"]')?.setAttribute('data-editor-align', currentAlignmentCommand);
        ['justifyLeft', 'justifyCenter', 'justifyRight'].forEach((command) => {
            const option = editorToolbar.querySelector(`[data-editor-command="${command}"]`);
            option?.setAttribute('aria-checked', command === currentAlignmentCommand ? 'true' : 'false');
        });
    };

    if (descriptionEditor && descriptionInput) {
        descriptionEditor.innerHTML = descriptionInput.value || '';
        descriptionEditor.addEventListener('input', () => {
            replaceEditorFontTags(descriptionEditor, pendingEditorFontSize);
            syncPreview();
            updateActiveEditorButtons();
        });
        descriptionEditor.addEventListener('blur', syncPreview);
        descriptionEditor.addEventListener('keyup', () => {
            saveEditorSelection();
            updateActiveEditorButtons();
        });
        descriptionEditor.addEventListener('mouseup', () => {
            saveEditorSelection();
            updateActiveEditorButtons();
        });
        descriptionEditor.addEventListener('focus', () => {
            saveEditorSelection();
            updateActiveEditorButtons();
        });
        document.addEventListener('selectionchange', updateActiveEditorButtons);
    }

    editorToolbar?.addEventListener('mousedown', (event) => {
        if (event.target.closest('[data-editor-command], [data-editor-popover], [data-editor-palette-color]')) {
            event.preventDefault();
        }
    });

    editorToolbar?.addEventListener('click', (event) => {
        const popoverButton = event.target.closest('[data-editor-popover]');
        if (popoverButton) {
            event.preventDefault();
            const popoverName = popoverButton.dataset.editorPopover;
            const panel = editorToolbar.querySelector(`[data-editor-popover-panel="${popoverName}"]`);
            const shouldOpen = !panel?.classList.contains('is-open');
            closeEditorPopovers(shouldOpen ? popoverName : '');
            panel?.classList.toggle('is-open', shouldOpen);
            popoverButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            return;
        }

        const colorButton = event.target.closest('[data-editor-palette-color]');
        if (colorButton) {
            event.preventDefault();
            const panel = colorButton.closest('[data-editor-popover-panel]');
            const command = panel?.dataset.editorPopoverPanel === 'font-bg-color' ? 'hiliteColor' : 'foreColor';
            applyEditorCommand(command, colorButton.dataset.editorPaletteColor);
            closeEditorPopovers();
            return;
        }

        const button = event.target.closest('[data-editor-command]');
        if (!button || !descriptionEditor) return;

        event.preventDefault();
        applyEditorCommand(button.dataset.editorCommand, button.dataset.editorValue || null);
        if (button.closest('[data-editor-popover-panel]')) closeEditorPopovers();
    });

    editorFontSizeSelect?.addEventListener('mousedown', saveEditorSelection);
    editorFontSizeSelect?.addEventListener('focus', saveEditorSelection);
    editorFontSizeSelect?.addEventListener('change', () => applyEditorFontSize(editorFontSizeSelect.value));

    document.addEventListener('click', (event) => {
        if (!editorToolbar?.contains(event.target)) closeEditorPopovers();
    });

    managerContactInput?.addEventListener('input', () => {
        managerContactInput.value = formatPhoneNumber(managerContactInput.value);
        syncPreview();
    });

    editorImageButton?.addEventListener('click', () => editorImageInput?.click());
    editorImageInput?.addEventListener('change', async () => {
        const file = editorImageInput.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            const imageUrl = await uploadAdImage(file);
            if (!descriptionEditor) return;
            descriptionEditor.focus();
            document.execCommand('insertImage', false, imageUrl);
            syncPreview();
        } catch (error) {
            showSaveMessage(error.message || '에디터 이미지 첨부에 실패했습니다.');
        } finally {
            editorImageInput.value = '';
        }
    });

    regionSelect?.addEventListener('change', () => {
        const selectedRegion = regionSelect.value;
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[selectedRegion] || []);
        syncPreview();
        saveDraftData();
    });

    [districtSelect, categorySelect, openHourSelect, closeHourSelect, titleInput, businessNameInput, managerNameInput, managerContactInput]
        .forEach((element) => {
            element?.addEventListener('input', syncPreview);
            element?.addEventListener('change', syncPreview);
            element?.addEventListener('input', saveDraftData);
            element?.addEventListener('change', saveDraftData);
        });

    descriptionEditor?.addEventListener('input', saveDraftData);
    descriptionEditor?.addEventListener('blur', saveDraftData);

    adProfileState.syncPreview = syncPreview;
    syncPreview();
}

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length === 10 ? 6 : 7)}-${digits.slice(digits.length === 10 ? 6 : 7)}`;
}

function showSaveMessage(message) {
    alert(message);
}

function collectDraftData() {
    return {
        businessName: String(document.getElementById('ad-profile-name')?.value || '').trim(),
        managerName: String(document.getElementById('ad-profile-manager')?.value || '').trim(),
        managerContact: String(document.getElementById('ad-profile-manager-contact')?.value || '').trim(),
        title: String(document.getElementById('ad-profile-title')?.value || '').trim(),
        region: String(document.getElementById('ad-profile-region')?.value || '').trim(),
        district: String(document.getElementById('ad-profile-district')?.value || '').trim(),
        category: String(document.getElementById('ad-profile-category')?.value || '').trim(),
        openHour: String(document.getElementById('ad-profile-open-hour')?.value || '').trim(),
        closeHour: String(document.getElementById('ad-profile-close-hour')?.value || '').trim(),
        description: String(document.getElementById('ad-profile-description')?.value || '').trim()
    };
}

function isAdProfileFormComplete() {
    const draft = collectDraftData();
    return !getRequiredFieldError({
        storeName: draft.businessName,
        managerName: draft.managerName,
        managerContact: draft.managerContact,
        region: draft.region,
        district: draft.district,
        category: draft.category,
        openHour: draft.openHour,
        closeHour: draft.closeHour,
        title: draft.title,
        description: draft.description
    });
}

function stripEmptyValues(payload) {
    return Object.entries(payload || {}).reduce((acc, [key, value]) => {
        if (value === null || value === undefined) return acc;
        const normalized = typeof value === 'string' ? value.trim() : value;
        if (normalized === '') return acc;
        acc[key] = normalized;
        return acc;
    }, {});
}

function hasAnyAdProfileValue(data) {
    if (!data || typeof data !== 'object') return false;

    const plainTextDescription = String(data.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .trim();

    const valuesToCheck = [
        data.businessName,
        data.managerContact,
        data.title,
        data.region,
        data.district,
        data.category,
        data.openHour,
        data.closeHour,
        plainTextDescription
    ];

    return valuesToCheck.some((value) => String(value || '').trim());
}

function updateAdProfileActionButtons() {
    const saveButton = document.getElementById('ad-profile-save-btn');
    const draftButton = document.getElementById('ad-profile-draft-btn');
    const hasAnyValue = hasAnyAdProfileValue(collectDraftData());
    const isComplete = isAdProfileFormComplete();

    saveButton?.classList.toggle('hidden', !isComplete);
    draftButton?.classList.toggle('hidden', isComplete);
    if (draftButton) draftButton.disabled = !hasAnyValue;
}

function saveDraftData() {
    updateAdProfileActionButtons();
}

function getRequiredFieldError({ storeName, managerName, managerContact, region, district, category, openHour, closeHour, title, description }) {
    if (!storeName) return '업소명을 입력해주세요.';
    if (!managerName) return '담당자명을 입력해주세요.';
    if (!managerContact) return '담당자 연락처를 입력해주세요.';
    if (!region) return '지역을 선택해주세요.';
    if (!district) return '세부 지역을 선택해주세요.';
    if (!category) return '업종을 선택해주세요.';
    if (!openHour) return '영업 시작 시간을 선택해주세요.';
    if (!closeHour) return '영업 종료 시간을 선택해주세요.';
    if (!title) return '제목을 입력해주세요.';
    if (!description) return '상세정보 내용을 입력해주세요.';
    return '';
}

async function loadMyAdProfile() {
    const response = await APIClient.get('/users/me/business-ads');
    const existingAd = Array.isArray(response?.content) ? response.content[0] : null;
    adProfileState.currentAdId = Number(existingAd?.id || 0) || null;
    if (existingAd) applyAdProfileToForm(existingAd);
}

async function saveAdProfile({ forceDraft = false } = {}) {
    if (adProfileState.isSaving) return;

    const storeName = String(document.getElementById('ad-profile-name')?.value || '').trim();
    const region = String(document.getElementById('ad-profile-region')?.value || '').trim();
    const district = String(document.getElementById('ad-profile-district')?.value || '').trim();
    const category = String(document.getElementById('ad-profile-category')?.value || '').trim();
    const openHour = String(document.getElementById('ad-profile-open-hour')?.value || '').trim();
    const closeHour = String(document.getElementById('ad-profile-close-hour')?.value || '').trim();
    const title = String(document.getElementById('ad-profile-title')?.value || '').trim();
    const businessName = storeName;
    const managerName = String(document.getElementById('ad-profile-manager')?.value || '').trim();
    const managerContact = String(document.getElementById('ad-profile-manager-contact')?.value || '').trim();
    const description = String(document.getElementById('ad-profile-description')?.value || '').trim();
    const saveButton = document.getElementById('ad-profile-save-btn');
    const draftButton = document.getElementById('ad-profile-draft-btn');
    const registrationStatus = forceDraft ? 'DRAFT' : 'REGISTERED';
    const hasAnyValue = hasAnyAdProfileValue({
        businessName,
        managerContact,
        title,
        region,
        district,
        category,
        openHour,
        closeHour,
        description
    });

    if (forceDraft && !hasAnyValue) {
        showSaveMessage('입력한 항목이 없습니다.');
        updateAdProfileActionButtons();
        return;
    }

    if (!forceDraft) {
        const requiredFieldError = getRequiredFieldError({
            storeName,
            managerName,
            managerContact,
            region,
            district,
            category,
            openHour,
            closeHour,
            title,
            description
        });
        if (requiredFieldError) {
            showSaveMessage(requiredFieldError);
            return;
        }
    }

    try {
        adProfileState.isSaving = true;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';
        }
        if (draftButton) {
            draftButton.disabled = true;
            draftButton.textContent = '저장 중...';
        }

        if (managerContact && !PHONE_PATTERN.test(managerContact)) {
            showSaveMessage('담당자 연락처는 010-0000-0000 형식으로 입력해주세요.');
            return;
        }

        const imageUrl = adProfileState.uploadedImageUrl || (forceDraft ? '' : DEFAULT_AD_IMAGE_URL);

        let payload = {
            businessName,
            managerName,
            managerContact,
            title,
            imageUrl,
            linkUrl: '#',
            region,
            district,
            category,
            openHour,
            closeHour,
            description,
            planType: adProfileState.me?.isBusiness ? 'PREMIUM' : 'NORMAL',
            registrationStatus,
            isActive: !forceDraft,
            displayOrder: 0
        };
        if (forceDraft) {
            payload = {
                ...stripEmptyValues(payload),
                registrationStatus: 'DRAFT',
                isActive: false
            };
        }

        if (adProfileState.currentAdId) {
            await APIClient.put(`/users/me/business-ads/${adProfileState.currentAdId}`, payload);
        } else {
            const created = await APIClient.post('/users/me/business-ads', payload);
            adProfileState.currentAdId = Number(created?.id || 0) || adProfileState.currentAdId;
        }

        if (forceDraft) {
            showSaveMessage('입력한 항목만 임시저장되었습니다.');
            await loadMyAdProfile();
            updateAdProfileActionButtons();
            return;
        }

        showSaveMessage('광고프로필이 저장되었습니다. 업체정보 메뉴에서 확인할 수 있습니다.');
        await loadMyAdProfile();
        window.location.href = '/my-page';
    } catch (error) {
        showSaveMessage(error.message || '광고프로필 저장에 실패했습니다.');
    } finally {
        adProfileState.isSaving = false;
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '광고프로필 저장';
        }
        if (draftButton) {
            draftButton.disabled = false;
            draftButton.textContent = '임시저장';
        }
    }
}

function applyAdProfileToForm(ad) {
    if (!ad) return;

    const storeNameInput = document.getElementById('ad-profile-name');
    const regionSelect = document.getElementById('ad-profile-region');
    const districtSelect = document.getElementById('ad-profile-district');
    const categorySelect = document.getElementById('ad-profile-category');
    const openHourSelect = document.getElementById('ad-profile-open-hour');
    const closeHourSelect = document.getElementById('ad-profile-close-hour');
    const titleInput = document.getElementById('ad-profile-title');
    const businessNameInput = document.getElementById('ad-profile-name');
    const managerNameInput = document.getElementById('ad-profile-manager');
    const managerContactInput = document.getElementById('ad-profile-manager-contact');
    const descriptionInput = document.getElementById('ad-profile-description');
    const descriptionEditor = document.getElementById('ad-profile-description-editor');

    if (storeNameInput) storeNameInput.value = ad.businessName || ad.storeName || '';
    if (managerNameInput) managerNameInput.value = ad.managerName || '';
    if (regionSelect) {
        regionSelect.value = ad.region || '';
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[ad.region] || []);
    }
    if (districtSelect) districtSelect.value = ad.district || '';
    if (categorySelect) categorySelect.value = ad.category || '';
    if (openHourSelect) openHourSelect.value = ad.openHour || '';
    if (closeHourSelect) closeHourSelect.value = ad.closeHour || '';
    if (titleInput) titleInput.value = ad.title || '';
    if (businessNameInput) businessNameInput.value = ad.businessName || '';
    if (managerNameInput) managerNameInput.value = ad.managerName || '';
    if (managerContactInput) managerContactInput.value = formatPhoneNumber(ad.managerContact || '');
    if (descriptionInput) descriptionInput.value = ad.description || '';
    if (descriptionEditor) descriptionEditor.innerHTML = ad.description || '';
    adProfileState.uploadedImageUrl = ad.imageUrl || DEFAULT_AD_IMAGE_URL;
    adProfileState.syncPreview?.();
    updateAdProfileActionButtons();
}

async function initAdProfileManagementPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const me = await APIClient.get('/auth/me');
        adProfileState.me = me;

        const nickname = Auth.resolveNicknameDisplayElement();
        if (nickname) Auth.applyNicknameDisplay(nickname, me);
        const managerNameInput = document.getElementById('ad-profile-manager');
        if (managerNameInput) {
            managerNameInput.value = String(me?.name || me?.nickname || '').trim();
        }

        if (typeof initHeader === 'function') initHeader();
        Auth.bindLogoutButton();
        bindAdProfileInteractions();
        adProfileState.syncPreview?.();

        const saveButton = document.getElementById('ad-profile-save-btn');
        const draftButton = document.getElementById('ad-profile-draft-btn');
        saveButton?.addEventListener('click', () => saveAdProfile({ forceDraft: false }));
        draftButton?.addEventListener('click', () => saveAdProfile({ forceDraft: true }));

        updateAdProfileActionButtons();
        await loadMyAdProfile();
        updateAdProfileActionButtons();
    } catch (error) {
        alert(error.message || '광고프로필 페이지를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdProfileManagementPage, { once: true });
} else {
    initAdProfileManagementPage();
}
