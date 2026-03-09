import { fetchArticles, fetchCategories, getLastPublicArticleError } from './data.js';
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

const params = new URLSearchParams(location.search);
const qEl = document.getElementById('searchInput');
const sortEl = document.getElementById('sortInput');
const chipsWrap = document.getElementById('categoryFilters');
const listWrap = document.getElementById('archiveList');
const moreBtn = document.getElementById('loadMoreBtn');
let shown = 10;

const render = async () => {
  const category = params.get('category') || '';
  const search = params.get('q') || '';
  const sort = params.get('sort') || 'newest';
  qEl.value = search;
  sortEl.value = sort;

  const url = `https://nebchat.online/archive.html${params.toString() ? `?${params.toString()}` : ''}`;
  const archiveTitle = category ? `${category} Arşivi | NebChat` : 'Arşiv | NebChat Siber Güvenlik Yazıları';
  const archiveDesc = search
    ? `"${search}" araması için NebChat siber güvenlik arşiv sonuçları.`
    : 'NebChat arşivinde threat intelligence, ransomware, cloud security ve olay müdahale içeriklerini keşfedin.';
  setSEO({ title: archiveTitle, description: archiveDesc, url, type: 'website' });
  setCanonical(url);
  setRobots('index,follow');
  setJSONLD({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: archiveTitle,
    description: archiveDesc,
    url
  }, 'archiveSchema');

  const categories = await fetchCategories();
  chipsWrap.innerHTML = [`<a class="category-chip ${!category ? 'active' : ''}" href="archive.html">Tüm kategoriler</a>`]
    .concat(categories.map((c) => `<a class="category-chip ${category === c.slug ? 'active' : ''}" href="archive.html?category=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)} kategorisi yazıları</a>`)).join('');

  const rows = await fetchArticles({ category, search, sort, max: 60 });
  const publicError = getLastPublicArticleError();
  if (!rows.length && publicError) {
    listWrap.innerHTML = '<div class="notice error"><strong>Yayınlar yüklenemedi.</strong><p class="muted">Veri sorgusu başarısız oldu. Lütfen daha sonra tekrar deneyin.</p></div>';
    console.error('Arşiv akışı yüklenemedi:', publicError);
    moreBtn.classList.add('hidden');
    return;
  }

  const sliced = rows.slice(0, shown);
  listWrap.innerHTML = sliced.map((a) => `<article class="card article-card">
    <span class="badge">${escapeHtml(a.category)}</span>
    <h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
    <p>${escapeHtml(a.excerpt || '')}</p>
    <div class="meta"><span>${escapeHtml(a.authorName || 'NebChat Editör')}</span><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk okuma</span></div>
    <a class="category-chip" href="category.html?slug=${encodeURIComponent(a.category)}">${escapeHtml(a.category)} kategorisini keşfet</a>
  </article>`).join('') || '<div class="card"><strong>Henüz yayınlanmış içerik yok.</strong><p class="muted">Bu arşivde henüz yayınlanmış içerik bulunmuyor.</p></div>';

  moreBtn.classList.toggle('hidden', rows.length <= shown);
  moreBtn.onclick = () => { shown += 10; render(); };
};

document.getElementById('archiveForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (qEl.value.trim()) params.set('q', qEl.value.trim());
  else params.delete('q');
  params.set('sort', sortEl.value);
  history.replaceState({}, '', `archive.html?${params.toString()}`);
  shown = 10;
  render();
});

render();
