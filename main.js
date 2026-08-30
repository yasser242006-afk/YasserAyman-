/* ================== إعداد Supabase ================== */
const SUPABASE_URL = 'https://bzkbamohnjjzwxlvnodm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u48RJaZLVcDk-rXmzsl0NQ_N9egVFEb';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let currentTerm = '1';
let currentExamType = 'quiz';
let-header">
      <h3 id="video-modal-title"><i class="fas fa-video"></i> مشاهدة المحاضرة</h3>
      <button class="close-btn" onclick="closeVideoModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="video-player-wrapper">
        <video id="custom-video-player" src=""></video>

        <!-- شريط تحكم الفيديو -->
        <div class="video-controls">
          <input type="range" id="video-progress" value="0" min="0" step="0.1">
          <div class="controls-row">
            <div class="left-controls">
              <button onclick="togglePlayPause()" id="play-btn"><i class="fas fa-play"></i></button>
              <button onclick="rewindVideo(5)" title="تأخير 5 ثواني"><i class="fas fa-undo"></i> 5s</button>
              <button onclick="forwardVideo(10)" title="تقديم 10 ثواني"><i class="fas fa-redo"></i> 10s</button>
              <span id="video-time">00:00 / 00:00</span>
            </div>
            <div class="right-controls">
              <a id="video-download-btn" href="" download target="_blank" class="control-btn" title="تحميل الفيديو"><i class="fas fa-download"></i></a>
              <button onclick="toggleFullScreen()" title="تكبير الشاشة"><i class="fas fa-expand"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


<script>
/* ================== إعداد Supabase ================== */
const SUPABASE_URL = 'https://bzkbamohnjjzwxlvnodm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u48RJaZLVcDk-rXmzsl0NQ_N9egVFEb';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let currentTerm = '1';
let currentExamType = 'quiz';
let currentPostIdForComments = null;
let imageTargetType = null; // 'avatar' or 'cover'

