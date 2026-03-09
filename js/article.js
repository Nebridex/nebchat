import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { addComment, fetchArticleBySlug, fetchArticles, fetchComments, getLastPublicArticleError, incrementView } from './data.js';
import {
  escapeHtml,
  formatDate,
  injectHeaderFooter,
  initAuthNav,
  setCanonical,
  setJSONLD,
  setOrganizationSchema,
  setRobots,
  setSEO
} from './common.js';

injectHeaderFooter();
initAuthNav();
setOrganizationSchema();

const slug = new URLSearchParams(location.search).get('slug') || '';
const wrap = document.getElementById('articleWrap');
const commentsWrap = document.getElementById('commentsWrap');
const relatedWrap = document.getElementById('relatedArticles');
const form = document.getElementById('commentForm');
const message = document.getElementById('commentMessage');
const counter = document.getElementById('commentCount');
const progressBar = document.getElementById('readingProgress');
let currentUser = null;
let submitLock = false;
let lastSubmitTime = 0;
let currentArticle = null;

const relatedExcerpt = (text = '', max = 130) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
};

const updateLibrary = (type, articleSlug) => {
  const key = `nebchat-${type}`;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const next = Array.from(new Set([articleSlug, ...current])).slice(0, 100);
  localStorage.setItem(key, JSON.stringify(next));
  message.textContent = type === 'saved' ? 'Makale kaydedildi.' : 'Makale okuma listesine eklendi.';
};

const renderNotFound = (reason = '') => {
  const detail = reason ? `<p class="muted">${escapeHtml(reason)}</p>` : '';
  wrap.innerHTML = `<div class="notice error">Makale bulunamadı veya henüz yayınlanmadı.${detail}</div>`;
  relatedWrap.innerHTML = '<div class="card muted">İlgili içerik bulunamadı.</div>';
  form.classList.add('hidden');
  commentsWrap.innerHTML = '';
  const url = slug
    ? `https://nebchat.online/article.html?slug=${encodeURIComponent(slug)}`
    : 'https://nebchat.online/article.html';
  setSEO({ title: 'Makale bulunamadı | NebChat', description: 'İstenen makale NebChat üzerinde bulunamadı.', url, type: 'article' });
  setRobots('noindex,follow');
};

async function loadComments() {
  const comments = await fetchComments(currentArticle.slug);
  counter.textContent = String(comments.length);
  if (!comments.length) {
    commentsWrap.innerHTML = '<div class="notice">Henüz yorum yok. İlk yorumu siz bırakın.</div>';
    return;
  }

  const roots = comments.filter((c) => !c.parentId);
  const byParent = comments.reduce((acc, c) => {
    if (c.parentId) (acc[c.parentId] ||= []).push(c);
    return acc;
  }, {});

  const renderComment = (c, child = false) => `<div class="comment ${child ? 'child' : ''}"><div class="head"><strong>${escapeHtml(c.displayName || 'Kullanıcı')}</strong><span>${formatDate(c.createdAtDate || new Date())}</span></div><p>${escapeHtml(c.body || '')}</p></div>`;
  commentsWrap.innerHTML = roots.map((r) => renderComment(r) + (byParent[r.id] || []).map((ch) => renderComment(ch, true)).join('')).join('');
}

