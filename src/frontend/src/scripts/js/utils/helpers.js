/**
 * 파일 역할: helpers에서 사용하는 공통 보조 함수/상수를 제공하는 유틸리티 파일.
 */
function showElement(element) {
   if (element) {
       element.classList.remove('hidden');
   }
}

function hideElement(element) {
   if (element) {
       element.classList.add('hidden');
   }
}

function setLoading(button, loading = true) {
   if (!button) return;
   
   if (loading) {
       button.disabled = true;
       button.dataset.originalText = button.textContent;
       button.textContent = '처리 중...';
   } else {
       button.disabled = false;
       button.textContent = button.dataset.originalText || button.textContent;
   }
}

function showNotification(message, type = 'info') {
   const notification = createNotificationElement(message, type);
   document.body.appendChild(notification);
   
   setTimeout(() => {
       notification.classList.add('show');
   }, 100);
   
   setTimeout(() => {
       notification.classList.remove('show');
       setTimeout(() => {
           if (notification.parentNode) {
               notification.parentNode.removeChild(notification);
           }
       }, 300);
   }, 3000);
}

function createNotificationElement(message, type) {
   const notification = document.createElement('div');
   notification.className = `notification notification-${type}`;
   notification.innerHTML = `
       <div class="notification-content">
           <span class="notification-icon">${getNotificationIcon(type)}</span>
           <span class="notification-message">${message}</span>
       </div>
   `;
   
   notification.style.cssText = `
       position: fixed !important;
       top: 20px !important;
       right: 16px !important;
       z-index: 99999 !important;
       width: min(360px, calc(100vw - 32px)) !important;
       padding: 16px !important;
       border-radius: 8px !important;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
       transform: translateX(calc(100% + 16px)) !important;
       transition: transform 0.3s ease-in-out !important;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
   `;
   
   const styles = {
       success: {
           background: '#10b981 !important',
           color: 'white !important'
       },
       error: {
           background: '#ef4444 !important',
           color: 'white !important'
       },
       warning: {
           background: '#f59e0b !important',
           color: 'white !important'
       },
       info: {
           background: '#3b82f6 !important',
           color: 'white !important'
       }
   };
   
   const style = styles[type] || styles.info;
   Object.assign(notification.style, style);
   
   notification.classList.add('notification-enter');
   
   return notification;
}

function getNotificationIcon(type) {
   const icons = {
       success: '✓',
       error: '✕',
       warning: '⚠',
       info: 'ℹ'
   };
   return icons[type] || icons.info;
}

const notificationStyles = `
   .notification.show {
       transform: translateX(0) !important;
   }
   
   .notification-content {
       display: flex !important;
       align-items: center !important;
       gap: 12px !important;
   }
   
   .notification-icon {
       font-size: 18px !important;
       font-weight: bold !important;
   }
   
   .notification-message {
       font-size: 14px !important;
       line-height: 1.4 !important;
   }
`;

if (!document.querySelector('#notification-styles')) {
   const styleSheet = document.createElement('style');
   styleSheet.id = 'notification-styles';
   styleSheet.textContent = `
${notificationStyles}
#blocked-expression-modal {
   position: fixed;
   inset: 0;
   display: none;
   align-items: center;
   justify-content: center;
   z-index: 100000;
}

.blocked-expression-modal-backdrop {
   position: absolute;
   inset: 0;
   background: rgba(0, 0, 0, 0.55);
}

.blocked-expression-modal-content {
   position: relative;
   width: min(420px, calc(100vw - 32px));
   background: #fff;
   border-radius: 12px;
   box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
   padding: 24px 20px;
   z-index: 1;
}

.blocked-expression-modal-content h3 {
   margin: 0 0 12px;
   font-size: 18px;
}

.blocked-expression-modal-content p {
   margin: 0 0 16px;
   line-height: 1.5;
   color: #333;
}
`;
   document.head.appendChild(styleSheet);
}

function clearFormErrors(form) {
   const errorElements = form.querySelectorAll('.error-message');
   errorElements.forEach(element => {
       element.classList.add('hidden');
       element.textContent = '';
   });
   
   const inputElements = form.querySelectorAll('.form-control');
   inputElements.forEach(element => element.classList.remove('error'));
}

function addInputError(input, message) {
   input.classList.add('error');
   const errorElement = document.getElementById(`${input.name}-error`);
   if (errorElement) {
       errorElement.textContent = message;
       errorElement.classList.remove('hidden');
   }
}

