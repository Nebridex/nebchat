import { auth, db, serverTimestamp } from './firebase.js';
import { injectHeaderFooter, initAuthNav, escapeHtml, formatDate } from './common.js';
import { CATEGORY_LIST } from './content.js';
import {
  collection,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  doc,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
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
const seedForceBtn = document.getElementById('seedForceBtn');
const moderationTabs = document.getElementById('moderationTabs');
const articleForm = document.getElementById('articleForm');
const sendPublishedToReviewBtn = document.getElementById('sendPublishedToReviewBtn');
const restorePublishedBtn = document.getElementById('restorePublishedBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const downloadLogBtn = document.getElementById('downloadLogBtn');
const moderationContainers = {
  pending_review: document.getElementById('queue-pending_review'),
  published: document.getElementById('queue-published'),
  draft: document.getElementById('queue-draft'),
  rejected: document.getElementById('queue-rejected')
};

let isAdmin = false;
let currentAdmin = null;
let activeStatus = 'pending_review';

const LOG_STORAGE_KEY = 'nebchat_admin_logs_v1';
const LOG_LIMIT = 800;

const statusLabel = {
  pending_review: 'İncelemede',
  published: 'Yayında',
  draft: 'Taslak',
  rejected: 'Reddedildi'
};

const statusAliases = {
  pending_review: 'pending_review',
  pendingreview: 'pending_review',
  review: 'pending_review',
  waiting: 'pending_review',
  in_review: 'pending_review',
  moderation: 'pending_review',
  published: 'published',
  live: 'published',
  public: 'published',
  approved: 'published',
  draft: 'draft',
  drafts: 'draft',
  rejected: 'rejected',
  deny: 'rejected',
  denied: 'rejected',
  declined: 'rejected'
};

const toLocalDate = (v) => {
  const d = v?.toDate ? v.toDate() : (v ? new Date(v) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
};

const readPersistedLogs = () => {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistLogs = (entries) => {
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries.slice(-LOG_LIMIT)));
  } catch {
    // no-op
  }
};

const appendLogLine = (line) => {
  if (!logBox) return;
  logBox.textContent += `${line}\n`;
  logBox.scrollTop = logBox.scrollHeight;
};

const bootstrapPersistedLogs = () => {
  const lines = readPersistedLogs();
  if (!lines.length || !logBox) return;
  logBox.textContent = `${lines.join('\n')}\n`;
  logBox.scrollTop = logBox.scrollHeight;
};

const show = (m, type = '') => {
  status.className = `notice ${type}`;
  status.textContent = m;
  if (type === 'error') log(`UI ERROR: ${m}`, 'error');
};

const log = (line, level = 'info') => {
  const ts = new Date();
  const iso = ts.toISOString();
  const visibleTs = ts.toLocaleTimeString('tr-TR');
  const entry = `[${visibleTs}] [${level.toUpperCase()}] ${line}`;
  appendLogLine(entry);
  const logs = readPersistedLogs();
  logs.push(`${iso} ${entry}`);
  persistLogs(logs);
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
    authorEmail: article.authorEmail || ADMIN_EMAIL,
    status: article.status || 'published',
    featured: Boolean(article.featured),
    readingTime: Number(article.readingTime || 6),
    seoTitle: article.seoTitle || article.title || 'NebChat Makale',
    seoDescription: article.seoDescription || article.excerpt || '',
    bodyHtml: article.bodyHtml || '<p>İçerik bulunamadı.</p>',
    bodyMarkdown: article.bodyMarkdown || '',
    coverImagePrompt: article.coverImagePrompt || '',
    coverImageUrl: article.coverImageUrl || '',
    publishedAt,
    createdAt,
    updatedAt: serverTimestamp(),
    views: Number(article.views || 0)
  };
};

function activateTab(statusKey) {
  activeStatus = statusKey;
  Object.entries(moderationContainers).forEach(([key, el]) => {
    el?.classList.toggle('hidden', key !== statusKey);
  });
  [...moderationTabs.querySelectorAll('button[data-status]')].forEach((btn) => {
    btn.classList.toggle('primary', btn.dataset.status === statusKey);
    btn.classList.toggle('ghost', btn.dataset.status !== statusKey);
  });
}

