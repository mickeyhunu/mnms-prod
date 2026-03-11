import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { useRouter } from 'https://unpkg.com/vue-router@4/dist/vue-router.esm-browser.prod.js';
import { login } from '../services/authService.js';

export default {
  setup() {
    const router = useRouter();
    const loginId = ref('');
    const password = ref('');

    const submit = async () => {
      await login({ loginId: loginId.value, password: password.value });
      router.push('/');
    };

    return { loginId, password, submit };
  },
  template: `
    <section>
      <h2>로그인</h2>
      <input v-model="loginId" placeholder="아이디" />
      <input v-model="password" type="password" placeholder="비밀번호" />
      <button @click="submit">로그인</button>
    </section>
  `
};