function toggleElement(element, show) {
   if (!element) return;
   
   if (show) {
       element.classList.remove('hidden');
   } else {
       element.classList.add('hidden');
   }
}

function sanitizeHTML(str) {
   if (!str) return '';
   
   const temp = document.createElement('div');
   temp.textContent = str;
   return temp.innerHTML;
}


function createSeoSlug(value = '', fallback = 'detail') {
   const normalized = String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[\/\\?#%]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s._~-]+/gu, ' ')
      .replace(/[\s._~]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

   return normalized || fallback;
}

function createSeoSlugWithId(title = '', id = null, fallbackPrefix = 'detail') {
   const normalizedId = Number.parseInt(id, 10);
   const hasValidId = Number.isInteger(normalizedId) && normalizedId > 0;
   const fallback = hasValidId ? `${fallbackPrefix}-${normalizedId}` : fallbackPrefix;
   const titleSlug = createSeoSlug(title, fallback);

   if (!hasValidId) return titleSlug;
   if (titleSlug === fallback && !String(title || '').trim()) return fallback;
   return `${titleSlug}-${normalizedId}`;
}

function createPostDetailPath(postOrId, title = '') {
   const post = typeof postOrId === 'object' && postOrId !== null ? postOrId : { id: postOrId, title };
   const titleText = post.title || title;
   const slug = createSeoSlugWithId(titleText, post.id, 'post');
   return `/post-detail/${encodeURIComponent(slug)}`;
}

function createBusinessInfoDetailPath(adOrId, title = '') {
   const ad = typeof adOrId === 'object' && adOrId !== null ? adOrId : { id: adOrId, title };
   const titleText = ad.title || title || ad.businessName;
   const slug = createSeoSlugWithId(titleText, ad.id, 'business');
   return `/business-info/${encodeURIComponent(slug)}`;
}

function splitTrailingUrlPunctuation(rawUrl) {
   let url = String(rawUrl || '');
   let trailingText = '';

   while (/[.,!?;:)\]\}，。！？；：）］｝]$/.test(url)) {
      trailingText = url.slice(-1) + trailingText;
      url = url.slice(0, -1);
   }

   return { url, trailingText };
}

function renderExternalTextLink(rawUrl) {
   const displayUrl = String(rawUrl || '');
   const href = /^www\./i.test(displayUrl) ? `https://${displayUrl}` : displayUrl;

   try {
      const parsedUrl = new URL(href);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
         return sanitizeHTML(displayUrl);
      }
   } catch (error) {
      return sanitizeHTML(displayUrl);
   }

   const safeHref = sanitizeHTML(href);
   const safeDisplayUrl = sanitizeHTML(displayUrl);
   return `<a class="post-content-link" href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeDisplayUrl}</a>`;
}

function renderMemberProfileMentions(rawText = '') {
   const mentionPattern = /(^|[^\w가-힣])@([A-Za-z0-9가-힣_]{2,20})/g;
   let rendered = '';
   let lastIndex = 0;
   let match;

   while ((match = mentionPattern.exec(rawText)) !== null) {
      const prefix = match[1] || '';
      const nickname = match[2] || '';
      const mentionStart = match.index + prefix.length;

      rendered += sanitizeHTML(rawText.slice(lastIndex, mentionStart));
      const safeNickname = sanitizeHTML(nickname);
      rendered += `<a class="post-content-link member-profile-mention" href="/@${encodeURIComponent(nickname)}">@${safeNickname}</a>`;
      lastIndex = mentionStart + nickname.length + 1;
   }

   rendered += sanitizeHTML(rawText.slice(lastIndex));
   return rendered;
}

function renderLinkedText(value) {
   const rawText = String(value || '');
   const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
   let rendered = '';
   let lastIndex = 0;
   let match;

   while ((match = urlPattern.exec(rawText)) !== null) {
      const rawUrl = match[0];
      const leadingText = rawText.slice(lastIndex, match.index);
      const { url, trailingText } = splitTrailingUrlPunctuation(rawUrl);

      rendered += renderMemberProfileMentions(leadingText);
      rendered += renderExternalTextLink(url);
      rendered += renderMemberProfileMentions(trailingText);
      lastIndex = match.index + rawUrl.length;
   }

   rendered += renderMemberProfileMentions(rawText.slice(lastIndex));
   return rendered.replace(/\n/g, '<br>');
}

