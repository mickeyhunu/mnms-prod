import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { fetchPosts } from '../services/postService.js';

export default {
  setup() {
    const posts = ref([]);

    onMounted(async () => {
      posts.value = await fetchPosts();
    });

    return { posts };
  },
  template: `
    <section>
      <h2>게시글</h2>
      <div class="post" v-for="p in posts" :key="p.id">
        <router-link :to="'/posts/' + p.id">{{ p.title }}</router-link>
        <div class="muted">{{ p.authorNickname }}</div>
      </div>
    </section>
  `
};
