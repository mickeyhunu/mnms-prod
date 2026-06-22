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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWikiSearch, { once: true });
  } else {
    initWikiSearch();
  }
}());
