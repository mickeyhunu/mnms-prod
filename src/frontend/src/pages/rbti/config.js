import { createPageConfig } from '../shared/createPageConfig.js';

const rbtiTemplate = `
<main class="main-content">
  <div class="container" style="max-width: 760px;">
    <header class="community-section-header">
      <div class="community-header-left">
        <button type="button" class="community-back-link" id="rbti-back-btn" aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <span class="community-board-name">RBTI</span>
      </div>
      <button type="button" class="community-more-btn" id="rbti-share-btn" aria-label="공유">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .17 1L8.91 8.13A3 3 0 0 0 6 7a3 3 0 1 0 2.91 4.13l6.26 3.13A3 3 0 1 0 16 13c0 .34-.06.66-.17.97L9.57 10.84A3 3 0 0 0 9 9.5c0-.48.11-.93.31-1.34l6.26-3.13c.52.6 1.28.97 2.13.97a3 3 0 0 0 .3-6"></path></svg>
      </button>
    </header>
    <section class="card" style="padding: 20px; margin-top: 20px;">
      <h2 id="rbti-test-title">RBTI</h2>
      <p id="rbti-test-description" class="text-muted">질문을 불러오는 중...</p>

      <div style="margin: 20px 0;">
        <p class="text-muted">진행도 <span id="rbti-progress-current">0</span>/<span id="rbti-progress-total">0</span></p>
        <div style="height: 8px; border-radius: 999px; background: #eee; overflow: hidden;">
          <div id="rbti-progress-bar" style="height: 100%; width: 0%; background: #4f46e5;"></div>
        </div>
      </div>

      <h3 id="rbti-question-text" style="margin-bottom: 16px;">질문 준비 중...</h3>
      <div id="rbti-answer-list" style="display: grid; gap: 8px;"></div>

      <div style="display: flex; justify-content: space-between; margin-top: 20px; gap: 8px;">
        <button type="button" class="btn btn-outline" id="rbti-prev-btn">이전</button>
        <button type="button" class="btn btn-primary" id="rbti-next-btn">다음</button>
        <button type="button" class="btn btn-primary hidden" id="rbti-submit-btn">결과 보기</button>
      </div>
    </section>
  </div>
</main>
`;

export const rbtiPageConfig = createPageConfig({
  template: rbtiTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/pages.css'],
  scripts: ['scripts/js/pages/rbti.js']
});
