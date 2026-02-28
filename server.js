const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'data.json');
const STATIC_DIR = path.join(__dirname, 'src/main/resources/static');

const seedData = { users:[{id:1,email:'admin@company.com',password:'admin1234',nickname:'관리자001',company:'AdminCorp',role:'ADMIN',createdAt:new Date().toISOString()}], posts:[], comments:[], bookmarks:[], likes:[], messages:[], sessions:{} };
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(seedData, null, 2));

const pageMap = { '/':'index.html','/index':'index.html','/login':'login.html','/register':'register.html','/create-post':'create-post.html','/post-detail':'post-detail.html','/my-page':'my-page.html','/bookmarks':'bookmarks.html','/admin':'admin.html' };

const json = (res, status, data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); };
const loadDb = () => JSON.parse(fs.readFileSync(DB_PATH,'utf8'));
const saveDb = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2));
const nextId = (arr) => arr.length ? Math.max(...arr.map(v=>v.id||0))+1 : 1;
const parseBody = (req) => new Promise((resolve)=>{ let body=''; req.on('data',c=>body+=c); req.on('end',()=>{ try{resolve(body?JSON.parse(body):{});}catch{resolve({});} }); });
const authUser = (req, db) => { const auth=req.headers.authorization||''; const token=auth.startsWith('Bearer ')?auth.slice(7):''; const uid=db.sessions[token]; return uid ? db.users.find(u=>u.id===uid) : null; };

