import { fetchArticles, fetchCategories } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav } from './common.js';

injectHeaderFooter();
initAuthNav();

const featuredWrap = document.getElementById('featuredArticle');
const latestWrap = document.getElementById('latestArticles');
const categoryWrap = document.getElementById('categoryHighlights');
const picksWrap = document.getElementById('editorPicks');

const articles = await fetchArticles({ max: 12 });
const categories = await fetchCategories();

const emptyCard = '<div class="card"><strong>Henüz yayınlanmış makale yok.</strong><p class="muted">Yeni yayınlar kısa süre içinde burada görünür.</p></div>';

const featured = articles.find((a) => a.featured) || articles[0];
if (featuredWrap) {
  if (featured) {
    featuredWrap.innerHTML = `<article class="card article-card">
      ${featured.coverImageUrl ? `<img src="${escapeHtml(featured.coverImageUrl)}" alt="${escapeHtml(featured.title)}" class="cover"/>` : ''}
      <span class="badge">Öne çıkan analiz</span>
      <h3><a href="article.html?slug=${encodeURIComponent(featured.slug)}">${escapeHtml(featured.title)}</a></h3>
      <p>${escapeHtml(featured.excerpt || '')}</p>
      <div class="meta"><span>${featured.publishedAtDate ? formatDate(featured.publishedAtDate) : '—'}</span><span>${featured.readingTime || 5} dk okuma</span></div>
    </article>`;
  } else {
    featuredWrap.innerHTML = emptyCard;
  }
}

if (latestWrap) {
  latestWrap.innerHTML = articles.length
    ? articles.slice(0, 6).map((a) => `<article class="card article-card">
      <span class="badge">${escapeHtml(a.category)}</span>
      <h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
      <p>${escapeHtml(a.excerpt || '')}</p>
      <div class="meta"><span>${escapeHtml(a.authorName || 'NebChat')}</span><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span></div>
    </article>`).join('')
    : emptyCard;
}

if (categoryWrap) {
  categoryWrap.innerHTML = categories.slice(0, 6).map((c) => `<a class="card" href="category.html?slug=${encodeURIComponent(c.slug)}"><strong>${escapeHtml(c.name)}</strong><p class="muted">${escapeHtml(c.description || '')}</p></a>`).join('');
}

if (picksWrap) {
  const picks = articles.slice(1, 4);
  picksWrap.innerHTML = picks.length
    ? picks.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p></article>`).join('')
    : emptyCard;
}
