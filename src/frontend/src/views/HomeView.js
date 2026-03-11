import { ref, onMounted } from 'vue';
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