async function importSeedArticles({ force = false } = {}) {
  if (!isAdmin) {
    show('İçerik aktarmak için admin yetkisi gerekir.', 'error');
    return;
  }

  seedBtn.disabled = true;
  if (seedForceBtn) seedForceBtn.disabled = true;
  log('--- Yeni seed işlemi başlatıldı ---');

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

    for (const [index, category] of [...categoryMap.values()].entries()) {
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
          order: index + 1,
          isVisible: true,
          updatedAt: serverTimestamp(),
          createdAt: categorySnap.exists() ? categorySnap.data()?.createdAt || serverTimestamp() : serverTimestamp()
        }, { merge: false });

        if (categorySnap.exists()) {
          summary.updated += 1;
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
    }

    log(`Özet -> created: ${summary.created}, skipped: ${summary.skipped}, failed: ${summary.failed}`);
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
    if (seedForceBtn) seedForceBtn.disabled = false;
  }
}

function fillEditorForm(article, id) {
  articleForm.slug.value = article.slug || id;
  articleForm.title.value = article.title || '';
  articleForm.excerpt.value = article.excerpt || '';
  articleForm.coverImageUrl.value = article.coverImageUrl || '';
  articleForm.category.value = article.category || '';
  articleForm.authorName.value = article.authorName || '';
  articleForm.tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
  articleForm.publishedAt.value = toLocalDate(article.publishedAt)?.toISOString().slice(0, 16) || '';
  articleForm.readingTime.value = Number(article.readingTime || 5);
  articleForm.status.value = article.status || 'draft';
  articleForm.featured.checked = Boolean(article.featured);
  articleForm.seoTitle.value = article.seoTitle || '';
  articleForm.seoDescription.value = article.seoDescription || '';
  articleForm.bodyMarkdown.value = article.bodyMarkdown || '';
  show('Makale editör formuna yüklendi.', 'ok');
  articleForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function changeArticleStatus(articleId, action) {
  if (!isAdmin) return;

  const payload = { status: action, updatedAt: serverTimestamp(), isVisible: action === 'published' };
  if (action === 'published') payload.publishedAt = serverTimestamp();
  if (action !== 'published') payload.featured = false;

  await updateDoc(doc(db, 'articles', articleId), payload);
  show(`Makale durumu güncellendi: ${statusLabel[action] || action}`, 'ok');
  await loadModerationSections();
}

function renderArticleCard(id, data) {
  const visibleStatus = normalizeStatus(data.status);
  const createdAt = resolveArticleDate(data);
  const excerptSource = data.excerpt || data.summary || data.bodyMarkdown || String(data.bodyHtml || '').replace(/<[^>]+>/g, ' ');
  const excerpt = excerptSource.slice(0, 180);
  return `
    <article class="card" data-article-id="${escapeHtml(id)}">
      <div class="meta"><span>${escapeHtml(statusLabel[visibleStatus] || visibleStatus || 'Belirsiz')}</span><span>${createdAt ? formatDate(createdAt) : '—'}</span></div>
      <strong>${escapeHtml(data.title || data.headline || 'Başlıksız Yazı')}</strong>
      <p class="muted">${escapeHtml(excerpt)}${excerpt.length >= 180 ? '…' : ''}</p>
      <div class="meta"><span>Kategori: ${escapeHtml(data.category || '—')}</span><span>Slug: ${escapeHtml(data.slug || id)}</span></div>
      <div class="meta"><span>Yazar: ${escapeHtml(data.authorName || '—')}</span><span>${escapeHtml(data.authorEmail || data.authorId || '—')}</span></div>
      <div class="hero-actions" style="margin-top:.7rem;">
        <button class="btn ghost" data-action="published" data-id="${escapeHtml(id)}">Yayınla</button>
        <button class="btn ghost" data-action="pending_review" data-id="${escapeHtml(id)}">İncelemeye Al</button>
        <button class="btn ghost" data-action="draft" data-id="${escapeHtml(id)}">Taslağa Al</button>
        <button class="btn ghost" data-action="rejected" data-id="${escapeHtml(id)}">Reddet</button>
        <button class="btn ghost" data-action="edit" data-id="${escapeHtml(id)}">Düzenle</button>
      </div>
    </article>`;
}

const normalizeStatus = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return 'published';
  return statusAliases[key] || 'published';
};

