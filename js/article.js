import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { addComment, fetchArticleBySlug, fetchArticles, fetchComments, incrementView } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setRobots, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();

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

const renderNotFound = () => {
  wrap.innerHTML = '<div class="notice error">Makale bulunamadı veya henüz yayınlanmadı.</div>';
  relatedWrap.innerHTML = '<div class="card muted">İlgili içerik bulunamadı.</div>';
  form.classList.add('hidden');
  commentsWrap.innerHTML = '';
  const url = slug
    ? `https://nebchat.online/article.html?slug=${encodeURIComponent(slug)}`
    : 'https://nebchat.online/article.html';
  setSEO({
    title: 'Makale bulunamadı | NebChat',
    description: 'İstenen makale NebChat üzerinde bulunamadı.',
    url,
    type: 'article'
  });
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
  if (!slug) {
    renderNotFound();
    return;
  }

  const article = await fetchArticleBySlug(slug);
  if (!article) {
    renderNotFound();
    return;
  }

  currentArticle = article;

  const articleUrl = `https://nebchat.online/article.html?slug=${encodeURIComponent(article.slug)}`;
  setRobots('index,follow');
  setSEO({
    title: `${article.seoTitle || article.title} | NebChat`,
    description: article.seoDescription || article.excerpt,
    url: articleUrl,
    type: 'article'
  });
  setCanonical(articleUrl);
  setJSONLD({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription || article.excerpt || '',
    datePublished: article.publishedAtDate ? article.publishedAtDate.toISOString() : undefined,
    dateModified: article.updatedAtDate ? article.updatedAtDate.toISOString() : undefined,
    author: {
      '@type': 'Person',
      name: article.authorName || 'NebChat Editör'
    },
    mainEntityOfPage: articleUrl,
    publisher: {
      '@type': 'Organization',
      name: 'NebChat'
    }
  }, 'articleSchema');

  await incrementView(article.id);

  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progressBar.style.width = `${Math.max(0, Math.min(100, p))}%`;
  });

  wrap.innerHTML = `<article class="article-body">
    <span class="badge">${escapeHtml(article.category)}</span>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta"><span>${escapeHtml(article.authorName || 'NebChat Editör')}</span><span>${article.publishedAtDate ? formatDate(article.publishedAtDate) : '—'}</span><span>${article.readingTime || 5} dk okuma</span></div>
    ${article.coverImageUrl ? `<img class="cover" src="${escapeHtml(article.coverImageUrl)}" alt="${escapeHtml(article.title)}">` : ''}
    <div class="article-content">${article.html}</div>
    <div class="hero-actions">
      <button id="copyLinkBtn" class="btn ghost" type="button">Bağlantıyı kopyala</button>
      <a class="btn ghost" href="archive.html?category=${encodeURIComponent(article.category)}">Bu kategorideki yazılar</a>
    </div>
  </article>`;

  document.getElementById('copyLinkBtn').onclick = async () => {
    await navigator.clipboard.writeText(location.href);
    message.textContent = 'Makale bağlantısı kopyalandı.';
  };

  const related = (await fetchArticles({ category: article.category, max: 6 }))
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  relatedWrap.innerHTML = related.map((a) => `<a class="card" href="article.html?slug=${encodeURIComponent(a.slug)}"><strong>${escapeHtml(a.title)}</strong><p class="muted">${escapeHtml(relatedExcerpt(a.excerpt))}</p></a>`).join('') || '<div class="card muted">İlgili içerik yakında.</div>';

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
