import { fetchArticles, getLastPublicArticleError } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setRobots, setSEO, setOrganizationSchema } from './common.js';

injectHeaderFooter();
initAuthNav();
setOrganizationSchema();

const slug = new URLSearchParams(location.search).get('slug') || 'nebchat-editor';
const list = document.getElementById('authorArticles');
const nameEl = document.getElementById('authorName');
const bioEl = document.getElementById('authorBio');

const rows = await fetchArticles({ authorSlug: slug, max: 100 });
const publicError = getLastPublicArticleError();
if (!rows.length && publicError) console.error('Yazar sayfası akışı yüklenemedi:', publicError);
const name = rows[0]?.authorName || 'NebChat Editör';
nameEl.textContent = name;
bioEl.textContent = `${name}, NebChat editoryal çerçevesinde tehdit odaklı teknik analizler üretir.`;

const url = `https://nebchat.online/author.html?slug=${encodeURIComponent(slug)}`;
setSEO({ title: `${name} | NebChat`, description: bioEl.textContent, url });
setCanonical(url);
setRobots(rows.length ? 'index,follow' : 'noindex,follow');
setJSONLD({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name,
  url
}, 'authorSchema');
setJSONLD({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://nebchat.online/' },
    { '@type': 'ListItem', position: 2, name: 'Yazarlar', item: 'https://nebchat.online/author.html?slug=nebchat-editor' },
    { '@type': 'ListItem', position: 3, name, item: url }
  ]
}, 'authorBreadcrumbSchema');

list.innerHTML = rows.length
  ? rows.map((a) => `<article class="card article-card"><span class="badge">${escapeHtml(a.category)}</span><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('')
  : (publicError ? '<div class="notice error">Yazar yayınları şu anda yüklenemedi.</div>' : '<div class="card">Bu yazar için yayın bulunamadı.</div>');
