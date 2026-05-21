import { createPageConfig } from '../shared/createPageConfig.js';
import { shareSheetTemplate } from '../post-detail/templates/shareSheet.js';

const rbtiTemplate = `
<main class="main-content">
  <div class="container" style="max-width: 760px;">
    <header class="community-section-header">
      <div class="community-header-left">
        <button type="button" class="icon-btn icon-btn-square" id="rbti-back-btn" aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <span class="community-board-name community-board-name--live"><span class="live-status-dot" aria-hidden="true"></span><span>LIVE</span></span>
      </div>
      <div class="community-actions" id="rbti-header-actions">
        <button type="button" class="icon-btn icon-btn-square" id="rbti-share-btn" aria-label="공유하기">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" x2="12" y1="2" y2="15"></line>
          </svg>
        </button>
      </div>
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
    ${shareSheetTemplate}
  </div>
</main>
`;


export const rbtiPageConfig = createPageConfig({
  template: rbtiTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/pages.css', 'styles/live.css'],
  scripts: ['scripts/js/pages/rbti.js', 'scripts/js/components/footerNav.js']
});
