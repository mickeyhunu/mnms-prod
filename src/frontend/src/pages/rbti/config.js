import { createPageConfig } from '../shared/createPageConfig.js';

const rbtiTemplate = `
<header class="header">
  <div class="header-container">
    <a href="/" class="logo"><h1>미드나잇 맨즈</h1></a>
  </div>
</header>

<main class="main-content">
  <div class="container" style="max-width: 760px;">
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