function findBlockedExpression(text) {
   const profanityFilter = window.KoProfanityFilter;
   if (profanityFilter && typeof profanityFilter.findProfanity === 'function') {
      return profanityFilter.findProfanity(text);
   }

   const fallbackTerms = ['시발', '씨발', '병신', '지랄', '개새끼', '좆'];
   const normalizedText = String(text || '').toLowerCase().trim().replace(/\s+/g, '');
   if (!normalizedText) return null;
   return fallbackTerms.find(expression => normalizedText.includes(expression)) || null;
}

function showBlockedExpressionModal(fieldLabel = '입력값', expression = '') {
   let modal = document.getElementById('blocked-expression-modal');
   const displayExpression = expression === '[obscenity-dataset-match]' ? '금지어 패턴' : expression;
   const safeExpression = sanitizeHTML(displayExpression);
   const modalMessage = `${fieldLabel}에 부적절한 표현${safeExpression ? `(${safeExpression})` : ''}이 포함되어 등록할 수 없습니다.`;

   if (!modal) {
      modal = document.createElement('div');
      modal.id = 'blocked-expression-modal';
      modal.innerHTML = `
         <div class="blocked-expression-modal-backdrop"></div>
         <div class="blocked-expression-modal-content" role="dialog" aria-modal="true" aria-labelledby="blocked-expression-modal-title">
            <h3 id="blocked-expression-modal-title">부적절한 표현이 감지되었습니다</h3>
            <p id="blocked-expression-modal-message"></p>
            <button type="button" id="blocked-expression-modal-close-btn" class="btn btn-primary">확인</button>
         </div>
      `;

      document.body.appendChild(modal);

      const closeModal = () => {
         modal.style.display = 'none';
      };

      modal.querySelector('#blocked-expression-modal-close-btn')?.addEventListener('click', closeModal);
      modal.querySelector('.blocked-expression-modal-backdrop')?.addEventListener('click', closeModal);
   }

   const messageElement = modal.querySelector('#blocked-expression-modal-message');
   if (messageElement) {
      messageElement.innerHTML = modalMessage;
   }

   modal.style.display = 'flex';
}

function validateNoBlockedExpression(value, fieldLabel = '입력값') {
   const blockedExpression = findBlockedExpression(value);
   if (!blockedExpression) return true;

   showBlockedExpressionModal(fieldLabel, blockedExpression);
   return false;
}

function hasStandaloneJamo(value) {
   return /[ㄱ-ㅎㅏ-ㅣ]/.test(String(value || ''));
}

function validateNicknameComposition(value) {
   return !hasStandaloneJamo(value);
}


function generateIdentityVerificationId(prefix = 'iv') {
   const normalizedPrefix = String(prefix || 'iv').replace(/[^A-Za-z0-9]/g, '') || 'iv';
   const timestampPart = Date.now().toString(36);
   let randomPart = '';

   if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      randomPart = window.crypto.randomUUID().replace(/[^A-Za-z0-9]/g, '');
   } else if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const randomValues = new Uint32Array(2);
      window.crypto.getRandomValues(randomValues);
      randomPart = Array.from(randomValues, value => value.toString(36)).join('');
   } else {
      randomPart = Math.random().toString(36).slice(2);
   }

   return `${normalizedPrefix}${timestampPart}${randomPart}`.slice(0, 40);
}

function formatDate(dateString) {
   if (!dateString) return '';

   const date = new Date(dateString);
   if (Number.isNaN(date.getTime())) return dateString;

   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   const hour = String(date.getHours()).padStart(2, '0');
   const minute = String(date.getMinutes()).padStart(2, '0');

   return `${year}.${month}.${day}. ${hour}:${minute}`;
}

function formatDateTime(dateString) {
   if (!dateString) return '';
   
   const date = new Date(dateString);
   return date.toLocaleString('ko-KR', {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
   });
}

function getURLParams() {
   const params = {};
   const urlParams = new URLSearchParams(window.location.search);
   
   for (const [key, value] of urlParams.entries()) {
       params[key] = value;
   }
   
   return params;
}


function kcpIdentityMaskValue(value) {
   const normalizedValue = String(value || '').trim();
   if (!normalizedValue) {
      return '';
   }
   if (normalizedValue.length <= 8) {
      return `${normalizedValue.slice(0, 2)}***`;
   }
   return `${normalizedValue.slice(0, 4)}***${normalizedValue.slice(-4)}`;
}

