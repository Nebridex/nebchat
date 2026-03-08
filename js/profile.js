import { auth, db } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { collection, getDocs, limit, orderBy, query, where } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { fetchArticleBySlug } from './data.js';

injectHeaderFooter();
initAuthNav();

const guestView = document.getElementById('guestView');
const memberView = document.getElementById('memberView');
const registerPanel = document.getElementById('registerPanel');
const openRegisterBtn = document.getElementById('openRegisterBtn');

const status = document.getElementById('authStatus');
const userBox = document.getElementById('userBox');
const signOutBtn = document.getElementById('signOutBtn');
const savedWrap = document.getElementById('savedArticles');
const laterWrap = document.getElementById('readLaterArticles');
const commentsWrap = document.getElementById('recentComments');
const weeklyPref = document.getElementById('newsletterWeekly');
const breakingPref = document.getElementById('newsletterBreaking');
const prefsStatus = document.getElementById('prefsStatus');

const urlMode = new URLSearchParams(location.search).get('mode');

const show = (msg, type = '') => {
  if (!status) return;
  status.className = `notice ${type}`;
  status.textContent = msg;
};

const setAuthView = (isLoggedIn) => {
  guestView.classList.toggle('hidden', isLoggedIn);
  memberView.classList.toggle('hidden', !isLoggedIn);
  document.title = isLoggedIn ? 'Profilim | NebChat' : "NebChat'e Giriş Yap | NebChat";
};

const openRegister = () => {
  registerPanel.classList.remove('hidden');
  registerPanel.setAttribute('aria-hidden', 'false');
  registerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

if (urlMode === 'register' || location.hash === '#register') {
  openRegister();
}

openRegisterBtn?.addEventListener('click', openRegister);

const renderLibrary = async (key, mount) => {
  const slugs = JSON.parse(localStorage.getItem(key) || '[]');
  if (!slugs.length) {
    mount.innerHTML = '<p class="muted">Henüz içerik eklenmedi.</p>';
    return;
  }
  const cards = await Promise.all(slugs.slice(0, 10).map(async (slug) => {
    const article = await fetchArticleBySlug(slug);
    if (!article) return '';
    return `<a class="card" href="article.html?slug=${encodeURIComponent(article.slug)}"><strong>${article.title}</strong><p class="muted">${article.excerpt || ''}</p></a>`;
  }));
  mount.innerHTML = cards.join('') || '<p class="muted">İçerik bulunamadı.</p>';
};

const loadPrefs = () => {
  const prefs = JSON.parse(localStorage.getItem('nebchat-newsletter-prefs') || '{}');
  weeklyPref.checked = Boolean(prefs.weekly);
  breakingPref.checked = Boolean(prefs.breaking);
};

document.getElementById('savePrefsBtn')?.addEventListener('click', () => {
  localStorage.setItem('nebchat-newsletter-prefs', JSON.stringify({ weekly: weeklyPref.checked, breaking: breakingPref.checked }));
  prefsStatus.textContent = 'Tercihleriniz kaydedildi.';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { email, password, name } = e.target;
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await updateProfile(cred.user, { displayName: name.value });
  show('Kayıt tamamlandı. Profilinize hoş geldiniz.', 'ok');
  e.target.reset();
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { email, password } = e.target;
  await signInWithEmailAndPassword(auth, email.value, password.value);
  show('Giriş başarılı. Üye paneliniz hazır.', 'ok');
  e.target.reset();
});

signOutBtn.onclick = async () => { await signOut(auth); };

onAuthStateChanged(auth, async (u) => {
  setAuthView(Boolean(u));

  if (!u) {
    userBox.innerHTML = '';
    return;
  }

  userBox.innerHTML = `<strong>${u.displayName || 'NebChat Üyesi'}</strong><p class="muted">${u.email}</p><p class="muted">Kendi analizlerini yayınlayabilir, yorum yapabilir ve içerik listelerini yönetebilirsin.</p>`;
  await renderLibrary('nebchat-saved', savedWrap);
  await renderLibrary('nebchat-read-later', laterWrap);
  loadPrefs();

  try {
    const snap = await getDocs(query(collection(db, 'comments'), where('userId', '==', u.uid), orderBy('createdAt', 'desc'), limit(10)));
    commentsWrap.innerHTML = snap.docs.map((d) => {
      const c = d.data();
      return `<div class="card"><strong>${c.articleSlug}</strong><p class="muted">${c.body || ''}</p></div>`;
    }).join('') || '<p class="muted">Henüz yorum yok.</p>';
  } catch (error) {
    commentsWrap.innerHTML = '<p class="muted">Yorum geçmişi yüklenemedi.</p>';
  }
});
