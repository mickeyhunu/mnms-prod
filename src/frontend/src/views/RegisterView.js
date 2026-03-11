import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../services/authService.js';

export default {
  setup() {
    const router = useRouter();
    const loginId = ref('');
    const nickname = ref('');
    const password = ref('');

    const submit = async () => {
      await register({
        loginId: loginId.value,
        nickname: nickname.value,
        password: password.value
      });
      router.push('/login');
    };

    return { loginId, nickname, password, submit };
  },
  template: `
    <section>
      <h2>회원가입</h2>
      <input v-model="loginId" placeholder="아이디" />
      <input v-model="nickname" placeholder="닉네임" />
      <input v-model="password" type="password" placeholder="비밀번호" />
      <button @click="submit">가입</button>
    </section>
  `
};