/* أفاتار افتراضي ديناميكي: بيرجع أول حرف من اسم الطالب الحقيقي */
function getDefaultAvatar(){
  const name = currentProfile?.full_name || currentUser?.email || 'Student';
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5,0ea5e9`;
}

/* ================== Toast ================== */
function showToast(message, type='info'){
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(()=>toast.remove(), 3500);
}

/* ================== تهيئة الصفحة والتحقق من الحساب ================== */
window.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    // إعطاء وقت بسيط لمعالجة رمز الدخول القادم من Supabase Auth
    await new Promise(resolve => setTimeout(resolve, 200));

    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();

    // إذا لم يكن هناك جلسة تسجل خروج حقيقي للتوجيه إلى لصفحة الدخول
    if (sessionError || !session) {
      window.location.href = 'login.html';
      return;
    }

    currentUser = session.user;

    // جلب بيانات الحساب
    const result = await loadProfile();

    // لو الحساب غير موجود في قاعدة البيانات (سواء مستخدم جديد أو تم مسح بياناته)
    // يتم إنشاء صف جديد له فوراً ويعامل كأنه مستخدم جديد دون أي طرد
    if (result === 'not_found' || !currentProfile) {
      await createFreshProfileRow();
    }

    renderProfileUI();
    maybeShowWelcome();
    await refreshNotifications();
    await loadPosts();

  } catch(err) {
    console.error('Initialization error:', err);
  } finally {
    // إخفاء شاشة التحميل وإظهار الواجهة دائماً
    const loadingScreen = document.getElementById('loading-screen');
    const appScreen = document.getElementById('app');
    if(loadingScreen) loadingScreen.style.display = 'none';
    if(appScreen) appScreen.style.display = 'block';
  }
}

async function loadProfile(){
  try {
    const { data, error } = await _supabase.from('yasser_ayman')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error);
      return 'error';
    }

    if (!data) {
      return 'not_found';
    }

    currentProfile = data;
    return 'ok';
  } catch(e) {
    return 'error';
  }
}

/* ================== إنشاء صف بروفايل جديد تلقائياً ================== */
async function createFreshProfileRow(){
  const userData = {
    id: currentUser.id,
    email: currentUser.email || '',
    full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
    phone: currentUser.user_metadata?.phone || '',
    academic_year: currentUser.user_metadata?.academic_year || '1',
    avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
    first_login_shown: false,
    last_notification_check: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await _supabase.from('yasser_ayman')
    .upsert(userData, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating fresh profile row:', error);
    currentProfile = userData; // استخدام البيانات مؤقتاً في حالة حدوث مشكلة شبكة
    return;
  }

  currentProfile = data || userData;
}

function renderProfileUI(){
  const name = currentProfile?.full_name || currentUser?.email || 'طالب';
  const avatar = currentProfile?.avatar_url || getDefaultAvatar();
  
  const topName = document.getElementById('topbar-name');
  const topAvatar = document.getElementById('topbar-avatar');
  const sideAvatar = document.getElementById('sidebar-avatar');
  const sideName = document.getElementById('sidebar-name');
  const sideYear = document.getElementById('sidebar-year');

  if(topName) topName.innerText = name;
  if(topAvatar) topAvatar.src = avatar;
  if(sideAvatar) sideAvatar.src = avatar;
  if(sideName) sideName.innerText = name;
  
  const yearMap = {'1':'السنة الأولى','2':'السنة الثانية','3':'السنة الثالثة','4':'السنة الرابعة'};
  if(sideYear) sideYear.innerText = yearMap[currentProfile?.academic_year] || 'السنة الأولى';
}

/* ================== رسالة الترحيب (أول دخول فقط) ================== */
async function maybeShowWelcome(){
  if(currentProfile && !currentProfile.first_login_shown){
    const welcomeTitle = document.getElementById('welcome-title');
    if(welcomeTitle) welcomeTitle.innerText = `أهلاً بيك يا ${currentProfile.full_name || 'طالبنا العزيز'} 👋`;
    const overlay = document.getElementById('welcome-overlay');
    if(overlay) {
      overlay.classList.add('show');
      setTimeout(()=> overlay.classList.remove('show'), 3200);
    }
    await _supabase.from('yasser_ayman').update({ first_login_shown:true }).eq('id', currentUser.id);
    currentProfile.first_login_shown = true;
  }
}

/* ================== Sidebar / Notifications toggles ================== */
function toggleSidebar(){
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('open');
}

function toggleQuestionsMenu(el){
  document.getElementById('questions-submenu')?.classList.toggle('open');
  document.getElementById('q-chevron')?.classList.toggle('fa-chevron-up');
}

async function toggleNotifications(){
  const dd = document.getElementById('notif-dropdown');
  if(!dd) return;
  dd.classList.toggle('open');
  if(dd.classList.contains('open')){
    const badge = document.getElementById('notif-badge');
    if(badge) badge.style.display = 'none';
    await _supabase.from('yasser_ayman').update({ last_notification_check: new Date().toISOString() }).eq('id', currentUser.id);
  }
}

async function refreshNotifications(){
  const lastCheck = currentProfile?.last_notification_check || new Date(0).toISOString();
  const year = currentProfile?.academic_year || '1';
  const { data, error } = await _supabase.from('posts').select('*')
    .or(`academic_year.eq.all,academic_year.eq.${year}`)
    .gt('created_at', lastCheck)
    .order('created_at', { ascending:false });

  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  if(!list || !badge) return;

  if(error || !data || data.length === 0){
    list.innerHTML = '<div class="notif-empty">لا يوجد إشعارات جديدة</div>';
    badge.style.display = 'none';
    return;
  }
  badge.innerText = data.length;
  badge.style.display = 'flex';
  list.innerHTML = data.map(p => `
    <div class="notif-item">
      <div class="notif-dot"></div>
      <div><b style="font-weight:700">منشور جديد</b><br><span style="color:var(--text-secondary)">${escapeHtml((p.content||'').slice(0,60))}</span></div>
    </div>`).join('');
}

/* ================== التنقل بين الصفحات ================== */
function switchView(view, el){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const targetView = document.getElementById('view-'+view);
  if(targetView) targetView.classList.add('active');
  
  document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
  if(el) {
    const item = el.closest('.menu-item') || el;
    item.classList.add('active');
  }
  
  const sidebar = document.getElementById('sidebar');
  if(sidebar && sidebar.classList.contains('open')) {
    toggleSidebar();
  }
  
  if(view === 'grades') loadGrades();
  if(view === 'questions'){
    const subjSelect = document.getElementById('q-subject-select');
    const termSelect = document.getElementById('q-term-select');
    const qSubj = document.getElementById('questions-subject');
    const qTerm = document.getElementById('questions-term');
    if(subjSelect && qSubj) qSubj.value = subjSelect.value;
    if(termSelect && qTerm) qTerm.value = termSelect.value;
  }
  if(view === 'schedule') loadSchedule();
  if(view === 'lectures') renderLectureSubjectTabs();
}

/* ================== الصورة الشخصية / الغلاف ================== */
function openImageMenu(e, type){
  e.stopPropagation();
  imageTargetType = type;
  const menu = document.getElementById('image-menu');
  if(!menu) return;
  menu.style.top = (e.clientY + 10) + 'px';
  menu.style.left = Math.max(10, e.clientX - 170) + 'px';
  menu.classList.add('open');
  document.addEventListener('click', closeImageMenuOnce);
}

function closeImageMenuOnce(){
  const menu = document.getElementById('image-menu');
  if(menu) menu.classList.remove('open');
  document.removeEventListener('click', closeImageMenuOnce);
}

function viewImage(){
  const src = currentProfile?.avatar_url || getDefaultAvatar();
  window.open(src, '_blank');
}

function triggerImageChange(){
  document.getElementById('image-file-input')?.click();
}

document.getElementById('image-file-input')?.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  try{
    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/avatar_${Date.now()}.${ext}`;
    const { error: upErr } = await _supabase.storage.from('avatars').upload(path, file, { upsert:true });
    if(upErr) throw upErr;
    const { data } = _supabase.storage.from('avatars').getPublicUrl(path);
    await _supabase.from('yasser_ayman').update({ avatar_url: data.publicUrl }).eq('id', currentUser.id);
    if(!currentProfile) currentProfile = {};
    currentProfile.avatar_url = data.publicUrl;
    renderProfileUI();
    showToast('تم تحديث الصورة بنجاح', 'success');
  }catch(err){
    showToast('حدث خطأ أثناء رفع الصورة: '+err.message, 'error');
  }
  e.target.value = '';
});

