/**
 * 파일 역할: 룸빵위키에서 사용자가 입력한 언어 목록을 저장하고 렌더링하는 페이지 스크립트.
 */
(function () {
  const STORAGE_KEY = 'mnms-room-wiki-languages';

  function readLanguages() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch (error) {
      return [];
    }
  }

  function writeLanguages(languages) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(languages));
  }

  function renderLanguages(languages, listEl, emptyEl) {
    listEl.innerHTML = '';
    emptyEl.classList.toggle('hidden', languages.length > 0);

    languages.forEach((language, index) => {
      const item = document.createElement('div');
      item.className = 'wiki-language-chip';

      const name = document.createElement('span');
      name.className = 'wiki-language-chip__name';
      name.textContent = language;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'wiki-language-chip__remove';
      removeButton.setAttribute('aria-label', `${language} 삭제`);
      removeButton.textContent = '×';
      removeButton.addEventListener('click', () => {
        const nextLanguages = readLanguages().filter((_, languageIndex) => languageIndex !== index);
        writeLanguages(nextLanguages);
        renderLanguages(nextLanguages, listEl, emptyEl);
      });

      item.append(name, removeButton);
      listEl.appendChild(item);
    });
  }

  function initWikiPage() {
    const form = document.getElementById('wiki-language-form');
    const input = document.getElementById('wiki-language-input');
    const listEl = document.getElementById('wiki-language-list');
    const emptyEl = document.getElementById('wiki-language-empty');

    if (!form || !input || !listEl || !emptyEl) return;

    renderLanguages(readLanguages(), listEl, emptyEl);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const language = input.value.trim();
      if (!language) return;

      const languages = readLanguages();
      const exists = languages.some((item) => item.toLowerCase() === language.toLowerCase());
      const nextLanguages = exists ? languages : [...languages, language];
      writeLanguages(nextLanguages);
      renderLanguages(nextLanguages, listEl, emptyEl);
      input.value = '';
      input.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWikiPage, { once: true });
  } else {
    initWikiPage();
  }
}());
