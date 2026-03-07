import { auth, db, serverTimestamp } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import { CATEGORY_LIST } from './content.js';
import { addDoc, collection, getDocs, limit, orderBy, query, updateDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

injectHeaderFooter();
initAuthNav();

const gate = document.getElementById('adminGate');
const panel = document.getElementById('adminPanel');
const status = document.getElementById('adminStatus');
const logBox = document.getElementById('adminLog');
const commentList = document.getElementById('commentModeration');
const seedBtn = document.getElementById('seedBtn');
let isEditor = false;

const show = (m, type = '') => {
  status.className = `notice ${type}`;
  status.textContent = m;
};

const log = (line) => {
  if (!logBox) return;
  const ts = new Date().toLocaleTimeString('tr-TR');
  logBox.textContent += `[${ts}] ${line}\n`;
  logBox.scrollTop = logBox.scrollHeight;
};

const safeDate = (value, fallback) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const normalizeArticle = (article, index) => {
  const now = new Date();
  const publishedAt = safeDate(article.publishedAt, now);
  const createdAt = safeDate(article.createdAt, publishedAt);
  return {
    title: article.title || `Başlıksız Makale ${index + 1}`,
    slug: article.slug || `makale-${index + 1}`,
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
    publishedAt,
    createdAt,
    updatedAt: serverTimestamp(),
    views: Number(article.views || 0)
  };
};

async function importSeedArticles() {
  if (!isEditor) {
    show('İçerik aktarmak için admin/editor rolü gerekir.', 'error');
    return;
  }

  seedBtn.disabled = true;
  logBox.textContent = '';
  try {
    show('Seed dosyası okunuyor...', '');
    log('seed/articles.seed.json okunuyor.');
    const response = await fetch('./seed/articles.seed.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Seed dosyası okunamadı (${response.status})`);
    const payload = await response.json();
    const seedArticles = Array.isArray(payload?.articles) ? payload.articles.slice(0, 10) : [];
    if (!seedArticles.length) throw new Error('Seed dosyasında makale bulunamadı.');

    const categoryMap = new Map(CATEGORY_LIST.map((c) => [c.slug, c]));
    for (const article of seedArticles) {
      if (!categoryMap.has(article.category)) {
        categoryMap.set(article.category, {
          slug: article.category,
          name: article.category,
          description: 'NebChat içerik kategorisi.'
        });
      }
    }

    show('Kategoriler Firestore\'a yazılıyor...', '');
    let catIndex = 0;
    for (const category of categoryMap.values()) {
      catIndex += 1;
      await setDoc(doc(db, 'categories', category.slug), {
        slug: category.slug,
        name: category.name,
        description: category.description || '',
        order: catIndex,
        isVisible: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      log(`Kategori upsert: ${category.slug}`);
    }

    show('Makaleler Firestore\'a yazılıyor... (0/10)', '');
    for (let i = 0; i < seedArticles.length; i += 1) {
      const normalized = normalizeArticle(seedArticles[i], i);
      await setDoc(doc(db, 'articles', normalized.slug), normalized, { merge: true });
      show(`Makaleler Firestore'a yazılıyor... (${i + 1}/10)`, '');
      log(`Makale upsert: ${normalized.slug}`);
    }

    show('Örnek içerikler başarıyla Firestore\'a aktarıldı.', 'ok');
    log('İşlem tamamlandı. archive.html sayfasını yenileyerek doğrulayın.');
  } catch (error) {
    show(`Aktarım hatası: ${error.message || error}`, 'error');
    log(`Hata: ${error.message || error}`);
  } finally {
    seedBtn.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    gate.classList.remove('hidden');
    return;
  }

  const token = await user.getIdTokenResult();
  const role = token.claims.role || (token.claims.admin ? 'admin' : 'user');
  if (!['admin', 'editor'].includes(role)) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Bu sayfaya erişim için admin/editor rolü gerekir.</div>';
    return;
  }

  isEditor = true;
  panel.classList.remove('hidden');
  show('Hazır. Seed aktarımı için butonu kullanabilirsiniz.', 'ok');
  await loadComments();
});

seedBtn.addEventListener('click', importSeedArticles);

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
    return `<div class="card"><strong>${c.displayName}</strong> <span class="muted">${c.articleSlug}</span><p>${c.body}</p><div class="hero-actions"><button data-id="${d.id}" data-action="published" class="btn ghost">Yayınla</button><button data-id="${d.id}" data-action="hidden" class="btn ghost">Gizle</button></div></div>`;
  }).join('') || '<div class="muted">Yorum bulunamadı.</div>';
}

commentList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  await updateDoc(doc(db, 'comments', btn.dataset.id), { status: btn.dataset.action, updatedAt: serverTimestamp() });
  show('Yorum durumu güncellendi.', 'ok');
  await loadComments();
});