async function deleteImage(){
  await _supabase.from('yasser_ayman').update({ avatar_url: null }).eq('id', currentUser.id);
  if(currentProfile) currentProfile.avatar_url = null;
  renderProfileUI();
  showToast('تم حذف الصورة', 'success');
}

/* ================== المنشورات (الصفحة الرئيسية) ================== */
async function loadPosts(){
  const year = currentProfile?.academic_year || '1';
  const container = document.getElementById('posts-container');
  if(!container) return;

  const { data: posts, error } = await _supabase.from('posts').select('*')
    .or(`academic_year.eq.all,academic_year.eq.${year}`)
    .order('created_at', { ascending:false });

  if(error){ container.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>تعذر تحميل المنشورات</p></div>`; return; }
  if(!posts || posts.length === 0){ container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد منشورات حتى الآن</p></div>`; return; }

  container.innerHTML = '';
  for(const post of posts){
    const card = await buildPostCard(post);
    container.appendChild(card);
  }
}

async function buildPostCard(post){
  const [{ count: likeCount }, { data: myLike }, { count: commentCount }, { count: viewCount }] = await Promise.all([
    _supabase.from('post_likes').select('*', { count:'exact', head:true }).eq('post_id', post.id),
    _supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUser.id).maybeSingle(),
    _supabase.from('post_comments').select('*', { count:'exact', head:true }).eq('post_id', post.id),
    _supabase.from('post_views').select('*', { count:'exact', head:true }).eq('post_id', post.id),
  ]);

  _supabase.from('post_views').insert({ post_id: post.id, user_id: currentUser.id }).then(()=>{});

  const div = document.createElement('div');
  div.className = 'post-card';
  div.innerHTML = `
    <div class="post-body">
      <div class="post-meta">
        <div class="adm-icon"><i class="fas fa-bullhorn"></i></div>
        <div>
          <div class="adm-name">إدارة الكلية</div>
          <div class="post-date">${formatDate(post.created_at)}</div>
        </div>
      </div>
      <div class="post-content">${escapeHtml(post.content||'')}</div>
    </div>
    ${post.image_url ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="">` : ''}
    <div class="post-actions">
      <div class="left-group">
        <button class="act-btn ${myLike?'liked':''}" data-post="${post.id}" onclick="toggleLike('${post.id}', this)">
          <i class="fa-heart ${myLike?'fas':'far'}"></i> <span class="like-count">${likeCount||0}</span>
        </button>
        <button class="act-btn" onclick="openComments('${post.id}')">
          <i class="far fa-comment"></i> <span>${commentCount||0}</span>
        </button>
        <button class="act-btn" onclick="sharePost('${post.id}')">
          <i class="fas fa-share-nodes"></i> مشاركة
        </button>
      </div>
      <div class="views-count"><i class="far fa-eye"></i> ${viewCount||0}</div>
    </div>
  `;
  return div;
}

async function toggleLike(postId, btn){
  const isLiked = btn.classList.contains('liked');
  const countSpan = btn.querySelector('.like-count');
  if(isLiked){
    await _supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
    btn.classList.remove('liked');
    const icon = btn.querySelector('i');
    if(icon) icon.className = 'far fa-heart';
    if(countSpan) countSpan.innerText = Math.max(0, parseInt(countSpan.innerText || 0) - 1);
  }else{
    const { error } = await _supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
    if(!error){
      btn.classList.add('liked');
      const icon = btn.querySelector('i');
      if(icon) icon.className = 'fas fa-heart';
      if(countSpan) countSpan.innerText = parseInt(countSpan.innerText || 0) + 1;
    }
  }
}

function sharePost(postId){
  const url = window.location.origin + window.location.pathname + '?post=' + postId;
  openShareSheet(url, 'شاهد هذا المنشور في بوابة الطلاب');
}

/* ================== التعليقات ================== */
async function openComments(postId){
  currentPostIdForComments = postId;
  document.getElementById('comments-overlay')?.classList.add('open');
  await renderComments();
}

function closeComments(){
  document.getElementById('comments-overlay')?.classList.remove('open');
  currentPostIdForComments = null;
}

async function renderComments(){
  const list = document.getElementById('comments-list');
  if(!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  
  const { data: comments, error } = await _supabase.from('post_comments').select('*')
    .eq('post_id', currentPostIdForComments).order('created_at', { ascending:true });
    
  if(error || !comments){ list.innerHTML = '<div class="notif-empty">تعذر تحميل التعليقات</div>'; return; }
  if(comments.length === 0){ list.innerHTML = '<div class="notif-empty">لا توجد تعليقات بعد، كن أول من يعلق</div>'; return; }

  const { data: myLikes } = await _supabase.from('comment_likes').select('comment_id').eq('user_id', currentUser.id);
  const myLikedSet = new Set((myLikes||[]).map(l=>l.comment_id));

  const byParent = {};
  comments.forEach(c=>{
    const key = c.parent_id || 'root';
    byParent[key] = byParent[key] || [];
    byParent[key].push(c);
  });

  function renderNode(c){
    const liked = myLikedSet.has(c.id);
    const replies = byParent[c.id] || [];
    return `
      <div class="comment-item">
        <div class="comment-bubble">
          <div class="comment-author">${c.user_id === currentUser.id ? escapeHtml(currentProfile?.full_name || 'أنا') : 'طالب'}</div>
          <div class="comment-text">${escapeHtml(c.content||'')}</div>
        </div>
        <div class="comment-foot">
          <button class="${liked?'liked':''}" onclick="toggleCommentLike('${c.id}', this)"><i class="${liked?'fas':'far'} fa-heart"></i> إعجاب</button>
          <button onclick="toggleReplyBox('${c.id}')"><i class="far fa-comment-dots"></i> رد</button>
        </div>
        <div class="reply-box" id="reply-box-${c.id}">
          <input type="text" class="comment-input-row-inline" id="reply-input-${c.id}" placeholder="اكتب ردك..." style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:16px;font-size:12px;font-family:var(--font-family);outline:none;">
          <button onclick="submitReply('${c.id}')" style="background:var(--primary);color:#fff;border:none;border-radius:16px;padding:0 14px;font-size:11px;cursor:pointer;">إرسال</button>
        </div>
        ${replies.length ? `<div class="comment-replies">${replies.map(renderNode).join('')}</div>` : ''}
      </div>`;
  }

  const roots = byParent['root'] || [];
  list.innerHTML = roots.map(renderNode).join('');
}

function toggleReplyBox(commentId){
  document.getElementById('reply-box-'+commentId)?.classList.toggle('open');
}

async function submitComment(){
  const input = document.getElementById('comment-input');
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  const { error } = await _supabase.from('post_comments').insert({ post_id: currentPostIdForComments, user_id: currentUser.id, content: text });
  if(error){ showToast('تعذر إرسال التعليق', 'error'); return; }
  input.value = '';
  await renderComments();
  await loadPosts();
}

async function submitReply(parentId){
  const input = document.getElementById('reply-input-'+parentId);
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  const { error } = await _supabase.from('post_comments').insert({ post_id: currentPostIdForComments, user_id: currentUser.id, parent_id: parentId, content: text });
  if(error){ showToast('تعذر إرسال الرد', 'error'); return; }
  input.value = '';
  await renderComments();
  await loadPosts();
}

async function toggleCommentLike(commentId, btn){
  const liked = btn.classList.contains('liked');
  if(liked){
    await _supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUser.id);
  }else{
    await _supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
  }
  await renderComments();
}

/* ================== الدرجات ================== */
function setTerm(term, el){
  currentTerm = term;
  document.querySelectorAll('.term-toggle button').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadGrades();
}

function setExamType(type, el){
  currentExamType = type;
  document.querySelectorAll('.exam-type-tabs button').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadGrades();
}

function gradeInfo(percent){
  if(percent >= 85) return { label:'امتياز', cls:'excellent' };
  if(percent >= 75) return { label:'جيد جدًا', cls:'vgood' };
  if(percent >= 65) return { label:'جيد', cls:'good' };
  if(percent >= 50) return { label:'مقبول', cls:'pass' };
  return { label:'ضعيف', cls:'weak' };
}

async function loadGrades(){
  const container = document.getElementById('grades-container');
  if(!container) return;
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  
  const { data: grades, error } = await _supabase.from('grades').select('*')
    .eq('student_id', currentUser.id)
    .eq('term', currentTerm)
    .eq('exam_type', currentExamType)
    .order('created_at', { ascending:false });

  if(error){ container.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>تعذر تحميل الدرجات</p></div>'; return; }
  if(!grades || grades.length === 0){
    container.innerHTML = '<div class="empty-state"><i class="fas fa-file-circle-xmark"></i><p>لا توجد درجات مسجلة بعد</p></div>';
    drawChart([]);
    return;
  }

  drawChart(grades);
  container.innerHTML = grades.map(g=>{
    const percent = Math.round((g.score / g.max_score) * 1000)/10;
    const info = gradeInfo(percent);
    const certData = encodeURIComponent(JSON.stringify({subject: g.subject_name, percent, label: info.label, rank: g.rank}));
    return `
    <div class="grade-card">
      <div class="grade-card-top">
        <div class="grade-subject">${escapeHtml(g.subject_name||'')}</div>
        <div class="grade-badge ${info.cls}">${info.label}</div>
      </div>
      <div class="grade-score-row">
        <div class="grade-score-big">${g.score} / ${g.max_score}</div>
        <div style="font-size:13px;color:var(--text-secondary)">النسبة: <b style="color:var(--text)">${percent}%</b></div>
      </div>
      <div class="grade-grid">
        <div>المركز: <b>${g.rank ? '#'+g.rank : '-'}</b></div>
        <div>تاريخ الامتحان: <b>${g.exam_date || '-'}</b></div>
        <div>ساعة الامتحان: <b>${g.exam_time || '-'}</b></div>
        <div>تاريخ النتيجة: <b>${g.result_date || '-'}</b></div>
      </div>
      <button class="print-btn" onclick="printCertificateFromData('${certData}')">
        <i class="fas fa-print"></i> طباعة شهادة
      </button>
    </div>`;
  }).join('');
}

function printCertificateFromData(encodedData){
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    printCertificate(data);
  } catch(e) {
    console.error('Certificate data error', e);
  }
}

function drawChart(grades){
  const svg = document.getElementById('grades-chart');
  if(!svg) return;
  if(!grades || grades.length === 0){ 
    svg.innerHTML = '<text x="160" y="90" text-anchor="middle" fill="#94a3b8" font-size="12">لا توجد بيانات لعرضها</text>'; 
    return; 
  }
  const w = 320, h = 180, padding = 30, barGap = 14;
  const barW = Math.min(46, (w - padding*2) / grades.length - barGap);
  let bars = '';
  grades.forEach((g, i)=>{
    const percent = (g.score / g.max_score) * 100;
    const barH = (percent/100) * (h - 50);
    const x = padding + i*(barW+barGap);
    const y = h - 30 - barH;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="url(#gradGrad)"/>`;
    bars += `<text x="${x+barW/2}" y="${y-6}" text-anchor="middle" font-size="10" fill="#4f46e5" font-weight="700">${Math.round(percent)}%</text>`;
    bars += `<text x="${x+barW/2}" y="${h-14}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml((g.subject_name||'').slice(0,6))}</text>`;
  });
  svg.innerHTML = `
    <defs><linearGradient id="gradGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient></defs>
    <line x1="20" y1="${h-30}" x2="${w-10}" y2="${h-30}" stroke="#e2e8f0" stroke-width="1"/>
    ${bars}`;
}

