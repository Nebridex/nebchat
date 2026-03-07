import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

export function injectHeaderFooter() {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  if (header) {
    header.innerHTML = `
      <div class="container header-row">
        <a href="index.html" class="brand"><span class="brand-dot"></span><span class="brand-name">NebChat</span></a>
        <nav class="nav-links">
          <a href="index.html">Ana Sayfa</a>
          <a href="archive.html">Arşiv</a>
          <a href="about.html">Hakkımızda</a>
          <a href="contact.html">İletişim</a>
          <a href="profile.html" id="profileNav">Giriş</a>
          <a href="admin.html" id="adminNav" class="hidden">Editör</a>
          <button id="logoutBtn" class="hidden">Çıkış</button>
        </nav>
      </div>`;
  }
  if (footer) {
    footer.innerHTML = `
      <div class="container footer-grid">
        <div><strong>NebChat</strong><p>Türkiye odaklı siber güvenlik yayını. Tehdit analizi, ihlal incelemeleri ve operasyonel savunma rehberleri.</p></div>
        <div><strong>İçerik</strong><a href="archive.html">Tüm yazılar</a><a href="category.html?slug=threat-intelligence">Threat Intelligence</a><a href="category.html?slug=turkiye-gundemi">Türkiye Gündemi</a></div>
        <div><strong>Kurumsal</strong><a href="about.html">Editoryal yaklaşım</a><a href="contact.html">İletişim</a><a href="profile.html">Yazar girişi</a></div>
        <div><strong>Bülten</strong><p>Yeni analizler yayınlandığında ilk siz öğrenin.</p><a href="contact.html">Bültene katıl</a></div>
      </div>`;
  }
}

export function initAuthNav() {
  onAuthStateChanged(auth, async (user) => {
    const profileNav = document.getElementById('profileNav');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminNav = document.getElementById('adminNav');
    if (profileNav) profileNav.textContent = user ? 'Profil' : 'Giriş';
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !user);
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await signOut(auth);
        location.href = 'index.html';
      };
    }
    if (adminNav) adminNav.classList.toggle('hidden', !user);
  });
}

const ensureMeta = (selector, attrs) => {
  let node = document.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    document.head.appendChild(node);
  }
  return node;
};

export function setCanonical(url) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

export function setJSONLD(schema, id = 'pageSchema') {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function setSEO({ title, description, url, type = 'website' }) {
  if (title) {
    document.title = title;
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
  }
  if (description) {
    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
  }
  ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', type);
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image');
  if (url) {
    ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', url);
    setCanonical(url);
  }
}

export const formatDate = (d) => new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
export const escapeHtml = (value = '') => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
