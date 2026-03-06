import { auth, db, serverTimestamp } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import { seedInitialDataIfEmpty } from './data.js';
import { addDoc, collection, getDocs, limit, orderBy, query, updateDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

injectHeaderFooter();
initAuthNav();

const gate = document.getElementById('adminGate');
const panel = document.getElementById('adminPanel');
const status = document.getElementById('adminStatus');
const commentList = document.getElementById('commentModeration');
const importTop10Btn = document.getElementById('importTop10Btn');

const show = (m, type='') => { status.className = `notice ${type}`; status.textContent = m; };

onAuthStateChanged(auth, async (user) => {
  if (!user) { gate.classList.remove('hidden'); return; }
  const token = await user.getIdTokenResult();
  const role = token.claims.role || (token.claims.admin ? 'admin' : 'user');
  if (!['admin', 'editor'].includes(role)) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Bu sayfaya erişim için admin/editor rolü gerekir.</div>';
    return;
  }
  panel.classList.remove('hidden');
});

document.getElementById('seedBtn').onclick = async () => {
  const seeded = await seedInitialDataIfEmpty();
  show(seeded ? 'Başlangıç içerikleri eklendi.' : 'Veri zaten mevcut.', 'ok');
};

if (importTop10Btn) {
  importTop10Btn.addEventListener('click', async () => {
    importTop10Btn.disabled = true;
    try {
      show('Seed dosyası okunuyor...', '');
      const response = await fetch('./seed/articles.seed.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Seed dosyası okunamadı (${response.status})`);
      const payload = await response.json();
      const articles = (payload.articles || []).slice(0, 10);
      if (!articles.length) throw new Error('Seed dosyasında makale bulunamadı.');

      show('İlk 10 makale Firestore\'a yazılıyor... (0/10)', '');
      const now = new Date();
      for (let i = 0; i < articles.length; i += 1) {
        const article = articles[i];
        const slug = article.slug || `article-${i + 1}`;
        await setDoc(doc(db, 'articles', slug), {
          title: article.title || 'Başlıksız Makale',
          slug,
          excerpt: article.excerpt || '',
          category: article.category || 'turkiye-gundemi',
          tags: Array.isArray(article.tags) ? article.tags : [],
          authorName: article.authorName || 'NebChat Editör',
          authorSlug: article.authorSlug || 'nebchat-editor',
          status: article.status || 'published',
          featured: Boolean(article.featured),
          readingTime: Number(article.readingTime || 6),
          seoTitle: article.seoTitle || article.title || 'NebChat Makale',
          seoDescription: article.seoDescription || article.excerpt || '',
          bodyHtml: article.bodyHtml || '<p>İçerik bulunamadı.</p>',
          coverImagePrompt: article.coverImagePrompt || '',
          coverImageUrl: article.coverImageUrl || '',
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : now,
          createdAt: article.createdAt ? new Date(article.createdAt) : now,
          updatedAt: serverTimestamp(),
          views: typeof article.views === 'number' ? article.views : 0
        }, { merge: true });
        show(`İlk 10 makale Firestore'a yazılıyor... (${i + 1}/10)`, '');
      }
      show('İlk 10 makale Firestore\'a başarıyla yüklendi.', 'ok');
    } catch (error) {
      show(`Yükleme hatası: ${error.message || error}`, 'error');
    } finally {
      importTop10Btn.disabled = false;
    }
  });
}

document.getElementById('articleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const now = new Date(f.publishedAt.value || new Date().toISOString()).toISOString();
  await addDoc(collection(db, 'articles'), {
    slug: f.slug.value.trim(),
    title: f.title.value.trim(),
    excerpt: f.excerpt.value.trim(),
    bodyMarkdown: f.bodyMarkdown.value.trim(),
    bodyHtml: f.bodyMarkdown.value.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').concat('</p>'),
    coverImageUrl: f.coverImageUrl.value.trim(),
    category: f.category.value.trim(),
    tags: f.tags.value.split(',').map((x) => x.trim()).filter(Boolean),
    authorName: f.authorName.value.trim(),
    authorSlug: f.authorName.value.trim().toLowerCase().replace(/\s+/g, '-'),
    publishedAt: new Date(now),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: f.status.value,
    featured: f.featured.checked,
    readingTime: Number(f.readingTime.value || 5),
    seoTitle: f.seoTitle.value.trim(),
    seoDescription: f.seoDescription.value.trim(),
    views: 0
  });
  show('Yazı kaydedildi.', 'ok');
  f.reset();
});

async function loadComments() {
  const snap = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(20)));
  commentList.innerHTML = snap.docs.map((d) => {
    const c = d.data();
    return `<div class="card"><strong>${c.displayName}</strong> <span class="muted">${c.articleSlug}</span><p>${c.body}</p><div class="hero-actions"><button data-id="${d.id}" data-action="publish" class="btn ghost">Yayınla</button><button data-id="${d.id}" data-action="hidden" class="btn ghost">Gizle</button></div></div>`;
  }).join('') || '<div class="muted">Yorum bulunamadı.</div>';
}

commentList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  await updateDoc(doc(db, 'comments', btn.dataset.id), { status: btn.dataset.action, updatedAt: serverTimestamp() });
  show('Yorum durumu güncellendi.', 'ok');
  await loadComments();
});

loadComments();
