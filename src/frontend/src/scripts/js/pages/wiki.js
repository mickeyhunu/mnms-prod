/**
 * 파일 역할: 룸빵위키 용어사전 검색 및 카테고리 필터링을 담당하는 페이지 스크립트.
 */
(function () {
  function normalizeText(value) {
    return (value || '').toString().trim().toLowerCase();
  }

  function getGlossaryRows(category) {
    const terms = Array.from(category.querySelectorAll('.wiki-glossary-list dt'));

    return terms.map((term) => {
      const description = term.nextElementSibling && term.nextElementSibling.tagName === 'DD'
        ? term.nextElementSibling
        : null;
      const searchableText = normalizeText(`${term.textContent} ${description ? description.textContent : ''}`);

      return { term, description, searchableText };
    });
  }

  function setRowVisibility(row, isVisible) {
    row.term.classList.toggle('hidden', !isVisible);
    if (row.description) {
      row.description.classList.toggle('hidden', !isVisible);
    }
  }

  function initWikiSearch() {
    const input = document.getElementById('wiki-search-input');
    const clearButton = document.getElementById('wiki-search-clear');
    const status = document.getElementById('wiki-search-status');
    const categories = Array.from(document.querySelectorAll('.wiki-glossary-category'));

    if (!input || !clearButton || !status || categories.length === 0) return;

    const categoryRows = categories.map((category) => ({
      category,
      rows: getGlossaryRows(category),
      wasOpenBeforeSearch: category.open,
    }));

    function applySearch() {
      const query = normalizeText(input.value);
      let matchedCount = 0;

      clearButton.classList.toggle('hidden', query.length === 0);

      categoryRows.forEach((categoryData) => {
        const { category, rows } = categoryData;
        let visibleRows = 0;

        rows.forEach((row) => {
          const isMatch = !query || row.searchableText.includes(query);
          setRowVisibility(row, isMatch);
          if (isMatch) visibleRows += 1;
        });

        matchedCount += visibleRows;
        category.classList.toggle('hidden', query.length > 0 && visibleRows === 0);

        if (query) {
          if (!category.open) categoryData.wasOpenBeforeSearch = false;
          category.open = visibleRows > 0;
        } else {
          category.open = categoryData.wasOpenBeforeSearch;
        }
      });

      if (!query) {
        status.textContent = '';
        return;
      }

      status.textContent = matchedCount > 0
        ? `검색 결과 ${matchedCount}개 용어를 찾았습니다.`
        : '검색 결과가 없습니다. 다른 단어로 검색해보세요.';
    }

    input.addEventListener('input', applySearch);
    clearButton.addEventListener('click', () => {
      input.value = '';
      input.focus();
      applySearch();
    });

    applySearch();
  }


  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function isAdminUser() {
    return typeof Auth !== 'undefined' && Auth.isAdminAccount(Auth.currentUser);
  }

  function initWikiQuestionBoard() {
    const form = document.getElementById('wiki-question-form');
    const termInput = document.getElementById('wiki-question-term');
    const contentInput = document.getElementById('wiki-question-content');
    const status = document.getElementById('wiki-question-form-status');
    const list = document.getElementById('wiki-question-list');

    if (!form || !termInput || !contentInput || !status || !list || typeof APIClient === 'undefined') return;

    function renderQuestions(questions) {
      if (!questions.length) {
        list.innerHTML = '<p class="wiki-question-empty">아직 등록된 용어 질문이 없습니다. 첫 질문을 남겨보세요.</p>';
        return;
      }

      list.innerHTML = questions.map((question) => {
        const added = question.status === 'ADDED';
        const adminActions = isAdminUser()
          ? `<div class="wiki-question-item__actions">
              ${added ? '' : `<button class="btn btn-outline btn-sm" type="button" data-wiki-action="added" data-id="${question.id}">위키 추가 완료</button>`}
              <button class="btn btn-danger btn-sm" type="button" data-wiki-action="delete" data-id="${question.id}">삭제</button>
            </div>`
          : '';

        return `<article class="wiki-question-item">
          <div class="wiki-question-item__meta">
            <span class="wiki-question-item__term">${escapeHtml(question.term)}</span>
            <span class="wiki-question-status-badge ${added ? 'wiki-question-status-badge--added' : ''}">${added ? '추가 완료' : '관리자 확인 대기'}</span>
          </div>
          <p class="wiki-question-item__content">${escapeHtml(question.content)}</p>
          <div class="wiki-question-item__meta wiki-question-item__subtle">
            <span>${escapeHtml(question.authorNickname || '익명')}</span>
            <span>${escapeHtml(formatDate(question.createdAt))}</span>
          </div>
          ${adminActions}
        </article>`;
      }).join('');
    }

    async function loadQuestions() {
      try {
        const data = await APIClient.get('/wiki/questions');
        renderQuestions(data.questions || []);
      } catch (error) {
        list.innerHTML = `<p class="wiki-question-empty">${escapeHtml(error.message || '질문을 불러오지 못했습니다.')}</p>`;
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.textContent = '';
      try {
        await APIClient.post('/wiki/questions', {
          term: termInput.value,
          content: contentInput.value
        });
        form.reset();
        status.textContent = '질문이 등록되었습니다. 관리자가 확인 후 위키에 반영합니다.';
        await loadQuestions();
      } catch (error) {
        status.textContent = error.message || '질문 등록에 실패했습니다.';
      }
    });

    list.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-wiki-action]');
      if (!button) return;
      const id = button.dataset.id;
      const action = button.dataset.wikiAction;

      try {
        button.disabled = true;
        if (action === 'added') {
          await APIClient.put(`/wiki/questions/${id}/added`);
        } else if (action === 'delete') {
          await APIClient.delete(`/wiki/questions/${id}`);
        }
        await loadQuestions();
      } catch (error) {
        status.textContent = error.message || '관리자 처리에 실패했습니다.';
        button.disabled = false;
      }
    });

    loadQuestions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initWikiSearch(); initWikiQuestionBoard(); }, { once: true });
  } else {
    initWikiSearch();
    initWikiQuestionBoard();
  }
}());
