import { fetchArticles, fetchCategories } from './data.js';
import { formatDate, injectHeaderFooter, initAuthNav } from './common.js';

injectHeaderFooter();
initAuthNav();

const featuredWrap = document.getElementById('featuredArticle');
const latestWrap = document.getElementById('latestArticles');
const categoryWrap = document.getElementById('categoryHighlights');
const picksWrap = document.getElementById('editorPicks');

const articles = await fetchArticles({ max: 12 });
const categories = await fetchCategories();

const featured = articles.find((a) => a.featured) || articles[0];
if (featuredWrap && featured) {
  featuredWrap.innerHTML = `<article class="card article-card">
      <img src="${featured.coverImageUrl}" alt="${featured.title}" class="cover"/>
      <span class="badge">Öne çıkan analiz</span>
      <h3><a href="article.html?slug=${featured.slug}">${featured.title}</a></h3>
      <p>${featured.excerpt}</p>
      <div class="meta"><span>${formatDate(featured.publishedAtDate)}</span><span>${featured.readingTime || 5} dk okuma</span></div>
    </article>`;
}

if (latestWrap) {
  latestWrap.innerHTML = articles.slice(0, 6).map((a) => `<article class="card article-card">
      <span class="badge">${a.category}</span>
      <h3><a href="article.html?slug=${a.slug}">${a.title}</a></h3>
      <p>${a.excerpt}</p>
      <div class="meta"><span>${a.authorName}</span><span>${formatDate(a.publishedAtDate)}</span></div>
    </article>`).join('');
}

if (categoryWrap) {
  categoryWrap.innerHTML = categories.slice(0, 6).map((c) => `<a class="card" href="category.html?slug=${c.slug}"><strong>${c.name}</strong><p class="muted">${c.description}</p></a>`).join('');
}

if (picksWrap) {
  picksWrap.innerHTML = articles.slice(1, 4).map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${a.slug}">${a.title}</a></h3><p>${a.excerpt}</p></article>`).join('');
}
