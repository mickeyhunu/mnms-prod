/**
 * 파일 역할: 서비스 전반에서 사용하는 회사 정보 푸터를 정의하는 공통 컴포넌트 파일.
 */
export default {
  template: `<footer class="company-footer-slot" aria-label="사이트 하단 회사 정보">
    <div class="company-footer-top">
      <strong class="company-footer-logo">MIDNIGHT MENS</strong>
    </div>
    <div class="company-footer-links-row">
      <a href="/board/terms">이용약관</a>
      <span class="footer-divider" aria-hidden="true"></span>
      <a href="/board/terms">개인정보처리방침</a>
    </div>
    <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
    <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 070-5236-4672</p>
    <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
  </footer>`
};