async function init() {
  if (!slug) return renderNotFound();

  const article = await fetchArticleBySlug(slug);
  if (!article) {
    const err = getLastPublicArticleError();
    if (err) {
      console.error('Makale detayı sorgusu başarısız:', err);
      return renderNotFound('Makale verisi yüklenirken bir sorgu hatası oluştu.');
    }
    return renderNotFound();
  }

  currentArticle = article;

  const articleUrl = `https://nebchat.online/article.html?slug=${encodeURIComponent(article.slug)}`;
  const articleDescription = article.seoDescription || article.excerpt || 'NebChat teknik siber güvenlik analizi.';
  setRobots('index,follow');
  setSEO({
    title: `${article.seoTitle || article.title} | NebChat`,
    description: articleDescription,
    url: articleUrl,
    type: 'article',
    image: article.coverImageUrl || ''
  });
  setCanonical(articleUrl);
  setJSONLD({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: articleDescription,
    datePublished: article.publishedAtDate ? article.publishedAtDate.toISOString() : undefined,
    dateModified: article.updatedAtDate ? article.updatedAtDate.toISOString() : (article.publishedAtDate ? article.publishedAtDate.toISOString() : undefined),
    author: {
      '@type': 'Person',
      name: article.authorName || 'NebChat Editör',
      url: `https://nebchat.online/author.html?slug=${encodeURIComponent(article.authorSlug || 'nebchat-editor')}`
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl
    },
    image: article.coverImageUrl || undefined,
    articleSection: article.category || undefined,
    publisher: {
      '@type': 'Organization',
      name: 'NebChat',
      url: 'https://nebchat.online/'
    }
  }, 'articleSchema');
  setJSONLD({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://nebchat.online/' },
      { '@type': 'ListItem', position: 2, name: 'Arşiv', item: 'https://nebchat.online/archive.html' },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl }
    ]
  }, 'articleBreadcrumbSchema');

  await incrementView(article.id);

  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progressBar.style.width = `${Math.max(0, Math.min(100, p))}%`;
  });

  wrap.innerHTML = `<article class="article-body">
    <p class="muted" style="margin:0 0 .6rem;"><a href="archive.html">Arşiv</a> / <a href="category.html?slug=${encodeURIComponent(article.category)}">${escapeHtml(article.category)}</a></p>
    <span class="badge">${escapeHtml(article.category)}</span>
    <h1>${escapeHtml(article.title)}</h1>
    <p class="lead">${escapeHtml(article.excerpt || 'Bu analiz, NebChat editoryal standardında hazırlanmıştır.')}</p>
    <div class="meta"><span><a href="author.html?slug=${encodeURIComponent(article.authorSlug || 'nebchat-editor')}">${escapeHtml(article.authorName || 'NebChat Editör')}</a></span><span>Yayın: ${article.publishedAtDate ? formatDate(article.publishedAtDate) : '—'}</span><span>Güncelleme: ${article.updatedAtDate ? formatDate(article.updatedAtDate) : (article.publishedAtDate ? formatDate(article.publishedAtDate) : '—')}</span><span>${article.readingTime || 5} dk okuma</span></div>
    ${article.coverImageUrl ? `<img class="cover" src="${escapeHtml(article.coverImageUrl)}" alt="${escapeHtml(article.title)}">` : ''}
    <div class="article-content">${article.html}</div>
    <div class="panel" style="margin-top:1rem;"><strong>Yazar Hakkında</strong><p class="muted">${escapeHtml(article.authorName || 'NebChat Editör')} tarafından hazırlanan bu analiz, NebChat editoryal standartlarına göre yayınlanmıştır.</p><a class="btn ghost" href="author.html?slug=${encodeURIComponent(article.authorSlug || 'nebchat-editor')}">Yazarın diğer yazıları</a></div>
    <div class="panel" style="margin-top:1rem;"><strong>Sıradaki adım</strong><p class="muted">Bu makaleyi ekip içinde paylaşın ve aynı kategori için arşiv akışından benzer vakaları inceleyin.</p><a class="btn primary" href="archive.html?category=${encodeURIComponent(article.category)}">${escapeHtml(article.category)} arşivine git</a></div>
    <div class="hero-actions">
      <button id="copyLinkBtn" class="btn ghost" type="button">Bağlantıyı kopyala</button>
      <button id="saveArticleBtn" class="btn ghost" type="button">Kaydet</button>
      <button id="readLaterBtn" class="btn ghost" type="button">Sonra oku</button>
      <a class="btn ghost" href="archive.html?category=${encodeURIComponent(article.category)}">Bu kategorideki yazılar</a>
    </div>
    <div id="articlePager" class="hero-actions" style="margin-top:1rem;"></div>
  </article>`;

  document.getElementById('copyLinkBtn').onclick = async () => {
    await navigator.clipboard.writeText(location.href);
    message.textContent = 'Makale bağlantısı kopyalandı.';
  };
  document.getElementById('saveArticleBtn').onclick = () => updateLibrary('saved', article.slug);
  document.getElementById('readLaterBtn').onclick = () => updateLibrary('read-later', article.slug);

  const related = (await fetchArticles({ category: article.category, max: 12 }))
    .filter((a) => a.slug !== article.slug)
    .slice(0, 4);

  relatedWrap.innerHTML = related.map((a) => `<a class="card" href="article.html?slug=${encodeURIComponent(a.slug)}"><span class="badge">${escapeHtml(a.category)}</span><strong>${escapeHtml(a.title)}</strong><p class="muted">${escapeHtml(relatedExcerpt(a.excerpt))}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></a>`).join('') || '<div class="card muted">Bu makale için aynı kategoride ek içerik henüz listelenmedi.</div>';

  const sorted = (await fetchArticles({ max: 120 })).sort((a, b) => {
    const ta = a.publishedAtDate ? a.publishedAtDate.getTime() : 0;
    const tb = b.publishedAtDate ? b.publishedAtDate.getTime() : 0;
    return tb - ta;
  });
  const idx = sorted.findIndex((a) => a.slug === article.slug);
  const prev = idx >= 0 ? sorted[idx + 1] : null;
  const next = idx > 0 ? sorted[idx - 1] : null;
  const pager = document.getElementById('articlePager');
  if (pager) {
    pager.innerHTML = `${prev ? `<a class="btn ghost" href="article.html?slug=${encodeURIComponent(prev.slug)}">Önceki: ${escapeHtml(prev.title)}</a>` : ''}${next ? `<a class="btn ghost" href="article.html?slug=${encodeURIComponent(next.slug)}">Sonraki: ${escapeHtml(next.title)}</a>` : ''}`;
  }

  await loadComments();
}

onAuthStateChanged(auth, (u) => {
  currentUser = u;
  form.querySelector('button').disabled = !u;
  message.textContent = u ? '' : 'Yorum yazmak için giriş yapın.';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !currentArticle) return;
  if (submitLock || Date.now() - lastSubmitTime < 7000) return;

  const body = form.body.value.trim();
  if (body.length < 12) {
    message.textContent = 'Yorum en az 12 karakter olmalı.';
    return;
  }

  submitLock = true;
  form.querySelector('button').disabled = true;
  await addComment({
    articleId: currentArticle.id,
    articleSlug: currentArticle.slug,
    articleTitle: currentArticle.title,
    userId: currentUser.uid,
    displayName: currentUser.displayName || currentUser.email || 'Kullanıcı',
    body
  });

  form.reset();
  lastSubmitTime = Date.now();
  submitLock = false;
  form.querySelector('button').disabled = false;
  message.textContent = 'Yorumunuz gönderildi.';
  await loadComments();
});

init();
