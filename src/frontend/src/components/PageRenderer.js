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
        <div class="header-user-menu" id="header-user-menu">
          <button class="user-nickname-button" id="user-nickname" type="button" aria-haspopup="menu" aria-expanded="false">
            <span class="user-nickname-text" id="user-nickname-label"></span>
            <span class="user-nickname-caret" aria-hidden="true">▾</span>
          </button>
          <div class="header-user-dropdown hidden" id="header-user-dropdown" role="menu" aria-label="사용자 메뉴">
            <a href="/my-page/profile" class="header-user-dropdown-link" role="menuitem">회원정보</a>
            <button class="header-user-dropdown-link header-user-dropdown-action" id="logout-btn" type="button" role="menuitem">로그아웃</button>
          </div>
        </div>
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
      </div>
    </nav>
  </div>
</header>`;

const GLOBAL_STYLES = [
  'styles/common.css',
  'styles/layout.css',
  'styles/components.css'
];

const GLOBAL_SCRIPTS = [
  'scripts/js/utils/constants.js',
  'scripts/js/utils/helpers.js',
  'scripts/js/utils/auth.js',
  'scripts/js/api/apiClient.js',
  'scripts/js/api/authAPI.js',
  'scripts/js/components/header.js'
];

const persistentStyleNodes = new Map();
const persistentScriptNodes = new Map();
const persistentScriptPromises = new Map();

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

function ensureStyle(href, { persistent = false } = {}) {
  const publicHref = toPublicAssetPath(href);
  const registry = persistent ? persistentStyleNodes : null;

  if (registry?.has(publicHref)) {
    return registry.get(publicHref);
  }

  const existingNode = document.head.querySelector(`link[rel="stylesheet"][href="${publicHref}"]`);
  if (existingNode) {
    if (registry) registry.set(publicHref, existingNode);
    return existingNode;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = publicHref;
  link.dataset.assetType = persistent ? 'persistent-style' : 'page-style';
  document.head.appendChild(link);

  if (registry) registry.set(publicHref, link);
  return link;
}

function ensureScript(src, { persistent = false } = {}) {
  const publicSrc = toPublicAssetPath(src);

  if (persistent) {
    if (persistentScriptPromises.has(publicSrc)) {
      return persistentScriptPromises.get(publicSrc);
    }

    const existingNode = document.body.querySelector(`script[src="${publicSrc}"]`);
    if (existingNode?.dataset.loaded === 'true') {
      persistentScriptNodes.set(publicSrc, existingNode);
      const promise = Promise.resolve(existingNode);
      persistentScriptPromises.set(publicSrc, promise);
      return promise;
    }

    const script = existingNode || document.createElement('script');
    script.src = publicSrc;
    script.defer = true;
    script.dataset.assetType = 'persistent-script';

    const promise = new Promise((resolve) => {
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve(script);
      }, { once: true });
      script.addEventListener('error', () => resolve(script), { once: true });
    });

    if (!existingNode) {
      document.body.appendChild(script);
    }

    persistentScriptNodes.set(publicSrc, script);
    persistentScriptPromises.set(publicSrc, promise);
    return promise;
  }

  const script = document.createElement('script');
  script.src = publicSrc;
  script.defer = true;
  script.dataset.assetType = 'page-script';

  const promise = new Promise((resolve) => {
    script.addEventListener('load', () => resolve(script), { once: true });
    script.addEventListener('error', () => resolve(script), { once: true });
  });

  document.body.appendChild(script);
  return promise.then(() => script);
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

    const applyPageMarker = () => {
      document.body.dataset.page = props.page || '';
    };

    const clearInjectedNodes = () => {
      injectedNodes.forEach((node) => node.remove());
      injectedNodes.length = 0;
    };

    const injectStyles = () => {
      GLOBAL_STYLES.forEach((href) => {
        ensureStyle(href, { persistent: true });
      });

      (pageConfig.value.styles || [])
        .filter((href) => !GLOBAL_STYLES.includes(href))
        .forEach((href) => {
          const link = ensureStyle(href);
          link.dataset.page = props.page;
          injectedNodes.push(link);
        });
    };

    const injectScripts = async () => {
      for (const src of GLOBAL_SCRIPTS) {
        await ensureScript(src, { persistent: true });
      }

      const pageScripts = (pageConfig.value.scripts || []).filter(
        (src) => !GLOBAL_SCRIPTS.includes(src)
      );

      for (const src of pageScripts) {
        const script = await ensureScript(src);
        script.dataset.page = props.page;
        injectedNodes.push(script);
      }
    };

    const runPersistentInitializers = () => {
      if (typeof window.initHeader === 'function') {
        window.initHeader();
      }
    };

    const loadPageAssets = async () => {
      clearInjectedNodes();
      applyPageMarker();
      await nextTick();
      injectStyles();
      await injectScripts();
      runPersistentInitializers();
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
      delete document.body.dataset.page;
    });

    return { pageBodyContent, globalHeaderTemplate: GLOBAL_HEADER_TEMPLATE };
  },
  template: `<div><div v-html="globalHeaderTemplate"></div><div v-html="pageBodyContent"></div></div>`
};
