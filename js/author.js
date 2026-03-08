import { fetchArticles } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();

const slug = new URLSearchParams(location.search).get('slug') || 'nebchat-editor';
const list = document.getElementById('authorArticles');
const nameEl = document.getElementById('authorName');
const bioEl = document.getElementById('authorBio');

const rows = await fetchArticles({ authorSlug: slug, max: 100 });
const name = rows[0]?.authorName || 'NebChat Editör';
nameEl.textContent = name;
bioEl.textContent = `${name}, NebChat editoryal çerçevesinde tehdit odaklı teknik analizler üretir.`;

const url = `https://nebchat.online/author.html?slug=${encodeURIComponent(slug)}`;
setSEO({ title: `${name} | NebChat`, description: bioEl.textContent, url });
setCanonical(url);
setJSONLD({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name,
  url
}, 'authorSchema');

list.innerHTML = rows.length
  ? rows.map((a) => `<article class="card article-card"><span class="badge">${escapeHtml(a.category)}</span><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('')
  : '<div class="card">Bu yazar için yayın bulunamadı.</div>';
