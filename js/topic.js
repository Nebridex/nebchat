import { fetchArticles, getLastPublicArticleError } from './data.js';
import { TOPIC_HUBS } from './content.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setRobots, setSEO, setOrganizationSchema } from './common.js';

injectHeaderFooter();
initAuthNav();
setOrganizationSchema();

const requestedSlug = new URLSearchParams(location.search).get('slug') || 'ai-security';
const hub = TOPIC_HUBS.find((h) => h.slug === requestedSlug) || TOPIC_HUBS[0];

const titleEl = document.getElementById('topicTitle');
const descEl = document.getElementById('topicDescription');
const linksEl = document.getElementById('topicLinks');
const featuredEl = document.getElementById('topicFeatured');
const listEl = document.getElementById('topicArticles');

titleEl.textContent = hub.name;
descEl.textContent = hub.description;
linksEl.innerHTML = TOPIC_HUBS.map((h) => `<a class="category-chip ${h.slug === hub.slug ? 'active' : ''}" href="topic.html?slug=${encodeURIComponent(h.slug)}">${escapeHtml(h.name)}</a>`).join('');

const rows = await fetchArticles({ category: hub.category || '', search: hub.query || '', max: 40 });
const publicError = getLastPublicArticleError();
if (!rows.length && publicError) {
  console.error('Topic hub akışı yüklenemedi:', publicError);
}
const url = `https://nebchat.online/topic.html?slug=${encodeURIComponent(hub.slug)}`;

setSEO({ title: `${hub.name} Topic Hub | NebChat`, description: hub.description, url });
setCanonical(url);
setRobots(requestedSlug === hub.slug ? 'index,follow' : 'noindex,follow');
setJSONLD({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `${hub.name} Topic Hub`,
  description: hub.description,
  url
}, 'topicSchema');
setJSONLD({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://nebchat.online/' },
    { '@type': 'ListItem', position: 2, name: 'Topic Hub', item: 'https://nebchat.online/topic.html?slug=ai-security' },
    { '@type': 'ListItem', position: 3, name: hub.name, item: url }
  ]
}, 'topicBreadcrumbSchema');

featuredEl.innerHTML = rows.slice(0, 2).map((a) => `<article class="card article-card"><span class="badge">${escapeHtml(a.category)}</span><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('') || (publicError ? '<div class="notice error">Yayınlar yüklenemedi. Lütfen tekrar deneyin.</div>' : '<div class="card">Bu topic için henüz yayınlanmış içerik bulunmuyor.</div>');

listEl.innerHTML = rows.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${escapeHtml(a.category)}</span><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span></div></article>`).join('') || (publicError ? '<div class="notice error">Yayınlar yüklenemedi. Lütfen tekrar deneyin.</div>' : '<div class="card">Bu topic için henüz yayınlanmış içerik bulunmuyor.</div>');
