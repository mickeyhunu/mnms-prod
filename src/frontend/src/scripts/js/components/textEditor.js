/**
 * 파일 역할: 기본 textarea 기반 글 에디터를 초기화하고 값/글자 수 상태를 관리하는 공용 모듈.
 */
(function initTextEditorModule(global) {
    function resolveElement(target) {
        if (typeof target === 'string') return document.querySelector(target);
        return target || null;
    }

    function createTextEditor(options = {}) {
        const textarea = resolveElement(options.textarea);
        if (!textarea) return null;

        const maxLength = Number(options.maxLength || textarea.maxLength || 0);
        const minLength = Number(options.minLength || 0);
        const counter = resolveElement(options.counter);
        const onChange = typeof options.onChange === 'function' ? options.onChange : null;

        if (maxLength > 0 && (!textarea.maxLength || textarea.maxLength < 0)) {
            textarea.maxLength = maxLength;
        }

        function getValue() {
            return textarea.value;
        }

        function getTrimmedValue() {
            return getValue().trim();
        }

        function setValue(value) {
            textarea.value = String(value || '');
            update();
        }

        function getLength() {
            return getValue().length;
        }

        function isValid() {
            const trimmedLength = getTrimmedValue().length;
            const length = getLength();
            return trimmedLength >= minLength && (!maxLength || length <= maxLength);
        }

        function update() {
            const length = getLength();
            if (counter) {
                counter.textContent = maxLength ? `${length}/${maxLength}` : String(length);
                counter.classList.toggle('is-over-limit', Boolean(maxLength && length > maxLength));
            }
            if (onChange) {
                onChange({ value: getValue(), trimmedValue: getTrimmedValue(), length, isValid: isValid() });
            }
        }

        textarea.addEventListener('input', update);
        update();

        return {
            element: textarea,
            getValue,
            getTrimmedValue,
            setValue,
            getLength,
            isValid,
            update
        };
    }

    global.TextEditor = {
        create: createTextEditor
    };
})(window);