function isKcpMobileViewport() {
   return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

function kcpIdentitySubmitAuthWindow({ callUrl, regCertKey, kcpPageSubmitYn }) {
   const pageSubmitYn = String(kcpPageSubmitYn || 'N').toUpperCase() === 'Y' ? 'Y' : 'N';
   const form = document.createElement('form');
   form.method = 'post';
   form.action = callUrl;
   form.style.display = 'none';

   const appendHiddenInput = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
   };

   appendHiddenInput('reg_cert_key', regCertKey);
   appendHiddenInput('kcp_page_submit_yn', pageSubmitYn);
   document.body.appendChild(form);

   if (pageSubmitYn === 'N') {
      const width = 410;
      const height = 500;
      const left = (screen.width / 2) - (width / 2);
      const top = (screen.height / 2) - (height / 2);
      const opts = `width=${width},height=${height},toolbar=no,status=no,menubar=no,scrollbars=no,resizable=no,left=${left},top=${top}`;
      const popupName = `kcp_auth_${Date.now()}`;
      const popup = window.open('', popupName, opts);
      if (!popup) {
         document.body.removeChild(form);
         throw new Error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      }
      form.target = popupName;
      form.dataset.kcpPopupName = popupName;
      form._kcpPopup = popup;
   } else {
      form.target = '_self';
   }

   const popup = form._kcpPopup || null;
   form.submit();
   window.setTimeout(() => {
      if (form.parentNode) {
         form.parentNode.removeChild(form);
      }
   }, 1000);

   return {
      popup,
      pageSubmitYn,
      target: form.target
   };
}

function getKcpAllowedMessageOrigins(additionalOrigins) {
   const origins = new Set([window.location.origin]);
   (Array.isArray(additionalOrigins) ? additionalOrigins : [additionalOrigins]).forEach((origin) => {
      const normalizedOrigin = String(origin || '').trim();
      if (normalizedOrigin) {
         origins.add(normalizedOrigin);
      }
   });
   return origins;
}

function parseKcpIdentityMessageData(data) {
   if (!data) {
      return null;
   }

   if (typeof data === 'string') {
      const normalizedData = data.trim();
      if (!normalizedData) {
         return null;
      }

      try {
         return parseKcpIdentityMessageData(JSON.parse(normalizedData));
      } catch (_error) {
         const params = new URLSearchParams(normalizedData);
         const payload = {};
         for (const [key, value] of params.entries()) {
            payload[key] = value;
         }
         return Object.keys(payload).length > 0 ? parseKcpIdentityMessageData(payload) : null;
      }
   }

   if (typeof data !== 'object') {
      return null;
   }

   if (data.type === 'KCP_IDENTITY_VERIFICATION_RESULT') {
      return data.payload || null;
   }

   const regCertKey = String(data.reg_cert_key || data.regCertKey || data.identityVerificationId || '').trim();
   const resultCode = String(data.res_cd || data.result_cd || '').trim();
   if (!regCertKey && !resultCode) {
      return null;
   }

   return {
      ...data,
      success: resultCode ? resultCode === '0000' : data.success !== false,
      identityVerificationId: data.identityVerificationId || regCertKey,
      regCertKey,
      message: data.res_msg || data.result_msg || data.message || (resultCode === '0000' ? '본인인증이 완료되었습니다.' : '본인인증 결과를 수신했습니다.')
   };
}

function kcpIdentityWaitForResult(options = {}) {
   const allowedOrigins = getKcpAllowedMessageOrigins(options.allowedOrigins || options.allowedOrigin);
   const timeoutMs = Number(options.timeoutMs || 5 * 60 * 1000);
   return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
         window.clearTimeout(timeoutId);
         window.removeEventListener('message', handleMessage);
      };
      const settle = (callback, value) => {
         if (settled) {
            return;
         }
         settled = true;
         cleanup();
         callback(value);
      };
      const timeoutId = window.setTimeout(() => {
         settle(reject, new Error('본인인증 응답 대기 시간이 초과되었습니다.'));
      }, timeoutMs);

      const handleMessage = (event) => {
         if (!allowedOrigins.has(event.origin)) {
            return;
         }

         const payload = parseKcpIdentityMessageData(event?.data);
         if (!payload) {
            const data = event?.data || {};
            return;
         }

         settle(resolve, payload || null);
      };

      window.addEventListener('message', handleMessage);
   });
}

function isKcpIdentityPollableError(error) {
   const message = String(error?.message || '').trim();
   if (!message) {
      return true;
   }

   return !message.includes('환경변수') && !message.includes('거래등록키가 필요합니다');
}

