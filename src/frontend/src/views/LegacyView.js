import LegacyPageRenderer from '../components/LegacyPageRenderer.js';

export default {
  components: { LegacyPageRenderer },
  computed: {
    pageKey() {
      return this.$route.meta.pageKey;
    }
  },
  template: `<LegacyPageRenderer :page="pageKey" />`
};
