import { fetchArticles, fetchCategories } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();

const slug = new URLSearchParams(location.search).get('slug') || '';
const categories = await fetchCategories();
const current = categories.find((c) => c.slug === slug);
const titleEl = document.getElementById('categoryTitle');
const descEl = document.getElementById('categoryDescription');
const list = document.getElementById('categoryArticles');

const categoryUrl = `https://nebchat.online/category.html?slug=${encodeURIComponent(slug)}`;

if (current) {
  titleEl.textContent = current.name;
  descEl.textContent = current.description;
  setSEO({ title: `${current.name} | NebChat`, description: current.description, url: categoryUrl });
  setCanonical(categoryUrl);
  setJSONLD({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${current.name} | NebChat`,
    description: current.description,
    url: categoryUrl
  }, 'categorySchema');
} else {
  setSEO({ title: 'Kategori bulunamadı | NebChat', description: 'İstenen kategori bulunamadı.', url: categoryUrl });
}

const rows = await fetchArticles({ category: slug, max: 30 });
list.innerHTML = rows.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('') || '<div class="card">Bu kategoride henüz yayın yok.</div>';