function kcpIdentityWaitForPopupClose(popup, options = {}) {
   const timeoutMs = Number(options.timeoutMs || 5 * 60 * 1000);
   const intervalMs = Number(options.intervalMs || 500);
   if (!popup) {
      return null;
   }

   return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const intervalId = window.setInterval(() => {
         if (popup.closed) {
            window.clearInterval(intervalId);
            resolve(true);
            return;
         }

         if (Date.now() - startedAt >= timeoutMs) {
            window.clearInterval(intervalId);
            reject(new Error('본인인증 팝업 종료 대기 시간이 초과되었습니다.'));
         }
      }, intervalMs);
   });
}

async function kcpIdentityFetchResultAfterPopupClosed(popup, identityVerificationId, options = {}) {
   if (!popup) {
      return null;
   }

   const normalizedIdentityVerificationId = String(identityVerificationId || '').trim();
   await kcpIdentityWaitForPopupClose(popup, {
      timeoutMs: options.timeoutMs,
      intervalMs: options.popupCloseIntervalMs
   });
   await new Promise(resolve => window.setTimeout(resolve, Number(options.fetchDelayMs || 1000)));

   const result = await APIClient.get(`/auth/identity-verification/${encodeURIComponent(normalizedIdentityVerificationId)}`);
   return {
      ...result,
      success: result?.success !== false,
      identityVerificationId: result?.identityVerificationId || normalizedIdentityVerificationId,
      message: result?.message || '본인인증이 완료되었습니다.'
   };
}

