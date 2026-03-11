import { computed, onBeforeUnmount, onMounted } from 'vue';
import { legacyPages } from './legacyPages.js';

const LINK_MAP = {
  'index.html': '/',
  'login.html': '/login',
  'register.html': '/register',
  'create-post.html': '/create',
  'post-detail.html': '/post-detail',
  'bookmarks.html': '/bookmarks',
  'community.html': '/community',
  'my-page.html': '/my-page',
  'edit-post.html': '/edit-post',
  'admin.html': '/admin',
  'find-account.html': '/find-account',
  'business-info.html': '/business-info',
  'live.html': '/live'
};

function normalizeTemplateLinks(template) {
  return template.replace(/href="([^\"]+\.html)"/gi, (_, file) => {
    const mapped = LINK_MAP[file.toLowerCase()] || `/${file.replace(/\.html$/i, '')}`;
    return `href="${mapped}"`;
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

    const pageConfig = computed(() => legacyPages[props.page] || { template: '<div>페이지를 찾을 수 없습니다.</div>', styles: [], scripts: [] });
    const content = computed(() => normalizeTemplateLinks(pageConfig.value.template || ''));

    const injectStyles = () => {
      (pageConfig.value.styles || []).forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = toPublicAssetPath(href);
        link.dataset.legacyPage = props.page;
        document.head.appendChild(link);
        injectedNodes.push(link);
      });
    };

    const injectScripts = async () => {
      for (const src of pageConfig.value.scripts || []) {
        const script = document.createElement('script');
        script.src = toPublicAssetPath(src);
        script.defer = true;
        script.dataset.legacyPage = props.page;
        document.body.appendChild(script);
        injectedNodes.push(script);
        await new Promise((resolve) => {
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', resolve, { once: true });
        });
      }
    };

    onMounted(async () => {
      injectStyles();
      await injectScripts();
    });

    onBeforeUnmount(() => {
      injectedNodes.forEach((node) => node.remove());
    });

    return { content };
  },
  template: `<div v-html="content"></div>`
};