function toMillis(raw) {
  if (raw?.toDate) return raw.toDate().getTime();
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function resolveArticleDate(data) {
  return toLocalDate(data.updatedAt)
    || toLocalDate(data.submittedAt)
    || toLocalDate(data.createdAt)
    || toLocalDate(data.publishedAt)
    || null;
}

function setContainerState(container, state, message) {
  if (!container) return;
  if (state === 'error') {
    container.innerHTML = `<div class="notice error">${escapeHtml(message || 'Bu liste yüklenirken hata oluştu.')}</div>`;
    return;
  }
  if (state === 'empty') {
    container.innerHTML = `<div class="muted">${escapeHtml(message || 'Kayıt bulunamadı.')}</div>`;
    return;
  }
  container.innerHTML = `<div class="muted">${escapeHtml(message || 'Yükleniyor...')}</div>`;
}

function renderRowsForStatus(statusKey, rows) {
  const container = moderationContainers[statusKey];
  if (!container) return;
  if (!rows.length) {
    setContainerState(container, 'empty', `${statusLabel[statusKey]} durumunda yazı bulunamadı.`);
    return;
  }
  container.innerHTML = rows.map((row) => renderArticleCard(row.id, row)).join('');
}

async function loadModerationSections() {
  Object.values(moderationContainers).forEach((container) => setContainerState(container, 'loading', 'Yükleniyor...'));
  try {
    log('Moderasyon yenileniyor: collection=articles, order=__name__, limit=200/page.');
    const docs = await fetchAllArticleDocs();
    const grouped = { pending_review: [], published: [], draft: [], rejected: [] };

    for (const d of docs) {
      const data = d.data() || {};
      const statusKey = normalizeStatus(data.status);
      if (!grouped[statusKey]) grouped[statusKey] = [];
      grouped[statusKey].push({ id: d.id, ...data });
    }

    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => toMillis(resolveArticleDate(b)) - toMillis(resolveArticleDate(a)));
      renderRowsForStatus(k, grouped[k]);
      log(`Moderasyon listesi: status=${k}, adet=${grouped[k].length}.`);
    });

    activateTab(activeStatus);
  } catch (error) {
    Object.entries(moderationContainers).forEach(([k, container]) => {
      setContainerState(container, 'error', `${statusLabel[k]} listesi yüklenemedi: ${error.message || error}`);
    });
    log(`FAILED moderation refresh: collection=articles (${error.message || error})`);
    show(`Moderasyon listesi yüklenemedi: ${error.message || error}`, 'error');
  }
}

async function loadComments() {
  const snap = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(20)));
  commentList.innerHTML = snap.docs.map((d) => {
    const c = d.data();
    return `<div class="card"><strong>${escapeHtml(c.displayName || 'Kullanıcı')}</strong> <span class="muted">${escapeHtml(c.articleTitle || c.articleSlug || '')}</span><p>${escapeHtml(c.body || '')}</p><div class="hero-actions"><button data-id="${d.id}" data-action="published" class="btn ghost">Yayınla</button><button data-id="${d.id}" data-action="hidden" class="btn ghost">Gizle</button></div></div>`;
  }).join('') || '<div class="muted">Yorum bulunamadı.</div>';
}



