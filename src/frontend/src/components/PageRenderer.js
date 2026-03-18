/**
 * 파일 역할: PageRenderer UI 조합 및 페이지 렌더링을 담당하는 프론트엔드 컴포넌트 파일.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { pageRegistry } from '../pageRegistry.js';

const LINK_MAP = {
  'index.html': '/',
  'login.html': '/login',
  'register.html': '/register',
  'create-post.html': '/create',
  'post-detail.html': '/post-detail',
  'bookmarks.html': '/bookmarks',
  'community.html': '/community',
  'my-page.html': '/my-page',
  'admin.html': '/admin',
  'find-account.html': '/find-account',
  'business-info.html': '/business-info',
  'live.html': '/live'
};

const GLOBAL_HEADER_TEMPLATE = `<header class="header">
  <div class="header-container">
    <a href="/" class="logo"><h1>미드나잇 맨즈</h1></a>
    <nav class="nav" id="navigation">
      <div class="nav-guest" id="nav-guest">
        <a href="/login" class="btn btn-outline btn-sm">로그인</a>
        <a href="/register" class="btn btn-primary btn-sm">회원가입</a>
      </div>
      <div class="nav-user hidden" id="nav-user">
        <span class="user-nickname" id="user-nickname"></span>
        <div class="header-notification-wrapper">
          <button class="header-notification-button" id="header-notification-button" type="button" aria-label="알림 열기" aria-haspopup="dialog" aria-expanded="false">
            <span class="header-notification-icon" aria-hidden="true">🔔</span>
            <span class="header-notification-label">알림</span>
            <span class="header-notification-dot hidden" id="header-notification-dot"></span>
          </button>
          <section class="header-notification-panel hidden" id="header-notification-panel" aria-label="알림 목록">
            <div class="header-notification-panel-header">
              <strong>알림</strong>
              <button class="header-notification-read-all" id="header-notification-read-all" type="button">모두 확인</button>
            </div>
            <div class="header-notification-list" id="header-notification-list"></div>
          </section>
        </div>
        <a href="/admin" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
        <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
      </div>
    </nav>
  </div>
</header>`;

const GLOBAL_SCRIPTS = [
  'scripts/js/utils/constants.js',
  'scripts/js/utils/helpers.js',
  'scripts/js/utils/auth.js',
  'scripts/js/api/apiClient.js',
  'scripts/js/api/authAPI.js',
  'scripts/js/components/header.js',
  'scripts/js/components/footerNav.js'
];

function mapHtmlPath(rawPath) {
  const normalizedPath = rawPath.replace(/^\.\//, '');
  const [file, suffix = ''] = normalizedPath.split(/(?=[?#])/);
  const mapped = LINK_MAP[file.toLowerCase()] || `/${file.replace(/\.html$/i, '')}`;
  return `${mapped}${suffix}`;
}

function normalizeTemplateLinks(template) {
  return template.replace(/href=(['"])([^'"]+\.html(?:[?#][^'"]*)?)\1/gi, (_, quote, fileWithSuffix) => {
    return `href=${quote}${mapHtmlPath(fileWithSuffix)}${quote}`;
  });
}

function stripLegacyHeader(template) {
  return template.replace(/^\s*<header class="header">[\s\S]*?<\/header>\s*/i, '');
}

function toPublicAssetPath(assetPath) {
  if (!assetPath) return assetPath;
  if (assetPath.startsWith('http') || assetPath.startsWith('/')) return assetPath;
  return `/src/${assetPath.replace(/^\.\//, '')}`;
}

export default {
  props: {
    page: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const injectedNodes = [];

    const pageConfig = computed(() => pageRegistry[props.page] || { template: '<div>페이지를 찾을 수 없습니다.</div>', styles: [], scripts: [] });
    const pageBodyContent = computed(() => normalizeTemplateLinks(stripLegacyHeader(pageConfig.value.template || '')));

    const clearInjectedNodes = () => {
      injectedNodes.forEach((node) => node.remove());
      injectedNodes.length = 0;
    };

    const injectStyles = () => {
      (pageConfig.value.styles || []).forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = toPublicAssetPath(href);
        link.dataset.page = props.page;
        document.head.appendChild(link);
        injectedNodes.push(link);
      });
    };

    const injectScripts = async () => {
      const pageScripts = (pageConfig.value.scripts || []).filter(
        (src) => !GLOBAL_SCRIPTS.includes(src)
      );
      const orderedScripts = [...GLOBAL_SCRIPTS, ...pageScripts];

      for (const src of orderedScripts) {
        const script = document.createElement('script');
        script.src = toPublicAssetPath(src);
        script.defer = true;
        script.dataset.page = props.page;
        document.body.appendChild(script);
        injectedNodes.push(script);
        await new Promise((resolve) => {
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', resolve, { once: true });
        });
      }
    };

    const loadPageAssets = async () => {
      clearInjectedNodes();
      await nextTick();
      injectStyles();
      await injectScripts();
    };

    onMounted(async () => {
      await loadPageAssets();
    });

    watch(
      () => props.page,
      async () => {
        await loadPageAssets();
      },
      { flush: 'post' }
    );

    onBeforeUnmount(() => {
      clearInjectedNodes();
    });

    return { pageBodyContent, globalHeaderTemplate: GLOBAL_HEADER_TEMPLATE };
  },
  template: `<div><div v-html="globalHeaderTemplate"></div><div v-html="pageBodyContent"></div></div>`
};
