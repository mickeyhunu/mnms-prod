import { createPageConfig } from '../shared/createPageConfig.js';
import { shareSheetTemplate } from '../post-detail/templates/shareSheet.js';

const rbtiTemplate = `
<main class="main-content rbti-page">
  <div class="container">
    <section style="flex: 1; min-width: 0;">
      <header class="community-section-header">
        <div class="community-header-left">
          <button type="button" class="icon-btn icon-btn-square" id="rbti-back-btn" aria-label="뒤로가기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <span class="community-board-name community-board-name--live"><span>RBTI</span></span>
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

      <div style="margin: 5%">
        <div style="margin-top: 18px; border-radius: 18px; padding: 26px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; box-shadow: 0 10px 30px rgba(79,70,229,0.22); text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">🧠</div>
          <h1 id="rbti-test-title" style="font-size: 30px; margin: 0 0 8px; font-weight: 800;">RBTI</h1>
          <p id="rbti-test-description" style="margin: 0; color: rgba(255,255,255,0.92); white-space: pre-line;">R : Room
B : Behavior
T : Type
I : Indicator

자신의 유흥주점 이용 행동 검사</p>
        </div>

        <div id="rbti-intro" class="card" style="padding: 22px; margin-top: 16px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: left;">
          <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #1f2937;">검사 안내</h3>
          <ul style="display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 14px; color: #4b5563; line-height: 1.55;">
            <li>• RBTI는 자신의 유흥주점 이용 행동 검사로 본인 유형을 알아보는 검사입니다.</li>
            <li>• 검사 소요 시간은 약 3~5분입니다</li>
            <li>• 각 질문에 '매우 아니다'부터 '매우 그렇다'까지 중 하나를 선택하세요</li>
            <li>• 너무 고민하지 말고 평소 행동에 가까운 것을 고르세요</li>
            <li>• 모든 답변은 브라우저에서만 처리됩니다</li>
          </ul>
        </div>

        <button type="button" id="rbti-start-btn" style="width: 100%; margin-top: 12px; padding: 16px; border: 0; border-radius: 16px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; font-size: 18px; font-weight: 800; box-shadow: 0 10px 24px rgba(79,70,229,0.24); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;">검사 시작하기</button>

        <section id="rbti-test-card" class="card hidden" style="padding: 22px; margin-top: 16px; border-radius: 16px; border: 1px solid #e5e7eb;">
          <div style="margin: 0 0 18px;">
            <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">진행도 <span id="rbti-progress-current">0</span>/<span id="rbti-progress-total">0</span></p>
            <div style="height: 9px; border-radius: 999px; background: #eef2ff; overflow: hidden;">
              <div id="rbti-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg,#4f46e5,#7c3aed);"></div>
            </div>
          </div>

          <h3 id="rbti-question-text" style="margin-bottom: 14px; font-size: 20px; line-height: 1.45;">질문 준비 중...</h3>
          <div id="rbti-answer-list" style="display: grid; gap: 8px;"></div>

          <div style="display: flex; justify-content: space-between; margin-top: 20px; gap: 8px;">
            <button type="button" class="btn btn-outline" id="rbti-prev-btn">이전</button>
            <button type="button" class="btn btn-primary" id="rbti-next-btn">다음</button>
            <button type="button" class="btn btn-primary hidden" id="rbti-submit-btn">결과 보기</button>
          </div>
        </section>
      </div>
    </section>
  </div>
  ${shareSheetTemplate}
</main>
`;

export const rbtiPageConfig = createPageConfig({
  template: rbtiTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/pages.css', 'styles/live.css'],
  scripts: ['scripts/js/pages/rbti.js', 'scripts/js/components/footerNav.js']
});