async function kcpIdentityPollForResult(identityVerificationId, options = {}) {
   const normalizedIdentityVerificationId = String(identityVerificationId || '').trim();
   const cacheOnly = options.cacheOnly !== false;
   if (!normalizedIdentityVerificationId) {
      throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
   }

   const timeoutMs = Number(options.timeoutMs || 5 * 60 * 1000);
   const intervalMs = Number(options.intervalMs || 2000);
   const startedAt = Date.now();
   let lastError = null;

   while (Date.now() - startedAt < timeoutMs) {
      await new Promise(resolve => window.setTimeout(resolve, intervalMs));

      try {
         const result = await APIClient.get(
            `/auth/identity-verification/${encodeURIComponent(normalizedIdentityVerificationId)}`,
            cacheOnly ? { cacheOnly: '1' } : {}
         );
         if (result?.pending) {
            continue;
         }

         return {
            ...result,
            success: result?.success !== false,
            identityVerificationId: result?.identityVerificationId || normalizedIdentityVerificationId,
            message: result?.message || '본인인증이 완료되었습니다.'
         };
      } catch (error) {
         lastError = error;
         if (!isKcpIdentityPollableError(error)) {
            throw error;
         }
      }
   }

   throw new Error(lastError?.message || '본인인증 결과를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
}

async function kcpIdentityRequestVerification(options = {}) {

   if (typeof APIClient === 'undefined' || typeof APIClient.post !== 'function') {
      throw new Error('API 클라이언트를 찾을 수 없습니다.');
   }

   const registration = await APIClient.post('/auth/request-identity-verification', {
      ...options,
      kcpPageSubmitYn: options.kcpPageSubmitYn || 'N'
   });
   const callUrl = String(registration?.callUrl || '').trim();
   const regCertKey = String(registration?.regCertKey || registration?.identityVerificationId || '').trim();
   if (!callUrl || !regCertKey) {
      throw new Error('KCP 본인인증 호출 정보를 받지 못했습니다. 다시 시도해주세요.');
   }

   const waitForCallbackPromise = kcpIdentityWaitForResult({
      allowedOrigins: [registration?.returnOrigin],
      timeoutMs: options.timeoutMs
   });
   // KCP 결과 조회 API는 인증 완료 전 반복 호출 시 upstream 재시도 한도 초과(502)를 유발할 수 있으므로,
   // 폴백 폴링은 서버 콜백이 캐시에 저장한 결과만 확인합니다.
   const enablePollingFallback = options.enablePollingFallback !== false;
   const authWindow = kcpIdentitySubmitAuthWindow({
      callUrl,
      regCertKey,
      kcpPageSubmitYn: registration?.kcpPageSubmitYn || 'N'
   });

   const waitPromises = [waitForCallbackPromise];
   if (enablePollingFallback) {
      waitPromises.push(kcpIdentityPollForResult(regCertKey, {
         timeoutMs: options.timeoutMs,
         intervalMs: options.pollIntervalMs,
         cacheOnly: true
      }));
   }
   if (authWindow?.popup) {
      waitPromises.push(kcpIdentityFetchResultAfterPopupClosed(authWindow.popup, regCertKey, {
         timeoutMs: options.timeoutMs,
         popupCloseIntervalMs: options.popupCloseIntervalMs,
         fetchDelayMs: options.popupCloseFetchDelayMs
      }));
   }
   const resultPromise = Promise.race(waitPromises);

   const response = await resultPromise;
   if (!response?.success) {
      throw new Error(response?.message || '본인인증에 실패했습니다.');
   }

   return {
      ...response,
      identityVerificationId: response.identityVerificationId || regCertKey,
      regCertKey
   };
}

window.KcpIdentity = {
   request: kcpIdentityRequestVerification,
   submitAuthWindow: kcpIdentitySubmitAuthWindow,
   waitForResult: kcpIdentityWaitForResult,
   pollForResult: kcpIdentityPollForResult,
   maskValue: kcpIdentityMaskValue,
   isMobileViewport: isKcpMobileViewport
};

const KAKAO_SHARE_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js';
const DEFAULT_KAKAO_SHARE_IMAGE_URL = 'https://nightmens.com/src/assets/live-avatars/brand-logo3.png';
let kakaoShareSdkLoader = null;

function getKakaoJavascriptKey() {
   const configKey = String(window.MNMS_PUBLIC_CONFIG?.kakaoJavascriptKey || '').trim();
   if (configKey) return configKey;

   return String(document.querySelector('meta[name="kakao-javascript-key"]')?.content || '').trim();
}

function findKakaoShareSdkScript() {
   return document.querySelector('script[data-kakao-share-sdk="true"]')
      || [...document.scripts].find((script) => String(script.src || '').startsWith(KAKAO_SHARE_SDK_URL));
}

function resolveKakaoShareSdk(resolve, reject) {
   if (window.Kakao) {
      resolve(window.Kakao);
      return;
   }

   kakaoShareSdkLoader = null;
   reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
}

function loadKakaoShareSdk() {
   if (window.Kakao) return Promise.resolve(window.Kakao);
   if (kakaoShareSdkLoader) return kakaoShareSdkLoader;

   kakaoShareSdkLoader = new Promise((resolve, reject) => {
      const existingScript = findKakaoShareSdkScript();
      if (existingScript) {
         existingScript.dataset.kakaoShareSdk = 'true';
         existingScript.addEventListener('load', () => resolveKakaoShareSdk(resolve, reject), { once: true });
         existingScript.addEventListener('error', () => {
            kakaoShareSdkLoader = null;
            reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
         }, { once: true });
         return;
      }

      const script = document.createElement('script');
      script.src = KAKAO_SHARE_SDK_URL;
      script.async = true;
      script.dataset.kakaoShareSdk = 'true';
      script.addEventListener('load', () => resolveKakaoShareSdk(resolve, reject), { once: true });
      script.addEventListener('error', () => {
         kakaoShareSdkLoader = null;
         reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
      }, { once: true });
      document.head.appendChild(script);
   });

   return kakaoShareSdkLoader;
}

async function sendKakaoDefaultShare({ title, description, url, buttonTitle = '사이트 바로가기', imageUrl } = {}) {
   const javascriptKey = getKakaoJavascriptKey();
   if (!javascriptKey) {
      throw new Error('KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.');
   }

   const kakao = await loadKakaoShareSdk();
   if (!kakao || !kakao.Share || typeof kakao.Share.sendDefault !== 'function') {
      throw new Error('카카오 공유 기능을 사용할 수 없습니다.');
   }

   if (typeof kakao.isInitialized !== 'function' || !kakao.isInitialized()) {
      kakao.init(javascriptKey);
   }

   if (typeof kakao.isInitialized === 'function' && !kakao.isInitialized()) {
      throw new Error('카카오 SDK 초기화에 실패했습니다. JavaScript 키와 Web 플랫폼 도메인을 확인해주세요.');
   }

   const shareUrl = String(url || window.location.href);
   const resolvedImageUrl = String(imageUrl || document.querySelector('meta[property="og:image"]')?.content || DEFAULT_KAKAO_SHARE_IMAGE_URL).trim();

   kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
         title: String(title || document.title || '미드나잇 맨즈'),
         description: String(description || '대한민국 최대 유흥 커뮤니티'),
         imageUrl: resolvedImageUrl,
         link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl
         }
      },
      buttons: [
         {
            title: buttonTitle,
            link: {
               mobileWebUrl: shareUrl,
               webUrl: shareUrl
            }
         }
      ]
   });
}
