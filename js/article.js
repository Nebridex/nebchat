import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { addComment, fetchArticleBySlug, fetchArticles, fetchComments, incrementView } from './data.js';
import { formatDate, injectHeaderFooter, initAuthNav, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();

const slug = new URLSearchParams(location.search).get('slug');
const wrap = document.getElementById('articleWrap');
const commentsWrap = document.getElementById('commentsWrap');
const relatedWrap = document.getElementById('relatedArticles');
const form = document.getElementById('commentForm');
const message = document.getElementById('commentMessage');
const counter = document.getElementById('commentCount');
let currentUser = null;
let submitLock = false;
let lastSubmitTime = 0;

const article = await fetchArticleBySlug(slug);
if (!article) {
  wrap.innerHTML = '<div class="notice error">Makale bulunamadı.</div>';
  throw new Error('article missing');
}

setSEO({ title: `${article.title} | NebChat`, description: article.seoDescription || article.excerpt });

await incrementView(article.id);

document.getElementById('readingProgress').addEventListener('scroll', () => {});
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  document.getElementById('readingProgress').style.width = `${Math.max(0, Math.min(100, p))}%`;
});

wrap.innerHTML = `<article class="article-body">
  <span class="badge">${article.category}</span>
  <h1>${article.title}</h1>
  <div class="meta"><span>${article.authorName}</span><span>${formatDate(article.publishedAtDate)}</span><span>${article.readingTime || 5} dk okuma</span></div>
  <img class="cover" src="${article.coverImageUrl}" alt="${article.title}">
  <div class="article-content">${article.html}</div>
  <div class="hero-actions">
    <button id="copyLinkBtn" class="btn ghost">Bağlantıyı kopyala</button>
    <a class="btn ghost" href="archive.html?category=${article.category}">Bu kategorideki yazılar</a>
  </div>
</article>`;

document.getElementById('copyLinkBtn').onclick = async () => {
  await navigator.clipboard.writeText(location.href);
  alert('Makale bağlantısı kopyalandı.');
};

const related = (await fetchArticles({ category: article.category, max: 6 })).filter((a) => a.slug !== article.slug).slice(0, 3);
relatedWrap.innerHTML = related.map((a) => `<a class="card" href="article.html?slug=${a.slug}"><strong>${a.title}</strong><p class="muted">${a.excerpt}</p></a>`).join('') || '<div class="card muted">İlgili içerik yakında.</div>';

async function loadComments() {
  const comments = await fetchComments(article.slug);
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

  const renderComment = (c, child = false) => `<div class="comment ${child ? 'child' : ''}"><div class="head"><strong>${c.displayName}</strong><span>${formatDate(c.createdAtDate || new Date())}</span></div><p>${c.body.replace(/</g, '&lt;')}</p></div>`;
  commentsWrap.innerHTML = roots.map((r) => renderComment(r) + (byParent[r.id] || []).map((ch) => renderComment(ch, true)).join('')).join('');
}

await loadComments();

onAuthStateChanged(auth, (u) => {
  currentUser = u;
  form.querySelector('button').disabled = !u;
  if (!u) message.textContent = 'Yorum yazmak için giriş yapın.';
  else message.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  if (submitLock || Date.now() - lastSubmitTime < 7000) return;
  const body = form.body.value.trim();
  if (body.length < 12) {
    message.textContent = 'Yorum en az 12 karakter olmalı.';
    return;
  }
  submitLock = true;
  form.querySelector('button').disabled = true;
  await addComment({ articleId: article.id, articleSlug: article.slug, userId: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Kullanıcı', body });
  form.reset();
  lastSubmitTime = Date.now();
  submitLock = false;
  form.querySelector('button').disabled = false;
  message.textContent = 'Yorumunuz gönderildi.';
  await loadComments();
});
