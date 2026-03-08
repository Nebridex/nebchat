import { fetchArticles, fetchCategories } from './data.js';
import { TOPIC_HUBS, TRENDING_TOPICS } from './content.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav } from './common.js';

injectHeaderFooter();
initAuthNav();

const featuredWrap = document.getElementById('featuredArticle');
const latestWrap = document.getElementById('latestArticles');
const categoryWrap = document.getElementById('categoryHighlights');
const picksWrap = document.getElementById('editorPicks');
const digestWrap = document.getElementById('weeklyDigest');
const trendingWrap = document.getElementById('trendingTopics');
const hubWrap = document.getElementById('topicHubs');

const articles = await fetchArticles({ max: 24 });
const categories = await fetchCategories();

const emptyCard = '<div class="card"><strong>Henüz yayınlanmış makale yok.</strong><p class="muted">Yeni yayınlar kısa süre içinde burada görünür.</p></div>';

const featured = articles.find((a) => a.featured) || articles[0];
if (featuredWrap) {
  featuredWrap.innerHTML = featured
    ? `<article class="card article-card">
      ${featured.coverImageUrl ? `<img src="${escapeHtml(featured.coverImageUrl)}" alt="${escapeHtml(featured.title)}" class="cover"/>` : ''}
      <span class="badge">Öne çıkan analiz</span>
      <h3><a href="article.html?slug=${encodeURIComponent(featured.slug)}">${escapeHtml(featured.title)}</a></h3>
      <p>${escapeHtml(featured.excerpt || '')}</p>
      <div class="meta"><span>${featured.publishedAtDate ? formatDate(featured.publishedAtDate) : '—'}</span><span>${featured.readingTime || 5} dk okuma</span></div>
    </article>`
    : emptyCard;
}

if (latestWrap) {
  latestWrap.innerHTML = articles.length
    ? articles.slice(0, 6).map((a) => `<article class="card article-card">
      <span class="badge">${escapeHtml(a.category)}</span>
      <h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
      <p>${escapeHtml(a.excerpt || '')}</p>
      <div class="meta"><span>${escapeHtml(a.authorName || 'NebChat')}</span><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div>
    </article>`).join('')
    : emptyCard;
}

if (categoryWrap) {
  categoryWrap.innerHTML = categories.slice(0, 6).map((c) => `<a class="card" href="category.html?slug=${encodeURIComponent(c.slug)}"><strong>${escapeHtml(c.name)}</strong><p class="muted">${escapeHtml(c.description || '')}</p></a>`).join('');
}

if (picksWrap) {
  const picks = articles.slice(1, 5);
  picksWrap.innerHTML = picks.length
    ? picks.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('')
    : emptyCard;
}

if (digestWrap) {
  const digest = (await fetchArticles({ tag: 'weekly-digest', max: 1 }))[0] || articles[0];
  if (digest) {
    digestWrap.innerHTML = `<article class="card article-card"><span class="badge">Weekly Digest</span><h3><a href="article.html?slug=${encodeURIComponent(digest.slug)}">${escapeHtml(digest.title)}</a></h3><p>${escapeHtml(digest.excerpt || '')}</p><div class="meta"><span>${digest.publishedAtDate ? formatDate(digest.publishedAtDate) : '—'}</span><span>${digest.readingTime || 5} dk</span></div></article>`;
  }
}

if (trendingWrap) {
  trendingWrap.innerHTML = TRENDING_TOPICS.map((t) => `<a class="category-chip" href="${t.href}">${escapeHtml(t.label)}</a>`).join('');
}

if (hubWrap) {
  hubWrap.innerHTML = TOPIC_HUBS.map((h) => `<a class="card" href="topic.html?slug=${encodeURIComponent(h.slug)}"><strong>${escapeHtml(h.name)}</strong><p class="muted">${escapeHtml(h.description)}</p></a>`).join('');
}