function printCertificate({subject, percent, label, rank}){
  const cName = document.getElementById('cert-name');
  const cPercent = document.getElementById('cert-percent');
  const cGrade = document.getElementById('cert-grade');
  const cRank = document.getElementById('cert-rank');
  const cSubj = document.getElementById('cert-subject-line');

  if(cName) cName.innerText = currentProfile?.full_name || currentUser.email;
  if(cPercent) cPercent.innerText = percent + '%';
  if(cGrade) cGrade.innerText = label;
  if(cRank) cRank.innerText = rank ? ('#'+rank) : '-';
  if(cSubj) cSubj.innerText = 'مادة: ' + subject;
  
  window.print();
}

/* ================== الجدول الدراسي ================== */
let currentScheduleTerm = '1';

function setScheduleTerm(term, el){
  currentScheduleTerm = term;
  document.querySelectorAll('#view-schedule .term-toggle button').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadSchedule();
}

async function loadSchedule(){
  const container = document.getElementById('schedule-container');
  if(!container) return;
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  const year = currentProfile?.academic_year || '1';

  const { data, error } = await _supabase.from('schedule').select('*')
    .eq('term', currentScheduleTerm).eq('academic_year', year)
    .order('created_at', { ascending:false }).limit(1).maybeSingle();

  if(error || !data){
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-xmark"></i><p>لم يتم رفع الجدول لهذا الترم بعد</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="schedule-meta">
      <i class="far fa-clock"></i> تم رفع الجدول بتاريخ: ${formatDate(data.created_at)}
    </div>
    <div class="schedule-box">
      <img id="schedule-img" src="${escapeHtml(data.image_url)}" alt="الجدول الدراسي">
    </div>
    <div class="schedule-actions">
      <button onclick="printSchedule()"><i class="fas fa-print"></i> طباعة</button>
      <button onclick="downloadSchedule('${escapeHtml(data.image_url)}')"><i class="fas fa-download"></i> تحميل</button>
      <button onclick="openShareSheet('${escapeHtml(data.image_url)}', 'الجدول الدراسي - بوابة الطلاب')"><i class="fas fa-share-nodes"></i> مشاركة</button>
    </div>`;
}

function printSchedule(){
  const img = document.getElementById('schedule-img');
  if(!img) return;
  const w = window.open('', '_blank');
  if(!w) return;
  w.document.write(`<html dir="rtl"><head><title>طباعة الجدول</title></head><body style="margin:0;text-align:center;">
    <img src="${img.src}" style="max-width:100%;"><script>window.onload=()=>{window.print();}<\/script></body></html>`);
  w.document.close();
}

async function downloadSchedule(url){
  try{
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'الجدول-الدراسي.jpg';
    link.click();
  }catch(e){
    window.open(url, '_blank');
  }
}

/* ================== المحاضرات الكلية ================== */
let currentLecturesTerm = '1';
let currentLectureSubject = '';

const LECTURE_SUBJECTS = {
  '1': { '1':[], '2':[] },
  '2': { '1':[], '2':[] },
  '3': { '1':[], '2':[] },
  '4': { '1':[], '2':[] },
};

function setLecturesTerm(term, el){
  currentLecturesTerm = term;
  currentLectureSubject = '';
  document.querySelectorAll('#view-lectures .term-toggle button').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderLectureSubjectTabs();
  const container = document.getElementById('lectures-container');
  if(container) container.innerHTML = '<div class="empty-state"><i class="fas fa-hand-pointer"></i><p>اختر المادة لعرض المحاضرات</p></div>';
}

function renderLectureSubjectTabs(){
  const year = currentProfile?.academic_year || '1';
  const subjects = LECTURE_SUBJECTS[year]?.[currentLecturesTerm] || [];
  const tabsEl = document.getElementById('lectures-subject-tabs');
  if(!tabsEl) return;
  if(subjects.length === 0){
    tabsEl.innerHTML = '<span style="font-size:12px;color:var(--text-light);">سيتم إضافة أسماء المواد قريبًا</span>';
    return;
  }
  tabsEl.innerHTML = subjects.map(s => `<button onclick="setLectureSubject('${escapeHtml(s)}', this)">${escapeHtml(s)}</button>`).join('');
}

function setLectureSubject(subject, el){
  currentLectureSubject = subject;
  document.querySelectorAll('#lectures-subject-tabs button').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadLectures();
}

async function loadLectures(){
  const container = document.getElementById('lectures-container');
  if(!container) return;
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  const year = currentProfile?.academic_year || '1';

  const { data, error } = await _supabase.from('lectures').select('*')
    .eq('academic_year', year).eq('term', currentLecturesTerm).eq('subject_name', currentLectureSubject)
    .order('created_at', { ascending:false });

  if(error){ container.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>تعذر تحميل المحاضرات</p></div>'; return; }
  if(!data || data.length === 0){ container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد محاضرات مرفوعة لهذه المادة بعد</p></div>'; return; }

  container.innerHTML = data.map(l => `
    <div class="lecture-card">
      <div class="lecture-title">${escapeHtml(l.lecture_title || '')}</div>
      <div class="lecture-tags">
        ${l.section ? `<span class="lecture-tag"><i class="fas fa-layer-group"></i> سكشن: ${escapeHtml(l.section)}</span>` : ''}
        ${l.course_name ? `<span class="lecture-tag"><i class="fas fa-book"></i> كورس: ${escapeHtml(l.course_name)}</span>` : ''}
      </div>
      <div class="lecture-files">
        ${l.pdf_url ? `<a class="lecture-file-link" href="${escapeHtml(l.pdf_url)}" target="_blank"><i class="fas fa-file-pdf"></i> ملف المحاضرة (PDF)</a>` : ''}
        ${l.video_url ? `<a class="lecture-file-link" href="${escapeHtml(l.video_url)}" target="_blank"><i class="fas fa-video"></i> فيديو الشرح</a>` : ''}
      </div>
    </div>`).join('');
}

/* ================== شيت المشاركة ================== */
let shareTargetUrl = '';

function openShareSheet(url, text){
  shareTargetUrl = url;
  const linkInput = document.getElementById('share-link-input');
  const overlay = document.getElementById('share-overlay');
  if(linkInput) linkInput.value = url;
  if(overlay) {
    overlay.dataset.text = text || 'بوابة الطلاب';
    overlay.classList.add('open');
  }
}

function closeShareSheet(){
  document.getElementById('share-overlay')?.classList.remove('open');
}

function copyShareLink(){
  navigator.clipboard.writeText(shareTargetUrl);
  showToast('تم نسخ الرابط', 'success');
}

function shareVia(platform){
  const url = encodeURIComponent(shareTargetUrl);
  const text = encodeURIComponent(document.getElementById('share-overlay')?.dataset.text || 'بوابة الطلاب');
  let link = '';
  switch(platform){
    case 'whatsapp': link = `https://wa.me/?text=${text}%20${url}`; break;
    case 'facebook': link = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
    case 'messenger': link = `fb-messenger://share/?link=${url}`; break;
    case 'whatsapp_status':
    case 'facebook_story':
    case 'instagram_story':
      navigator.clipboard.writeText(shareTargetUrl);
      showToast('تم نسخ الرابط، افتح التطبيق وحط الصورة/الرابط في الستوري', 'success');
      return;
    case 'instagram':
      navigator.clipboard.writeText(shareTargetUrl);
      showToast('تم نسخ الرابط، افتحه داخل انستجرام لمشاركته', 'success');
      return;
    case 'more':
      if(navigator.share){ navigator.share({ title:'بوابة الطلاب', url: shareTargetUrl }).catch(()=>{}); return; }
      navigator.clipboard.writeText(shareTargetUrl);
      showToast('تم نسخ الرابط', 'success');
      return;
  }
  window.open(link, '_blank');
}

