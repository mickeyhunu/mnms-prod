import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { useRoute } from 'https://unpkg.com/vue-router@4/dist/vue-router.esm-browser.prod.js';
import { createComment, fetchPost } from '../services/postService.js';

export default {
  setup() {
    const route = useRoute();
    const post = ref(null);
    const comment = ref('');

    const loadPost = async () => {
      post.value = await fetchPost(route.params.id);
    };

    const addComment = async () => {
      await createComment(route.params.id, comment.value);
      comment.value = '';
      await loadPost();
    };

    onMounted(loadPost);

    return { post, comment, addComment };
  },
  template: `
    <section v-if="post">
      <h2>{{ post.title }}</h2>
      <p>{{ post.content }}</p>

      <h3>댓글</h3>
      <div v-for="c in post.comments" :key="c.id">- {{ c.content }} ({{ c.authorNickname }})</div>

      <textarea v-model="comment"></textarea>
      <button @click="addComment">댓글 작성</button>
    </section>
  `
};
