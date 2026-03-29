/**
 * 파일 역할: LIVE 페이지의 주요 UI 조각을 템플릿 단위로 분리해 관리하는 파일.
 */
export const liveStickyHeaderTemplate = `
<div class="live-page__sticky-stack">
                <header class="community-section-header">
                    <div class="community-header-left">
                        <button type="button" class="icon-btn icon-btn-square" id="back-btn" aria-label="뒤로가기">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m15 18-6-6 6-6"></path>
                            </svg>
                        </button>
                        <span class="community-board-name community-board-name--live"><span class="live-status-dot" aria-hidden="true"></span><span>LIVE</span></span>
                    </div>
                </header>

                <div class="site-subheader__container">
                    <div class="site-subheader__top-row">
                        <div class="site-subheader__filters">
                            <nav class="area-filter area-filter--cities" id="live-store-filter" aria-label="매장 선택"></nav>
                        </div>
                    </div>

                    <div class="area-filter area-filter--districts" id="live-category-filter" aria-label="LIVE 카테고리 선택"></div>
                </div>
            </div>
`;

export const liveScrollBottomButtonTemplate = `
<button
                type="button"
                class="live-scroll-bottom-button hidden"
                id="live-scroll-bottom-button"
                aria-label="LIVE 컨텐츠 맨 아래로 이동"
                title="맨 아래로 이동"
            >
                <span class="live-scroll-bottom-button__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
                    </svg>
                </span>
            </button>
`;

export const liveChatPaneHandleTemplate = `
<div class="live-chat-pane-handle" aria-hidden="true">
                <div class="live-chat-pane-handle__inner">
                    <img src="/icon/leftArrow.svg" alt="열기" loading="lazy" width="7" height="11" decoding="async">
                </div>
            </div>
`;
