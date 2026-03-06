import { fetchArticles, fetchCategories } from './data.js';
import { formatDate, injectHeaderFooter, initAuthNav, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();
const slug = new URLSearchParams(location.search).get('slug') || '';
const categories = await fetchCategories();
const current = categories.find((c) => c.slug === slug);
const titleEl = document.getElementById('categoryTitle');
const descEl = document.getElementById('categoryDescription');
const list = document.getElementById('categoryArticles');

if (current) {
  titleEl.textContent = current.name;
  descEl.textContent = current.description;
  setSEO({ title: `${current.name} | NebChat`, description: current.description });
}

const rows = await fetchArticles({ category: slug, max: 30 });
list.innerHTML = rows.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${a.slug}">${a.title}</a></h3><p>${a.excerpt}</p><div class="meta"><span>${formatDate(a.publishedAtDate)}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('') || '<div class="card">Bu kategoride henüz yayın yok.</div>';
