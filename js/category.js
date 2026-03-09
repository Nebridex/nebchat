import { fetchArticles, fetchCategories, getLastPublicArticleError } from './data.js';
import { escapeHtml, formatDate, injectHeaderFooter, initAuthNav, setCanonical, setJSONLD, setRobots, setSEO } from './common.js';

injectHeaderFooter();
initAuthNav();

const slug = new URLSearchParams(location.search).get('slug') || '';
const categories = await fetchCategories();
const current = categories.find((c) => c.slug === slug);
const titleEl = document.getElementById('categoryTitle');
const descEl = document.getElementById('categoryDescription');
const list = document.getElementById('categoryArticles');
const links = document.getElementById('relatedCategoryLinks');

const introByCategory = {
  'threat-intelligence': 'Aktör davranışları, kampanya izleri ve operasyonel karar üretimi için tehdit istihbaratı analizleri.',
  'data-breaches': 'Veri ihlallerinin teknik nedeni, iş etkisi ve toparlanma sürecine odaklanan vaka incelemeleri.',
  vulnerabilities: 'Kritik zafiyetlerin exploitability, maruziyet ve yama önceliği perspektifiyle analiz edildiği alan.',
  ransomware: 'Ransomware operasyonlarında ilk saat müdahalesi, kriz yönetimi ve dayanıklılık yaklaşımı.',
  'dark-web': 'Dark web kaynaklı sinyallerin doğrulanması ve aksiyona çevrilmesi için araştırma içerikleri.',
  'brand-protection': 'Sahte domain, phishing ve kimlik suistimali zincirini marka riski açısından ele alan analizler.',
  'soc-detection': 'SOC operasyonlarında tespit mühendisliği, tuning stratejileri ve gürültüden sinyale geçiş rehberleri.',
  'cloud-security': 'Bulut güvenliğinde yanlış yapılandırma, erişim mimarisi ve runtime kontrol odaklı teknik içerikler.',
  'security-awareness': 'İnsan riskini azaltan ölçülebilir farkındalık ve davranış güvenliği yaklaşımları.',
  'incident-response': 'Olay müdahale hazırlığı, delil disiplini ve kontrollü geri dönüş planları.',
  'third-party-risk': 'Tedarikçi, entegrasyon ve dış bağımlılık kaynaklı saldırı yüzeyi yönetimi.',
  'turkiye-gundemi': 'Türkiye merkezli güvenlik gündemi, regülasyon ve sektör etkileri üzerine değerlendirmeler.'
};

const categoryUrl = slug ? `https://nebchat.online/category.html?slug=${encodeURIComponent(slug)}` : 'https://nebchat.online/category.html';

if (current) {
  const intro = introByCategory[current.slug] || current.description || 'NebChat kategori içeriği.';
  titleEl.textContent = current.name;
  descEl.textContent = intro;
  setSEO({ title: `${current.name} | NebChat`, description: intro, url: categoryUrl });
  setCanonical(categoryUrl);
  setRobots('index,follow');
  setJSONLD({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${current.name} | NebChat`, description: intro, url: categoryUrl }, 'categorySchema');
  setJSONLD({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://nebchat.online/' },
      { '@type': 'ListItem', position: 2, name: 'Arşiv', item: 'https://nebchat.online/archive.html' },
      { '@type': 'ListItem', position: 3, name: current.name, item: categoryUrl }
    ]
  }, 'categoryBreadcrumbSchema');
} else {
  titleEl.textContent = 'Kategori bulunamadı';
  descEl.textContent = 'İstenen kategori bulunamadı.';
  setSEO({ title: 'Kategori bulunamadı | NebChat', description: 'İstenen kategori bulunamadı.', url: categoryUrl });
  setRobots('noindex,follow');
}

const rows = await fetchArticles({ category: slug, max: 40 });
const publicError = getLastPublicArticleError();
const featured = rows.slice(0, 2);
const supporting = rows.slice(2);

if (!rows.length && publicError) {
  list.innerHTML = '<div class="notice error"><strong>Bu kategori şu anda yüklenemedi.</strong><p class="muted">Yayın sorgusunda hata oluştu, lütfen tekrar deneyin.</p></div>';
  console.error('Kategori akışı yüklenemedi:', publicError);
} else {
  list.innerHTML = featured.map((a) => `<article class="card article-card"><span class="badge">Öne çıkan</span><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('')
    + supporting.map((a) => `<article class="card article-card"><h3><a href="article.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt || '')}</p><div class="meta"><span>${a.publishedAtDate ? formatDate(a.publishedAtDate) : '—'}</span><span>${a.readingTime || 5} dk</span></div></article>`).join('')
    || '<div class="card">Bu kategoride henüz yayın yok.</div>';
}

if (links) {
  links.innerHTML = categories.filter((c) => c.slug !== slug).slice(0, 5).map((c) => `<a class="category-chip" href="category.html?slug=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)}</a>`).join('');
}
