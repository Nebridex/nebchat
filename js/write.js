import { auth, db, serverTimestamp } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

injectHeaderFooter();
initAuthNav();

const ADMIN_EMAIL = 'oz.cht.t@gmail.com';
const form = document.getElementById('writeForm');
const status = document.getElementById('writeStatus');
const statusField = document.getElementById('statusField');
let currentUser = null;
let isAdmin = false;

const slugify = (text = '') => String(text)
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const setStatus = (msg, type = '') => {
  status.className = `notice ${type}`;
  status.textContent = msg;
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    form.classList.add('hidden');
    setStatus('Yazı göndermek için giriş yapmalısınız.', 'error');
    return;
  }

  isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;

  form.classList.remove('hidden');
  statusField.classList.toggle('hidden', !isAdmin);
  setStatus(isAdmin ? 'Yönetici modu: durum seçimi aktif.' : 'Yazınız inceleme için gönderilecektir.');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const f = e.target;
  const title = f.title.value.trim();
  const slug = slugify(f.slug.value.trim() || title);
  const docRef = doc(db, 'articles', slug);
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    setStatus('Bu slug zaten kullanılıyor. Farklı bir slug deneyin.', 'error');
    return;
  }

  const selectedStatus = isAdmin ? f.status.value : 'pending_review';
  const payload = {
    title,
    slug,
    excerpt: f.excerpt.value.trim(),
    category: f.category.value,
    tags: f.tags.value.split(',').map((x) => x.trim()).filter(Boolean),
    bodyMarkdown: f.body.value.trim(),
    bodyHtml: f.body.value.trim().split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join(''),
    coverImageUrl: f.coverImageUrl.value.trim(),
    coverImagePrompt: f.coverImagePrompt.value.trim(),
    authorId: currentUser.uid,
    authorName: currentUser.displayName || currentUser.email || 'NebChat Üye Yazarı',
    authorEmail: currentUser.email || '',
    authorSlug: slugify(currentUser.displayName || currentUser.email || 'uye-yazar'),
    status: selectedStatus,
    featured: false,
    readingTime: Math.max(4, Math.round(f.body.value.trim().split(/\s+/).length / 220)),
    seoTitle: title,
    seoDescription: f.excerpt.value.trim(),
    views: 0,
    commentCount: 0,
    likeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: selectedStatus === 'published' ? new Date() : null
  };

  await setDoc(docRef, payload);
  f.reset();
  setStatus(selectedStatus === 'published' ? 'Yazı yayınlandı.' : 'Yazınız inceleme için gönderildi.', 'ok');
});