async function fetchAllArticleDocs(maxDocs = 2000) {
  const out = [];
  let lastDoc = null;

  while (out.length < maxDocs) {
    const constraints = [orderBy('__name__'), limit(200)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const q = query(collection(db, 'articles'), ...constraints);
    const snap = await getDocs(q);
    if (snap.empty) break;

    out.push(...snap.docs);
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }

  return out.slice(0, maxDocs);
}

async function sendAllPublishedToReview() {
  if (!isAdmin) return;
  const confirmed = window.confirm('Yayındaki tüm yazılar pending_review durumuna alınacak. Devam etmek istiyor musunuz?');
  if (!confirmed) return;

  try {
    show('Yayındaki yazılar incelemeye alınıyor...', '');
    const docs = await fetchAllArticleDocs();
    const targets = docs.filter((row) => normalizeStatus(row.data()?.status) === 'published');
    log(`Toplu incelemeye düşür hedef sorgu: collection=articles, status in [published/live/public/approved/null], bulunan=${targets.length}`);

    if (!targets.length) {
      show('Yayında yazı bulunamadı, işlem yapılmadı.', 'ok');
      return;
    }

    let updated = 0;
    let failed = 0;
    for (const row of targets) {
      try {
        await updateDoc(doc(db, 'articles', row.id), {
          status: 'pending_review',
          updatedAt: serverTimestamp(),
          featured: false
        });
        updated += 1;
      } catch (err) {
        failed += 1;
        log(`FAILED pending_review update: ${row.id} (${err.message || err})`);
      }
    }

    log(`Toplu işlem tamamlandı: updated=${updated}, failed=${failed}.`);
    show(`${updated} yazı incelemeye alındı${failed ? `, ${failed} başarısız` : ''}.`, failed ? 'error' : 'ok');
    await loadModerationSections();
    activateTab('pending_review');
  } catch (error) {
    show(`Toplu incelemeye alma hatası: ${error.message || error}`, 'error');
  }
}

async function restorePendingToPublished() {
  if (!isAdmin) return;
  const confirmed = window.confirm('Bekleyen tüm yazılar tekrar yayın durumuna alınacak. Devam etmek istiyor musunuz?');
  if (!confirmed) return;

  try {
    show('Bekleyen yazılar tekrar yayınlanıyor...', '');
    const docs = await fetchAllArticleDocs();
    const targets = docs.filter((row) => normalizeStatus(row.data()?.status) === 'pending_review');
    log(`Toplu geri yayın hedef sorgu: collection=articles, status in [pending_review/review/waiting], bulunan=${targets.length}`);

    if (!targets.length) {
      show('Beklemede yazı bulunamadı, işlem yapılmadı.', 'ok');
      return;
    }

    let updated = 0;
    let failed = 0;
    for (const row of targets) {
      try {
        await updateDoc(doc(db, 'articles', row.id), {
          status: 'published',
          updatedAt: serverTimestamp(),
          publishedAt: row.data()?.publishedAt || serverTimestamp()
        });
        updated += 1;
      } catch (err) {
        failed += 1;
        log(`FAILED republish: ${row.id} (${err.message || err})`);
      }
    }

    log(`Toplu geri yayın tamamlandı: updated=${updated}, failed=${failed}.`);
    show(`${updated} yazı tekrar yayınlandı${failed ? `, ${failed} başarısız` : ''}.`, failed ? 'error' : 'ok');
    await loadModerationSections();
    activateTab('published');
  } catch (error) {
    show(`Toplu geri yayın hatası: ${error.message || error}`, 'error');
  }
}

function clearPersistedLogs() {
  if (!window.confirm('Kayıtlı admin logları temizlensin mi?')) return;
  localStorage.removeItem(LOG_STORAGE_KEY);
  if (logBox) logBox.textContent = '';
  show('Admin log kayıtları temizlendi.', 'ok');
}

function downloadLogs() {
  const lines = readPersistedLogs();
  if (!lines.length) {
    show('İndirilecek log kaydı bulunamadı.', 'error');
    return;
  }
  const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `nebchat-admin-log-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  show('Log dosyası indirildi.', 'ok');
}

bootstrapPersistedLogs();

onAuthStateChanged(auth, async (user) => {
  const allowed = Boolean(user?.email) && user.email.toLowerCase() === ADMIN_EMAIL;
  isAdmin = allowed;
  currentAdmin = user || null;

  if (!user) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Bu sayfaya erişmek için giriş yapmalısınız.</div>';
    panel.classList.add('hidden');
    seedBtn.disabled = true;
    return;
  }

  if (!allowed) {
    gate.classList.remove('hidden');
    gate.innerHTML = '<div class="notice error">Erişim reddedildi. Bu panel sadece yetkili yönetici hesabı için açıktır.</div>';
    panel.classList.add('hidden');
    seedBtn.disabled = true;
    return;
  }

  gate.classList.add('hidden');
  panel.classList.remove('hidden');
  seedBtn.disabled = false;
  show('Hazır. Moderasyon ve içerik yönetimi aktif.', 'ok');
  await Promise.all([loadComments(), loadModerationSections()]);
});

seedBtn.addEventListener('click', () => importSeedArticles({ force: false }));

sendPublishedToReviewBtn?.addEventListener('click', sendAllPublishedToReview);
restorePublishedBtn?.addEventListener('click', restorePendingToPublished);
clearLogBtn?.addEventListener('click', clearPersistedLogs);
downloadLogBtn?.addEventListener('click', downloadLogs);

seedForceBtn?.addEventListener('click', async () => {
  const confirmed = window.confirm('Bu işlem mevcut seed içeriklerini zorla günceller. Emin misiniz?');
  if (!confirmed) return;
  await importSeedArticles({ force: true });
});

moderationTabs?.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-status]');
  if (!btn) return;
  activateTab(btn.dataset.status);
});

document.getElementById('moderationLists')?.addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  const articleRef = doc(db, 'articles', btn.dataset.id);
  const snap = await getDoc(articleRef);
  if (!snap.exists()) return;
  const data = snap.data();

  if (btn.dataset.action === 'edit') {
    fillEditorForm(data, btn.dataset.id);
    return;
  }

  try {
    await changeArticleStatus(btn.dataset.id, btn.dataset.action);
  } catch (error) {
    log(`FAILED status change: id=${btn.dataset.id}, action=${btn.dataset.action}, error=${error.message || error}`);
    show(`Durum değiştirilemedi: ${error.message || error}`, 'error');
  }
});

articleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdmin || !currentAdmin) {
    show('Yalnızca yönetici bu işlemi yapabilir.', 'error');
    return;
  }

  const f = e.target;
  const slug = f.slug.value.trim();
  if (!slug) {
    show('Slug zorunludur.', 'error');
    return;
  }

  const articleRef = doc(db, 'articles', slug);
  const existingSnap = await getDoc(articleRef);
  const nowIso = new Date(f.publishedAt.value || new Date().toISOString()).toISOString();
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  const payload = {
    slug,
    title: f.title.value.trim(),
    excerpt: f.excerpt.value.trim(),
    bodyMarkdown: f.bodyMarkdown.value.trim(),
    bodyHtml: f.bodyMarkdown.value.trim().replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').concat('</p>'),
    coverImageUrl: f.coverImageUrl.value.trim(),
    category: f.category.value.trim(),
    tags: f.tags.value.split(',').map((x) => x.trim()).filter(Boolean),
    authorName: f.authorName.value.trim(),
    authorSlug: f.authorName.value.trim().toLowerCase().replace(/\s+/g, '-'),
    authorEmail: existing?.authorEmail || currentAdmin.email,
    authorId: existing?.authorId || currentAdmin.uid,
    publishedAt: f.status.value === 'published' ? new Date(nowIso) : existing?.publishedAt || null,
    updatedAt: serverTimestamp(),
    createdAt: existing?.createdAt || serverTimestamp(),
    status: f.status.value,
    isVisible: f.status.value === 'published',
    featured: f.featured.checked,
    readingTime: Number(f.readingTime.value || 5),
    seoTitle: f.seoTitle.value.trim(),
    seoDescription: f.seoDescription.value.trim(),
    views: Number(existing?.views || 0),
    commentCount: Number(existing?.commentCount || 0),
    likeCount: Number(existing?.likeCount || 0)
  };

  await setDoc(articleRef, payload, { merge: true });
  show(existing ? 'Yazı güncellendi.' : 'Yazı kaydedildi.', 'ok');
  f.reset();
  await loadModerationSections();
});

commentList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn || !isAdmin) return;
  await updateDoc(doc(db, 'comments', btn.dataset.id), { status: btn.dataset.action, updatedAt: serverTimestamp() });
  show('Yorum durumu güncellendi.', 'ok');
  await loadComments();
});
