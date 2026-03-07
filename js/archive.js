import { fetchArticles, fetchCategories } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav } from './common.js';

injectHeaderFooter();
initAuthNav();

const params = new URLSearchParams(location.search);
const qEl = document.getElementById('searchInput');
const sortEl = document.getElementById('sortInput');
const chipsWrap = document.getElementById('categoryFilters');
const listWrap = document.getElementById('archiveList');
const moreBtn = document.getElementById('loadMoreBtn');
let shown = 6;

const render = async () => {
  const category = params.get('category') || '';
  const search = params.get('q') || '';
  const sort = params.get('sort') || 'newest';
  qEl.value = search;
  sortEl.value = sort;

  const categories = await fetchCategories();
  chipsWrap.innerHTML = [`<a class="category-chip ${!category ? 'active' : ''}" href="archive.html">Tümü</a>`]
    .concat(categories.map((c) => `<a class="category-chip ${category === c.slug ? 'active' : ''}" href="archive.html?category=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)}</a>`)).join('');

  const rows = await fetchArticles({ category, search, sort, max: 60 });
  const sliced = rows.slice(0, shown);
  listWrap.innerHTML = sliced.map((a) => `<article class="card article-card">
    <span class="badge">${escapeHtml(a.category)}</span>
    <h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
    <p>${escapeHtml(a.excerpt || '')}</p>
    <div class="meta"><span>${escapeHtml(a.authorName || 'NebChat Editör')}</span><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.views || 0} görüntülenme</span></div>
  </article>`).join('') || '<div class="card"><strong>Henüz yayınlanmış içerik yok.</strong><p class="muted">admin.html üzerinden "Örnek içerikleri Firestore\'a aktar" butonunu kullanabilirsiniz.</p></div>';

  moreBtn.classList.toggle('hidden', rows.length <= shown);
  moreBtn.onclick = () => { shown += 6; render(); };
};

document.getElementById('archiveForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (qEl.value.trim()) params.set('q', qEl.value.trim());
  else params.delete('q');
  params.set('sort', sortEl.value);
  history.replaceState({}, '', `archive.html?${params.toString()}`);
  shown = 6;
  render();
});

render();
