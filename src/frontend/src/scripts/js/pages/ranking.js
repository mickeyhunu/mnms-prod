/**
 * 파일 역할: 월간 랭킹 페이지의 데이터 조회와 화면 렌더링을 담당하는 파일.
 */
(function () {
  const state = { isLoading: false };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function getRankLabel(rank) {
    if (rank === 1) return '🥇 1위';
    if (rank === 2) return '🥈 2위';
    if (rank === 3) return '🥉 3위';
    return '🏅 순위권';
  }

  function renderList(elementId, rows, unit) {
    const list = $(elementId);
    if (!list) return;

    if (!Array.isArray(rows) || rows.length === 0) {
      list.innerHTML = '<li class="ranking-list__empty">아직 집계된 활동이 없습니다.</li>';
      return;
    }

    list.innerHTML = rows.map((row) => `
      <li class="ranking-list__item ranking-list__item--rank-${row.rank}">
        <span class="ranking-list__rank">${getRankLabel(row.rank)}</span>
        <div class="ranking-list__details">
          <span class="ranking-list__nickname">${escapeHtml(row.nickname)} 님</span>
          <strong class="ranking-list__score">${formatNumber(row.score)}${unit}</strong>
        </div>
      </li>
    `).join('');
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    $('ranking-loading')?.classList.toggle('hidden', !isLoading);
    if (isLoading) $('ranking-error')?.classList.add('hidden');
  }

  function showError(message) {
    const error = $('ranking-error');
    const text = $('ranking-error-message');
    if (text) text.textContent = message || '랭킹을 불러오지 못했습니다.';
    error?.classList.remove('hidden');
    $('ranking-content')?.classList.add('hidden');
  }

  async function loadRankings() {
    if (state.isLoading) return;
    setLoading(true);

    try {
      const data = await APIClient.get('/rankings/monthly', { limit: 5 });
      const period = data.period || {};
      const month = Number(period.month || new Date().getMonth() + 1);
      const periodLabel = $('ranking-period-label');
      if (periodLabel) periodLabel.textContent = `🏆 ${month}월 랭킹 🏆`;

      renderList('ranking-points', data.rankings?.points, 'P');
      renderList('ranking-attendance', data.rankings?.attendancePosts, '회');
      renderList('ranking-likes', data.rankings?.receivedLikes, '개');

      $('ranking-content')?.classList.remove('hidden');
      $('ranking-error')?.classList.add('hidden');
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function initRankingPage() {
    $('ranking-retry-btn')?.addEventListener('click', loadRankings);
    loadRankings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRankingPage);
  } else {
    initRankingPage();
  }
}());
