/**
 * 파일 역할: PageRenderer UI 조합 및 페이지 렌더링을 담당하는 프론트엔드 컴포넌트 파일.
 */
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
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
    const content = computed(() => normalizeTemplateLinks(pageConfig.value.template || ''));

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
      for (const src of pageConfig.value.scripts || []) {
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
      }
    );

    onBeforeUnmount(() => {
      clearInjectedNodes();
    });

    return { content };
  },
  template: `<div v-html="content"></div>`
};