function staticFile(reqPath, res){
  const filePath = pageMap[reqPath] ? path.join(STATIC_DIR, pageMap[reqPath]) : path.join(STATIC_DIR, reqPath);
  if (!filePath.startsWith(STATIC_DIR)) return false;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath);
  const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'}[ext] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type':mime});
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;
  const method = req.method;

  if (method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); return res.end(); }

  if (!p.startsWith('/api/')) {
    if (staticFile(p === '/' ? '/index' : p, res)) return;
    return json(res, 404, { message: 'Not found' });
  }

  const db = loadDb();
  const user = authUser(req, db);

  if (p==='/api/auth/register' && method==='POST') {
    const b = await parseBody(req);
    if (!b.email || !b.password || !b.companyName) return json(res,400,{message:'필수값이 누락되었습니다.'});
    if (db.users.some(v=>v.email===b.email)) return json(res,400,{message:'이미 사용 중인 이메일입니다.'});
    const nu={id:nextId(db.users),email:b.email,password:b.password,company:b.companyName,nickname:`${b.companyName}${Math.floor(Math.random()*900+100)}`,role:'USER',createdAt:new Date().toISOString()};
    db.users.push(nu); saveDb(db); return json(res,200,{success:true,user:{...nu,password:undefined}});
  }
  if (p==='/api/auth/login' && method==='POST') {
    const b = await parseBody(req); const found=db.users.find(v=>v.email===b.email && v.password===b.password);
    if(!found) return json(res,401,{message:'이메일 또는 비밀번호가 올바르지 않습니다.'});
    const token=crypto.randomBytes(24).toString('hex'); db.sessions[token]=found.id; saveDb(db);
    return json(res,200,{success:true,token,user:{id:found.id,email:found.email,nickname:found.nickname,company:found.company,role:found.role,isAdmin:found.role==='ADMIN'}});
  }
  if (p==='/api/auth/me' && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); return json(res,200,{id:user.id,email:user.email,nickname:user.nickname,company:user.company,role:user.role,isAdmin:user.role==='ADMIN'}); }
  if (p==='/api/auth/logout' && method==='POST') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const t=(req.headers.authorization||'').slice(7); delete db.sessions[t]; saveDb(db); return json(res,200,{success:true}); }

  if (p==='/api/posts' && method==='GET') {
    const page=Number(u.searchParams.get('page')||0), size=Number(u.searchParams.get('size')||10);
    const sorted=[...db.posts].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const content=sorted.slice(page*size,page*size+size).map(post=>({...post,authorNickname:db.users.find(v=>v.id===post.userId)?.nickname||'익명',commentCount:db.comments.filter(c=>c.postId===post.id).length,likeCount:db.likes.filter(l=>l.postId===post.id).length}));
    return json(res,200,{content,totalElements:sorted.length,page,size,totalPages:Math.ceil(sorted.length/size)});
  }
  if (p==='/api/posts' && method==='POST') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const b=await parseBody(req);
    if(!b.title||!b.content) return json(res,400,{message:'제목과 내용을 입력해주세요.'});
    const post={id:nextId(db.posts),title:b.title,content:b.content,imageUrl:b.imageUrl||null,userId:user.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    db.posts.push(post); saveDb(db); return json(res,201,{success:true,post});
  }

  let m;
  if ((m=p.match(/^\/api\/posts\/(\d+)$/)) && method==='GET') {
    const id=Number(m[1]), post=db.posts.find(v=>v.id===id); if(!post) return json(res,404,{message:'게시글을 찾을 수 없습니다.'});
    return json(res,200,{...post,authorNickname:db.users.find(v=>v.id===post.userId)?.nickname||'익명',comments:db.comments.filter(c=>c.postId===id),likeCount:db.likes.filter(l=>l.postId===id).length,bookmarkCount:db.bookmarks.filter(b=>b.postId===id).length});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)$/)) && method==='PUT') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const id=Number(m[1]); const post=db.posts.find(v=>v.id===id); if(!post) return json(res,404,{message:'게시글을 찾을 수 없습니다.'});
    if(post.userId!==user.id && user.role!=='ADMIN') return json(res,403,{message:'권한이 없습니다.'}); const b=await parseBody(req); post.title=b.title??post.title; post.content=b.content??post.content; post.updatedAt=new Date().toISOString(); saveDb(db); return json(res,200,{success:true,post});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)$/)) && method==='DELETE') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const id=Number(m[1]); const post=db.posts.find(v=>v.id===id); if(!post) return json(res,404,{message:'게시글을 찾을 수 없습니다.'});
    if(post.userId!==user.id && user.role!=='ADMIN') return json(res,403,{message:'권한이 없습니다.'}); db.posts=db.posts.filter(v=>v.id!==id); db.comments=db.comments.filter(c=>c.postId!==id); db.likes=db.likes.filter(l=>l.postId!==id); db.bookmarks=db.bookmarks.filter(b=>b.postId!==id); saveDb(db); return json(res,200,{success:true});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)\/like$/)) && method==='POST') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const postId=Number(m[1]); const ex=db.likes.find(l=>l.postId===postId&&l.userId===user.id);
    db.likes=ex?db.likes.filter(l=>!(l.postId===postId&&l.userId===user.id)):[...db.likes,{id:nextId(db.likes),postId,userId:user.id}]; saveDb(db); return json(res,200,{success:true,liked:!ex,likeCount:db.likes.filter(l=>l.postId===postId).length});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)\/bookmark$/)) && method==='POST') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const postId=Number(m[1]); const ex=db.bookmarks.find(b=>b.postId===postId&&b.userId===user.id);
    db.bookmarks=ex?db.bookmarks.filter(b=>!(b.postId===postId&&b.userId===user.id)):[...db.bookmarks,{id:nextId(db.bookmarks),postId,userId:user.id}]; saveDb(db); return json(res,200,{success:true,bookmarked:!ex});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)\/comments$/)) && method==='GET') {
    const postId=Number(m[1]); return json(res,200,{content:db.comments.filter(c=>c.postId===postId).map(c=>({...c,authorNickname:db.users.find(v=>v.id===c.userId)?.nickname||'익명'}))});
  }
  if ((m=p.match(/^\/api\/posts\/(\d+)\/comments$/)) && method==='POST') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const b=await parseBody(req); const content=typeof b==='string'?b:b.content;
    if(!content) return json(res,400,{message:'댓글 내용을 입력해주세요.'}); const comment={id:nextId(db.comments),postId:Number(m[1]),userId:user.id,content,parentId:b.parentId||null,createdAt:new Date().toISOString()}; db.comments.push(comment); saveDb(db); return json(res,201,{success:true,comment});
  }
  if ((m=p.match(/^\/api\/comments\/(\d+)$/)) && method==='PUT') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const b=await parseBody(req); const c=db.comments.find(v=>v.id===Number(m[1])); if(!c) return json(res,404,{message:'댓글을 찾을 수 없습니다.'}); if(c.userId!==user.id&&user.role!=='ADMIN') return json(res,403,{message:'권한이 없습니다.'}); c.content=b.content??c.content; saveDb(db); return json(res,200,{success:true,comment:c});
  }
  if ((m=p.match(/^\/api\/comments\/(\d+)$/)) && method==='DELETE') {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const c=db.comments.find(v=>v.id===Number(m[1])); if(!c) return json(res,404,{message:'댓글을 찾을 수 없습니다.'}); if(c.userId!==user.id&&user.role!=='ADMIN') return json(res,403,{message:'권한이 없습니다.'}); db.comments=db.comments.filter(v=>v.id!==Number(m[1])); saveDb(db); return json(res,200,{success:true});
  }

  if (p==='/api/bookmarks/my' && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const ids=db.bookmarks.filter(v=>v.userId===user.id).map(v=>v.postId); return json(res,200,db.posts.filter(v=>ids.includes(v.id))); }
  if ((m=p.match(/^\/api\/bookmarks\/check\/(\d+)$/)) && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); return json(res,200,{bookmarked:db.bookmarks.some(v=>v.userId===user.id&&v.postId===Number(m[1]))}); }
  if ((m=p.match(/^\/api\/bookmarks\/(\d+)\/toggle$/)) && method==='POST') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const postId=Number(m[1]); const ex=db.bookmarks.find(v=>v.userId===user.id&&v.postId===postId); db.bookmarks=ex?db.bookmarks.filter(v=>!(v.userId===user.id&&v.postId===postId)):[...db.bookmarks,{id:nextId(db.bookmarks),userId:user.id,postId}]; saveDb(db); return json(res,200,{success:true,bookmarked:!ex}); }

  if (p==='/api/posts/messages/received' && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); return json(res,200,db.messages.filter(v=>v.receiverId===user.id)); }
  if (p==='/api/posts/messages/sent' && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); return json(res,200,db.messages.filter(v=>v.senderId===user.id)); }
  if (p==='/api/posts/messages' && method==='POST') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const b=await parseBody(req); if(!b.receiverId||!b.content) return json(res,400,{message:'필수값이 누락되었습니다.'}); const msg={id:nextId(db.messages),senderId:user.id,receiverId:Number(b.receiverId),content:b.content,isRead:false,createdAt:new Date().toISOString()}; db.messages.push(msg); saveDb(db); return json(res,201,{success:true,message:msg}); }
  if ((m=p.match(/^\/api\/posts\/messages\/(\d+)\/read$/)) && method==='PUT') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const msg=db.messages.find(v=>v.id===Number(m[1])&&v.receiverId===user.id); if(!msg) return json(res,404,{message:'쪽지를 찾을 수 없습니다.'}); msg.isRead=true; saveDb(db); return json(res,200,{success:true,message:msg}); }
  if ((m=p.match(/^\/api\/posts\/messages\/(\d+)$/)) && method==='DELETE') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); const id=Number(m[1]); db.messages=db.messages.filter(v=>!(v.id===id&&(v.receiverId===user.id||v.senderId===user.id))); saveDb(db); return json(res,200,{success:true}); }
  if (p==='/api/posts/messages/unread-count' && method==='GET') { if(!user) return json(res,401,{message:'인증이 필요합니다.'}); return json(res,200,{unreadCount:db.messages.filter(v=>v.receiverId===user.id&&!v.isRead).length}); }

  if (p==='/api/search/posts' && method==='GET') { const q=(u.searchParams.get('keyword')||'').toLowerCase(); const content=db.posts.filter(v=>v.title.toLowerCase().includes(q)||v.content.toLowerCase().includes(q)); return json(res,200,{content,totalElements:content.length}); }

  if (p.startsWith('/api/admin/')) {
    if(!user) return json(res,401,{message:'인증이 필요합니다.'}); if(user.role!=='ADMIN') return json(res,403,{message:'관리자 권한이 필요합니다.'});
    if (p==='/api/admin/posts' && method==='GET') return json(res,200,{content:db.posts,totalElements:db.posts.length});
    if (p==='/api/admin/users' && method==='GET') return json(res,200,db.users.map(({password,...v})=>v));
    if (p==='/api/admin/comments' && method==='GET') return json(res,200,{content:db.comments,totalElements:db.comments.length});
    if (p==='/api/admin/stats/posts' && method==='GET') return json(res,200,{totalPosts:db.posts.length});
    if (p==='/api/admin/stats/users' && method==='GET') return json(res,200,{totalUsers:db.users.length});
    if (p==='/api/admin/stats/comments' && method==='GET') return json(res,200,{totalComments:db.comments.length});
    if ((m=p.match(/^\/api\/admin\/posts\/(\d+)$/)) && method==='DELETE') { db.posts=db.posts.filter(v=>v.id!==Number(m[1])); saveDb(db); return json(res,200,{success:true}); }
    if ((m=p.match(/^\/api\/admin\/comments\/(\d+)$/)) && method==='DELETE') { db.comments=db.comments.filter(v=>v.id!==Number(m[1])); saveDb(db); return json(res,200,{success:true}); }
  }

  return json(res,404,{message:'API를 찾을 수 없습니다.'});
});

server.listen(PORT, ()=> console.log(`Node.js server running on http://localhost:${PORT}`));
