import { ref, onMounted, watch } from 'vue';

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

function normalizeHtml(rawHtml) {
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : rawHtml;

  return bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/href="([^"]+\.html)"/gi, (_, file) => {
      const mapped = LINK_MAP[file.toLowerCase()] || `/${file.replace(/\.html$/i, '')}`;
      return `href="${mapped}"`;
    });
}

export default {
  props: {
    page: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const content = ref('');

    const loadPage = async () => {
      const response = await fetch(`/src/static/${props.page}.html`);
      const html = await response.text();
      content.value = normalizeHtml(html);
    };

    onMounted(loadPage);
    watch(() => props.page, loadPage);

    return { content };
  },
  template: `<div v-html="content"></div>`
};
