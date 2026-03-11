const { createApp, ref, onMounted } = Vue;
const { createRouter, createWebHistory, useRoute, useRouter } = VueRouter;

const api = {
  token: localStorage.getItem('token') || '',
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '요청 실패');
    return data;
  }
};

const Home = {
  template: `<div class='container'><h2>게시글</h2><div class='post' v-for='p in posts' :key='p.id'><router-link :to='\`/posts/${p.id}\`'>{{p.title}}</router-link><div>{{p.authorNickname}}</div></div></div>`,
  setup() {
    const posts = ref([]);
    onMounted(async () => { posts.value = (await api.request('/api/posts')).content || []; });
    return { posts };
  }
};

const Login = {
  template: `<div class='container'><h2>로그인</h2><input v-model='loginId' placeholder='아이디'/><input v-model='password' type='password' placeholder='비밀번호'/><button @click='submit'>로그인</button></div>`,
  setup() {
    const router = useRouter();
    const loginId = ref('');
    const password = ref('');
    const submit = async () => {
      const result = await api.request('/api/auth/login', { method:'POST', body: JSON.stringify({ loginId: loginId.value, password: password.value }) });
      api.token = result.token;
      localStorage.setItem('token', result.token);
      router.push('/');
    };
    return { loginId, password, submit };
  }
};

const Register = {
  template: `<div class='container'><h2>회원가입</h2><input v-model='loginId' placeholder='아이디'/><input v-model='nickname' placeholder='닉네임'/><input v-model='password' type='password' placeholder='비밀번호'/><button @click='submit'>가입</button></div>`,
  setup() {
    const router = useRouter();
    const loginId = ref(''); const nickname = ref(''); const password = ref('');
    const submit = async () => {
      await api.request('/api/auth/register', { method:'POST', body: JSON.stringify({ loginId: loginId.value, nickname: nickname.value, password: password.value }) });
      router.push('/login');
    };
    return { loginId, nickname, password, submit };
  }
};

const PostDetail = {
  template: `<div class='container' v-if='post'><h2>{{post.title}}</h2><p>{{post.content}}</p><h3>댓글</h3><div v-for='c in post.comments' :key='c.id'>- {{c.content}} ({{c.authorNickname}})</div><textarea v-model='comment'></textarea><button @click='addComment'>댓글 작성</button></div>`,
  setup() {
    const route = useRoute();
    const post = ref(null);
    const comment = ref('');
    const load = async () => { post.value = await api.request(`/api/posts/${route.params.id}`); };
    onMounted(load);
    const addComment = async () => {
      await api.request(`/api/posts/${route.params.id}/comments`, { method:'POST', body: JSON.stringify({ content: comment.value }) });
      comment.value = '';
      await load();
    };
    return { post, comment, addComment };
  }
};

const CreatePost = {
  template: `<div class='container'><h2>글 작성</h2><input v-model='title' placeholder='제목'/><textarea v-model='content' placeholder='내용'></textarea><button @click='submit'>등록</button></div>`,
  setup() {
    const router = useRouter();
    const title = ref(''); const content = ref('');
    const submit = async () => {
      await api.request('/api/posts', { method:'POST', body: JSON.stringify({ title: title.value, content: content.value }) });
      router.push('/');
    };
    return { title, content, submit };
  }
};

const App = {
  template: `<div><nav class='nav'><router-link to='/'>홈</router-link><router-link to='/create'>글쓰기</router-link><router-link to='/login'>로그인</router-link><router-link to='/register'>회원가입</router-link></nav><router-view/></div>`
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/create', component: CreatePost },
    { path: '/posts/:id', component: PostDetail }
  ]
});

createApp(App).use(router).mount('#app');
