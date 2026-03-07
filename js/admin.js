import { auth, db, serverTimestamp } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import { CATEGORY_LIST } from './content.js';
import { addDoc, collection, getDoc, getDocs, limit, orderBy, query, updateDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

injectHeaderFooter();
initAuthNav();

const ADMIN_EMAIL = 'oz.cht.t@gmail.com';

const gate = document.getElementById('adminGate');
const panel = document.getElementById('adminPanel');
const status = document.getElementById('adminStatus');
const logBox = document.getElementById('adminLog');
const commentList = document.getElementById('commentModeration');
const seedBtn = document.getElementById('seedBtn');
let isAdmin = false;

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

async function importSeedArticles({ force = false } = {}) {
  if (!isAdmin) {
    show('İçerik aktarmak için admin yetkisi gerekir.', 'error');
    return;
  }

  const forceBtn = document.getElementById('seedForceBtn');
  seedBtn.disabled = true;
  if (forceBtn) forceBtn.disabled = true;
  logBox.textContent = '';

  const summary = {
    created: 0,
    skipped: 0,
    failed: 0,
    updated: 0,
    categoryCreated: 0,
    categorySkipped: 0,
    categoryFailed: 0
  };

  try {
    show('Seed dosyası okunuyor...', '');
    log('seed/articles.seed.json okunuyor.');
    const response = await fetch('./seed/articles.seed.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Seed dosyası okunamadı (${response.status})`);
    const payload = await response.json();
    const seedArticles = Array.isArray(payload?.articles) ? payload.articles : [];
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

    show('Kategoriler güvenli biçimde kontrol ediliyor...', '');
    let catIndex = 0;
    for (const category of categoryMap.values()) {
      catIndex += 1;
      const categoryRef = doc(db, 'categories', category.slug);
      try {
        const categorySnap = await getDoc(categoryRef);
        if (categorySnap.exists() && !force) {
          summary.categorySkipped += 1;
          log(`SKIPPED existing category: ${category.slug}`);
          continue;
        }

        await setDoc(categoryRef, {
          slug: category.slug,
          name: category.name,
          description: category.description || '',
          order: catIndex,
          isVisible: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: false });

        if (categorySnap.exists()) {
          log(`UPDATED category: ${category.slug}`);
        } else {
          summary.categoryCreated += 1;
          log(`CREATED category: ${category.slug}`);
        }
      } catch (categoryError) {
        summary.categoryFailed += 1;
        log(`FAILED category: ${category.slug} (${categoryError.message || categoryError})`);
      }
    }

    show(`Makaleler kontrol ediliyor... (0/${seedArticles.length})`, '');
    for (let i = 0; i < seedArticles.length; i += 1) {
      const normalized = normalizeArticle(seedArticles[i], i);
      const articleRef = doc(db, 'articles', normalized.slug);

      try {
        const articleSnap = await getDoc(articleRef);
        if (articleSnap.exists() && !force) {
          summary.skipped += 1;
          log(`SKIPPED existing article: ${normalized.slug}`);
        } else {
          await setDoc(articleRef, normalized, { merge: false });
          if (articleSnap.exists()) {
            summary.updated += 1;
            log(`UPDATED article: ${normalized.slug}`);
          } else {
            summary.created += 1;
            log(`CREATED article: ${normalized.slug}`);
          }
        }
      } catch (articleError) {
        summary.failed += 1;
        log(`FAILED article: ${normalized.slug} (${articleError.message || articleError})`);
      }

      show(`Makaleler kontrol ediliyor... (${i + 1}/${seedArticles.length})`, '');
    }

    log(`Özet -> created: ${summary.created}, skipped: ${summary.skipped}, failed: ${summary.failed}`);
    if (summary.updated > 0) log(`Force güncelleme sayısı: ${summary.updated}`);
    log(`Kategori özeti -> created: ${summary.categoryCreated}, skipped: ${summary.categorySkipped}, failed: ${summary.categoryFailed}`);

    if (summary.failed > 0 || summary.categoryFailed > 0) {
      show(`Aktarım tamamlandı (created: ${summary.created}, skipped: ${summary.skipped}, failed: ${summary.failed}).`, 'error');
    } else {
      show(`Aktarım tamamlandı (created: ${summary.created}, skipped: ${summary.skipped}, failed: 0).`, 'ok');
    }
  } catch (error) {
    show(`Aktarım hatası: ${error.message || error}`, 'error');
    log(`Hata: ${error.message || error}`);
  } finally {
    seedBtn.disabled = false;
    if (forceBtn) forceBtn.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Bu sayfaya erişmek için giriş yapmalısınız.</div>';
    panel.classList.add('hidden');
    seedBtn.disabled = true;
    return;
  }

  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult?.claims?.role;
  isAdmin = role === 'admin' || role === 'editor' || user.email === ADMIN_EMAIL;

  if (!isAdmin) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Bu sayfaya erişim izniniz yok.</div>';
    panel.classList.add('hidden');
    seedBtn.disabled = true;
    return;
  }

  gate.classList.add('hidden');
  panel.classList.remove('hidden');
  seedBtn.disabled = false;
  show('Hazır. Seed aktarımı için butonu kullanabilirsiniz.', 'ok');
  await loadComments();
});

seedBtn.addEventListener('click', () => importSeedArticles({ force: false }));

const seedForceBtn = document.getElementById('seedForceBtn');
if (seedForceBtn) {
  seedForceBtn.addEventListener('click', async () => {
    const confirmed = window.confirm('Bu işlem mevcut seed içeriklerini zorla günceller ve mevcut alanları ezebilir. Devam etmek istiyor musunuz?');
    if (!confirmed) return;
    await importSeedArticles({ force: true });
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
