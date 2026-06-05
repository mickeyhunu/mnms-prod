/**
 * 파일 역할: 광고프로필/게시글 작성에서 함께 쓰는 contenteditable 기반 글 에디터 모듈.
 */
(function initTextEditorModule(global) {
    const TEXT_STYLE_COMMANDS = ['bold', 'italic', 'underline', 'strikeThrough'];
    const ALIGNMENT_COMMANDS = ['justifyLeft', 'justifyCenter', 'justifyRight'];
    const DEFAULT_FONT_SIZE = 15;
    const DEFAULT_BACKGROUND_COLOR = '#ffffff';
    const FONT_SIZE_STYLE_PROPERTY = 'font-size';
    const FONT_SIZE_OPTIONS = Array.from({ length: 15 }, (_, index) => 11 + (index * 2));
    const COLOR_PALETTE = [
        '#212529', '#495057', '#868e96', '#ced4da', '#ffffff', '#fff3bf', '#ffd8a8', '#ffc9c9',
        '#ff8787', '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a', '#a61e4d', '#862e9c',
        '#f783ac', '#e599f7', '#da77f2', '#be4bdb', '#9c36b5', '#7048e8', '#5c7cfa', '#339af0',
        '#74c0fc', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#12b886', '#40c057', '#82c91e',
        '#c0eb75', '#8ce99a', '#63e6be', '#38d9a9', '#20c997', '#2b8a3e', '#5c940d', '#f59f00',
        '#ffd43b', '#fab005', '#fd7e14', '#e8590c', '#d9480f', '#7f4f24', '#343a40', '#000000'
    ];

    function resolveElement(target) {
        if (typeof target === 'string') return document.querySelector(target);
        return target || null;
    }

    function normalizeColor(value) {
        const color = String(value || '').trim().toLowerCase();
        const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
        if (rgbMatch) {
            const alpha = rgbMatch[4] === undefined ? 1 : Number.parseFloat(rgbMatch[4]);
            if (alpha === 0) return '';
            return `#${rgbMatch.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
        }
        if (color === 'transparent') return '';
        return color;
    }

    function getElementFromSelection(editor) {
        const selection = window.getSelection();
        const selectedNode = selection?.anchorNode;
        if (!selectedNode) return null;
        const selectedElement = selectedNode.nodeType === Node.ELEMENT_NODE ? selectedNode : selectedNode.parentElement;
        return selectedElement && editor?.contains(selectedElement) ? selectedElement : null;
    }

    function normalizeFontSize(fontSize) {
        const parsedFontSize = Number.parseInt(fontSize, 10);
        const fallbackFontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : DEFAULT_FONT_SIZE;
        return FONT_SIZE_OPTIONS.reduce((closestSize, optionSize) => {
            const currentDistance = Math.abs(optionSize - fallbackFontSize);
            const closestDistance = Math.abs(closestSize - fallbackFontSize);
            return currentDistance < closestDistance ? optionSize : closestSize;
        }, DEFAULT_FONT_SIZE);
    }

    function setElementFontSize(element, fontSize) {
        if (!element?.style) return;
        element.style.setProperty(FONT_SIZE_STYLE_PROPERTY, `${fontSize}px`, 'important');
    }

    function setFontSizeDeep(element, fontSize) {
        if (!element) return;
        setElementFontSize(element, fontSize);
        element.querySelectorAll?.('*').forEach((child) => {
            if (child.style?.fontSize || child.tagName?.toLowerCase() === 'font') {
                setElementFontSize(child, fontSize);
            }
        });
    }

    function getFontSizeFromSelection(editor) {
        let element = getElementFromSelection(editor);
        while (element && element !== editor) {
            const inlineFontSize = element.style?.fontSize;
            if (inlineFontSize) return normalizeFontSize(inlineFontSize);
            element = element.parentElement;
        }

        return editor?.style?.fontSize ? normalizeFontSize(editor.style.fontSize) : null;
    }

    function getTextStyleStateFromSelection(editor, command) {
        const selectedElement = getElementFromSelection(editor);
        let element = selectedElement;

        while (element && element !== editor) {
            const tagName = element.tagName?.toLowerCase();
            const inlineStyle = element.style || {};
            const computedStyle = window.getComputedStyle(element);
            const fontWeight = Number.parseInt(computedStyle.fontWeight, 10);
            const textDecoration = `${inlineStyle.textDecoration || ''} ${computedStyle.textDecorationLine || ''}`.toLowerCase();

            if (command === 'bold' && (tagName === 'strong' || tagName === 'b' || fontWeight >= 600)) return true;
            if (command === 'italic' && (tagName === 'em' || tagName === 'i' || computedStyle.fontStyle === 'italic')) return true;
            if (command === 'underline' && (tagName === 'u' || textDecoration.includes('underline'))) return true;
            if (command === 'strikeThrough' && (tagName === 's' || tagName === 'strike' || textDecoration.includes('line-through'))) return true;

            element = element.parentElement;
        }

        return false;
    }

    function runWithPreservedSelection(editor, callback) {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const container = range?.commonAncestorContainer?.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range?.commonAncestorContainer?.parentElement;

        if (!range || !container || !editor?.contains(container)) {
            callback();
            return;
        }

        const markerId = `text-editor-selection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

    function replaceFontTags(editor, fontSize) {
        if (!editor) return;
        runWithPreservedSelection(editor, () => {
            editor.querySelectorAll('font[size="7"]').forEach((fontElement) => {
                const span = document.createElement('span');
                span.innerHTML = fontElement.innerHTML;
                setFontSizeDeep(span, fontSize);
                fontElement.replaceWith(span);
            });
        });
    }

    function getRangeContainer(range) {
        if (!range) return null;
        return range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
    }

    function isEditorRange(editor, range) {
        const container = getRangeContainer(range);
        return Boolean(container && editor?.contains(container));
    }

    function createEndRange(editor) {
        if (!editor) return null;
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        return range;
    }

    function focusWithSelection(editor, range) {
        if (!editor) return false;
        const rangeToApply = range && isEditorRange(editor, range) ? range : createEndRange(editor);
        if (!rangeToApply) return false;

        editor.focus({ preventScroll: true });
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(rangeToApply);
        return true;
    }

    function getCurrentEditorRange(editor) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return null;

        const range = selection.getRangeAt(0);
        return isEditorRange(editor, range) ? range.cloneRange() : null;
    }

    function applyFontSizeToRange(editor, range, fontSize) {
        if (!editor || !range || !isEditorRange(editor, range)) {
            return { applied: false, isCollapsed: false };
        }

        const isCollapsed = range.collapsed;
        focusWithSelection(editor, range);

        if (isCollapsed) {
            if (!editor.textContent?.trim()) {
                setElementFontSize(editor, fontSize);
                return { applied: true, isCollapsed };
            }

            document.execCommand('fontSize', false, '7');
            replaceFontTags(editor, fontSize);
            return { applied: true, isCollapsed };
        }

        const selectedContent = range.extractContents();
        if (!selectedContent.textContent?.trim()) {
            range.insertNode(selectedContent);
            return { applied: false, isCollapsed };
        }

        const span = document.createElement('span');
        span.appendChild(selectedContent);
        setFontSizeDeep(span, fontSize);
        range.insertNode(span);

        const selection = window.getSelection();
        const styledRange = document.createRange();
        styledRange.selectNodeContents(span);
        selection?.removeAllRanges();
        selection?.addRange(styledRange);
        return { applied: true, isCollapsed };
    }

    function createTextStyleElement(command) {
        if (command === 'bold') return document.createElement('strong');
        if (command === 'italic') return document.createElement('em');
        if (command === 'underline') {
            const element = document.createElement('span');
            element.style.textDecoration = 'underline';
            return element;
        }
        if (command === 'strikeThrough') {
            const element = document.createElement('span');
            element.style.textDecoration = 'line-through';
            return element;
        }
        return null;
    }

    function applyTextStyleFallback(editor, command, range) {
        const styleElement = createTextStyleElement(command);
        if (!editor || !styleElement || !range || range.collapsed || !isEditorRange(editor, range)) {
            return false;
        }

        const selectedContent = range.extractContents();
        if (!selectedContent.textContent?.trim()) {
            range.insertNode(selectedContent);
            return false;
        }

        styleElement.appendChild(selectedContent);
        range.insertNode(styleElement);

        const selection = window.getSelection();
        const styledRange = document.createRange();
        styledRange.selectNodeContents(styleElement);
        selection?.removeAllRanges();
        selection?.addRange(styledRange);
        return true;
    }

    function resolveAlignmentCommand() {
        if (document.queryCommandState('justifyCenter')) return 'justifyCenter';
        if (document.queryCommandState('justifyRight')) return 'justifyRight';
        return 'justifyLeft';
    }

    function buildFontSizeOptions(fontSizeSelect) {
        if (!fontSizeSelect) return;
        fontSizeSelect.innerHTML = FONT_SIZE_OPTIONS.map((size) => (
            `<option value="${size}"${size === DEFAULT_FONT_SIZE ? ' selected' : ''}>${size}</option>`
        )).join('');
    }

    function buildPalette(panel) {
        if (!panel) return;
        panel.innerHTML = COLOR_PALETTE.map((color) => `
            <button type="button" class="ad-profile-editor-color-option" data-editor-palette-color="${color}" style="background-color: ${color};" title="${color}" aria-label="${color}"></button>
        `).join('');
    }

    function removeEditorControls(root) {
        root?.querySelectorAll?.([
            '.ad-profile-editor-toolbar',
            '.ad-profile-editor-popover',
            '[data-editor-command]',
            '[data-editor-popover]',
            '[data-editor-popover-panel]',
            '[data-editor-palette-color]',
            '#ad-profile-editor-font-size',
            '#ad-profile-editor-image-btn',
            '#ad-profile-editor-image-input'
        ].join(',')).forEach((element) => element.remove());
    }

    function sanitizeEditorHTML(value) {
        const template = document.createElement('template');
        template.innerHTML = String(value || '');
        removeEditorControls(template.content);
        return template.innerHTML.trim();
    }

    function create(options = {}) {
        const editor = resolveElement(options.editor);
        const input = resolveElement(options.input);
        const toolbar = resolveElement(options.toolbar);
        const fontSizeSelect = resolveElement(options.fontSizeSelect);
        const counter = resolveElement(options.counter);
        const imageButton = resolveElement(options.imageButton);
        const imageInput = resolveElement(options.imageInput);
        const onChange = typeof options.onChange === 'function' ? options.onChange : null;
        const onError = typeof options.onError === 'function' ? options.onError : null;
        const uploadImage = typeof options.uploadImage === 'function' ? options.uploadImage : null;
        const minLength = Number(options.minLength || 0);
        const maxLength = Number(options.maxLength || input?.maxLength || 0);
        let lastRange = null;
        let pendingFontSize = DEFAULT_FONT_SIZE;

        if (!editor) return null;
        if (editor.__textEditorInstance) return editor.__textEditorInstance;
        if (input) editor.innerHTML = sanitizeEditorHTML(input.value || '');
        removeEditorControls(editor);
        if (maxLength > 0 && input && (!input.maxLength || input.maxLength < 0)) input.maxLength = maxLength;

        buildFontSizeOptions(fontSizeSelect);
        toolbar?.querySelectorAll('[data-editor-popover-panel="font-color"], [data-editor-popover-panel="font-bg-color"]')
            .forEach(buildPalette);

        function getHTML() {
            return sanitizeEditorHTML(editor.innerHTML);
        }

        function getPlainText() {
            return editor.textContent || '';
        }

        function getTrimmedText() {
            return getPlainText().trim();
        }

        function syncInput() {
            removeEditorControls(editor);
            const html = getHTML();
            if (input) input.value = html;
            return html;
        }

        function getLength() {
            return getPlainText().length;
        }

        function isValid() {
            const trimmedLength = getTrimmedText().length;
            const length = getLength();
            return trimmedLength >= minLength && (!maxLength || length <= maxLength);
        }

        function updateCounter() {
            if (!counter) return;
            const length = getLength();
            counter.textContent = maxLength ? `${length}/${maxLength}` : String(length);
            counter.classList.toggle('is-over-limit', Boolean(maxLength && length > maxLength));
        }

        function emitChange() {
            syncInput();
            updateCounter();
            if (onChange) {
                onChange({ html: getHTML(), text: getPlainText(), trimmedText: getTrimmedText(), length: getLength(), isValid: isValid() });
            }
        }

        function saveSelection() {
            const currentRange = getCurrentEditorRange(editor);
            if (currentRange) lastRange = currentRange;
        }

        function restoreSelection() {
            const currentRange = getCurrentEditorRange(editor);
            const restoredSelection = focusWithSelection(editor, currentRange || lastRange);
            if (restoredSelection) saveSelection();
            return restoredSelection;
        }

        function closePopovers(exceptName = '') {
            toolbar?.querySelectorAll('[data-editor-popover]').forEach((button) => {
                const isExcepted = button.dataset.editorPopover === exceptName;
                if (!isExcepted) button.setAttribute('aria-expanded', 'false');
            });
            toolbar?.querySelectorAll('[data-editor-popover-panel]').forEach((panel) => {
                const isExcepted = panel.dataset.editorPopoverPanel === exceptName;
                if (!isExcepted) panel.classList.remove('is-open');
            });
        }

        function updateActiveButtons() {
            if (!toolbar || !editor) return;
            if (document.activeElement !== editor && !getElementFromSelection(editor)) return;

            const selectedFontSize = getFontSizeFromSelection(editor);
            const isNativeFontSizeStateActive = String(document.queryCommandValue('fontSize')) === '7';
            const currentFontSize = selectedFontSize || (isNativeFontSizeStateActive ? pendingFontSize : pendingFontSize || DEFAULT_FONT_SIZE);
            pendingFontSize = currentFontSize;
            if (fontSizeSelect) fontSizeSelect.value = String(currentFontSize);

            TEXT_STYLE_COMMANDS.forEach((command) => {
                const button = toolbar.querySelector(`[data-editor-command="${command}"]`);
                if (!button) return;
                const isPressed = document.queryCommandState(command) || getTextStyleStateFromSelection(editor, command);
                button.classList.toggle('is-active', isPressed);
                button.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
            });

            const currentFontColor = normalizeColor(document.queryCommandValue('foreColor'));
            const currentBackColor = normalizeColor(document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'));
            toolbar.querySelector('[data-editor-popover="font-color"]')?.style.setProperty('text-decoration-color', currentFontColor || '#212529');
            toolbar.querySelector('[data-editor-popover="font-bg-color"]')?.style.setProperty('--editor-bg-swatch-color', currentBackColor || DEFAULT_BACKGROUND_COLOR);
            const currentAlignmentCommand = resolveAlignmentCommand();
            toolbar.querySelector('[data-editor-popover="align"]')?.setAttribute('data-editor-align', currentAlignmentCommand);
            ALIGNMENT_COMMANDS.forEach((command) => {
                const option = toolbar.querySelector(`[data-editor-command="${command}"]`);
                option?.setAttribute('aria-checked', command === currentAlignmentCommand ? 'true' : 'false');
            });
        }

        function applyCommand(command, value = null) {
            if (!restoreSelection()) return;
            const selection = window.getSelection();
            const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
            const fallbackRange = activeRange?.cloneRange();
            const isTextStyleCommand = TEXT_STYLE_COMMANDS.includes(command);
            const isManualTextStyleApply = isTextStyleCommand
                && fallbackRange
                && !fallbackRange.collapsed
                && !document.queryCommandState(command)
                && !getTextStyleStateFromSelection(editor, command);

            if (isManualTextStyleApply) {
                applyTextStyleFallback(editor, command, fallbackRange);
            } else {
                const htmlBeforeCommand = isTextStyleCommand && fallbackRange && !fallbackRange.collapsed ? editor.innerHTML : '';
                const didApplyCommand = document.execCommand(command, false, value);
                if (isTextStyleCommand
                    && fallbackRange
                    && !fallbackRange.collapsed
                    && (!didApplyCommand || editor.innerHTML === htmlBeforeCommand)) {
                    applyTextStyleFallback(editor, command, fallbackRange);
                }
            }

            replaceFontTags(editor, pendingFontSize);
            saveSelection();
            emitChange();
            updateActiveButtons();
        }

        function applyFontSize(fontSizeValue) {
            const fontSize = normalizeFontSize(fontSizeValue);
            pendingFontSize = fontSize;
            if (fontSizeSelect) fontSizeSelect.value = String(fontSize);
            if (!restoreSelection()) return;

            const selection = window.getSelection();
            const activeRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
            const result = applyFontSizeToRange(editor, activeRange, fontSize);
            if (!result.applied) {
                document.execCommand('fontSize', false, '7');
                replaceFontTags(editor, fontSize);
            }

            saveSelection();
            emitChange();
            updateActiveButtons();
        }

        function setHTML(value) {
            editor.innerHTML = sanitizeEditorHTML(value);
            replaceFontTags(editor, pendingFontSize);
            emitChange();
            updateActiveButtons();
        }

        editor.addEventListener('input', () => {
            removeEditorControls(editor);
            replaceFontTags(editor, pendingFontSize);
            emitChange();
            updateActiveButtons();
        });
        editor.addEventListener('paste', () => {
            window.setTimeout(() => {
                removeEditorControls(editor);
                emitChange();
                updateActiveButtons();
            }, 0);
        });
        editor.addEventListener('blur', emitChange);
        editor.addEventListener('keyup', () => {
            saveSelection();
            updateActiveButtons();
        });
        editor.addEventListener('mouseup', () => {
            saveSelection();
            updateActiveButtons();
        });
        editor.addEventListener('focus', () => {
            saveSelection();
            updateActiveButtons();
        });
        document.addEventListener('selectionchange', updateActiveButtons);

        toolbar?.addEventListener('mousedown', (event) => {
            if (event.target.closest('[data-editor-command], [data-editor-popover], [data-editor-palette-color], #ad-profile-editor-image-btn')) {
                saveSelection();
                event.preventDefault();
            }
        });

        toolbar?.addEventListener('click', (event) => {
            const popoverButton = event.target.closest('[data-editor-popover]');
            if (popoverButton) {
                event.preventDefault();
                const popoverName = popoverButton.dataset.editorPopover;
                const panel = toolbar.querySelector(`[data-editor-popover-panel="${popoverName}"]`);
                const shouldOpen = !panel?.classList.contains('is-open');
                closePopovers(shouldOpen ? popoverName : '');
                panel?.classList.toggle('is-open', shouldOpen);
                popoverButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                return;
            }

            const colorButton = event.target.closest('[data-editor-palette-color]');
            if (colorButton) {
                event.preventDefault();
                const panel = colorButton.closest('[data-editor-popover-panel]');
                const command = panel?.dataset.editorPopoverPanel === 'font-bg-color' ? 'hiliteColor' : 'foreColor';
                applyCommand(command, colorButton.dataset.editorPaletteColor);
                closePopovers();
                return;
            }

            const button = event.target.closest('[data-editor-command]');
            if (!button) return;

            event.preventDefault();
            applyCommand(button.dataset.editorCommand, button.dataset.editorValue || null);
            if (button.closest('[data-editor-popover-panel]')) closePopovers();
        });

        fontSizeSelect?.addEventListener('mousedown', saveSelection);
        fontSizeSelect?.addEventListener('focus', saveSelection);
        fontSizeSelect?.addEventListener('change', () => applyFontSize(fontSizeSelect.value));

        document.addEventListener('click', (event) => {
            if (!toolbar?.contains(event.target)) closePopovers();
        });

        imageButton?.addEventListener('click', () => imageInput?.click());
        imageInput?.addEventListener('change', async () => {
            const file = imageInput.files?.[0];
            if (!file || !file.type.startsWith('image/') || !uploadImage) return;

            try {
                const imageUrl = await uploadImage(file);
                if (!imageUrl) return;
                focusWithSelection(editor, lastRange);
                document.execCommand('insertImage', false, imageUrl);
                saveSelection();
                emitChange();
                updateActiveButtons();
            } catch (error) {
                if (onError) onError(error);
            } finally {
                imageInput.value = '';
            }
        });

        emitChange();
        updateActiveButtons();

        const instance = {
            element: editor,
            input,
            getHTML,
            getValue: getHTML,
            getPlainText,
            getTrimmedText,
            getTrimmedValue: getTrimmedText,
            setHTML,
            setValue: setHTML,
            getLength,
            isValid,
            sync: emitChange,
            applyCommand,
            applyFontSize,
            sanitize: () => {
                removeEditorControls(editor);
                syncInput();
                updateCounter();
            },
            saveSelection,
            focus: () => focusWithSelection(editor, lastRange)
        };

        editor.__textEditorInstance = instance;
        return instance;
    }

    global.TextEditor = {
        create,
        createRich: create
    };
})(window);
