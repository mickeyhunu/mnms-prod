import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createPost } from '../services/postService.js';

export default {
  setup() {
    const router = useRouter();
    const title = ref('');
    const content = ref('');

    const submit = async () => {
      await createPost({ title: title.value, content: content.value });
      router.push('/');
    };

    return { title, content, submit };
  },
  template: `
    <section>
      <h2>글 작성</h2>
      <input v-model="title" placeholder="제목" />
      <textarea v-model="content" placeholder="내용"></textarea>
      <button @click="submit">등록</button>
    </section>
  `
};