/* ================== أدوات مساعدة ================== */
function escapeHtml(str){
  if(!str) return '';
  const d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

function formatDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString('ar-EG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  }catch(e){ return ''; }
}

/* إغلاق التنبيهات عند الضغط خارجها */
document.addEventListener('click', (e)=>{
  const dd = document.getElementById('notif-dropdown');
  const bell = document.getElementById('bell-btn');
  if(dd && bell && dd.classList.contains('open') && !dd.contains(e.target) && !bell.contains(e.target)){
    dd.classList.remove('open');
  }
});





  /* ================== أسماء المواد لجميع السنوات والترمات ================== */
const LECTURE_SUBJECTS = {
  '1': {
    '1': ['مقدمة في الحاسبات', 'مقدمة في نظم التشغيل', 'مراسلات و مصطلحات إنجليزية', 'مبادئ الإقتصاد', 'مبادئ تنظيم وإدارة'],
    '2': ['اساسيات في البرمجه الهيكليه', 'حزم التطبيقات المكتبية', 'الرياضيات و التامين', 'مبادئ محاسبة', 'مبادئ سلوك التنظيمي', 'إدارة عامة']
  },
  '2': {
    '1': ['قواعد البيانات (1)', 'البرمجة الهيكلية المتقدمة', 'محاسبة شركات', 'دراسات إقتصادية بلغة إنجليزية', 'إدارة الانتاج و العمليات'],
    '2': ['تسويق', 'قانون تجاري', 'نظم معلومات إدارية', 'إحصاء', 'رياضيات تمويل', 'تطبيقات الانترنت و الوسائط المتعددة']
  },
  '3': {
    '1': [], // أضف مواد الفرقة الثالثة - الترم الأول هنا
    '2': []  // أضف مواد الفرقة الثالثة - الترم الثاني هنا
  },
  '4': {
    '1': [], // أضف مواد الفرقة الرابعة - الترم الأول هنا
    '2': []  // أضف مواد الفرقة الرابعة - الترم الثاني هنا
  }
};


  /* ================== المحاضرات الكلية والسكاشن والكورسات ================== */
let currentLecturesTerm = '1';
let currentLectureSubject = '';
let currentLectureCategory = 'lecture'; // lecture | section | course | programming

function setLecturesTerm(term, el){
  currentLecturesTerm = term;
  currentLectureSubject = '';
  document.querySelectorAll('#view-lectures .term-toggle button').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  
  if(currentLectureCategory !== 'programming'){
    renderLectureSubjectTabs();
  }
  resetLecturesContainer();
}

function setLectureCategory(cat, el){
  currentLectureCategory = cat;
  document.querySelectorAll('#lecture-category-tabs button').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');

  const subjTabs = document.getElementById('lectures-subject-tabs');
  if(cat === 'programming'){
    if(subjTabs) subjTabs.style.display = 'none';
    loadLectures(); // تحميل كورسات البرمجة مباشرة بدون التقيد بمادة أكاديمية
  } else {
    if(subjTabs) subjTabs.style.display = 'flex';
    renderLectureSubjectTabs();
    resetLecturesContainer();
  }
}

function resetLecturesContainer(){
  const container = document.getElementById('lectures-container');
  if(container) container.innerHTML = '<div class="empty-state"><i class="fas fa-hand-pointer"></i><p>اختر المادة لعرض المحتوى</p></div>';
}

function renderLectureSubjectTabs(){
  const year = currentProfile?.academic_year || '1';
  const subjects = LECTURE_SUBJECTS[year]?.[currentLecturesTerm] || [];
  const tabsEl = document.getElementById('lectures-subject-tabs');
  if(!tabsEl) return;
  
  if(subjects.length === 0){
    tabsEl.innerHTML = '<span style="font-size:12px;color:var(--text-light);padding:6px;">سيتم إضافة أسماء المواد قريبًا</span>';
    return;
  }
  tabsEl.innerHTML = subjects.map(s => `<button onclick="setLectureSubject('${escapeHtml(s)}', this)">${escapeHtml(s)}</button>`).join('');
}

function setLectureSubject(subject, el){
  currentLectureSubject = subject;
  document.querySelectorAll('#lectures-subject-tabs button').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadLectures();
}

async function loadLectures(){
  const container = document.getElementById('lectures-container');
  if(!container) return;
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  const year = currentProfile?.academic_year || '1';

  let query = _supabase.from('lectures').select('*');

  if(currentLectureCategory === 'programming'){
    query = query.eq('category', 'programming');
  } else {
    query = query.eq('academic_year', year)
                 .eq('term', currentLecturesTerm)
                 .eq('subject_name', currentLectureSubject)
                 .eq('category', currentLectureCategory);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if(error){ 
    container.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>تعذر تحميل البيانات</p></div>'; 
    return; 
  }
  if(!data || data.length === 0){ 
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>لا يتوفر محتوى حالياً في هذا القسم</p></div>'; 
    return; 
  }

  container.innerHTML = data.map(l => `
    <div class="lecture-card">
      <div class="lecture-title">${escapeHtml(l.lecture_title || '')}</div>
      <div class="lecture-tags">
        ${l.category ? `<span class="lecture-tag"><i class="fas fa-tag"></i> ${getCategoryName(l.category)}</span>` : ''}
        ${l.subject_name ? `<span class="lecture-tag"><i class="fas fa-book"></i> ${escapeHtml(l.subject_name)}</span>` : ''}
      </div>
      <div class="lecture-files">
        ${l.pdf_url ? `<a class="lecture-file-link" href="${escapeHtml(l.pdf_url)}" target="_blank"><i class="fas fa-file-pdf" style="color:#ef4444"></i> تحميل ملف الشرح (PDF)</a>` : ''}
        ${l.video_url ? `<a class="lecture-file-link" href="${escapeHtml(l.video_url)}" target="_blank"><i class="fab fa-youtube" style="color:#ff0000"></i> مشاهدة فيديو الشرح</a>` : ''}
      </div>
    </div>`).join('');
}

function getCategoryName(cat){
  const map = { 'lecture': 'محاضرة', 'section': 'سكشن', 'course': 'كورس', 'programming': 'برمجة' };
  return map[cat] || cat;
}


                                                     
