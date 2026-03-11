import PageRenderer from '../components/PageRenderer.js';

export default {
  components: { PageRenderer },
  computed: {
    pageKey() {
      return this.$route.meta.pageKey;
    }
  },
  template: `<PageRenderer :page="pageKey" />`
};
