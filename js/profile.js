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

const loggedOutView = document.getElementById('loggedOutView');
const loggedInView = document.getElementById('loggedInView');
const registerPanel = document.getElementById('registerPanel');
const openRegisterBtn = document.getElementById('openRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

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

const firebaseErrorMap = {
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/wrong-password': 'E-posta veya şifre hatalı.',
  'auth/user-not-found': 'Bu kullanıcı bulunamadı.',
  'auth/invalid-email': 'Geçerli bir e-posta adresi girin.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/email-already-in-use': 'Bu e-posta zaten kullanımda.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.'
};

const mapFirebaseError = (error) => firebaseErrorMap[error?.code] || 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.';

const showInline = (el, msg, type = 'error') => {
  if (!el) return;
  el.className = `notice ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
};

const hideInline = (el) => {
  if (!el) return;
  el.textContent = '';
  el.className = 'notice hidden';
};

const show = (msg, type = '') => {
  if (!status) return;
  status.className = `notice ${type}`;
  status.textContent = msg;
};

const setAuthView = (isLoggedIn) => {
  console.info('[profile] view switch', { isLoggedIn });
  loggedOutView.classList.toggle('hidden', isLoggedIn);
  loggedInView.classList.toggle('hidden', !isLoggedIn);
  document.title = isLoggedIn ? 'Profilim | NebChat' : "NebChat'e Giriş Yap | NebChat";
};

const openRegister = () => {
  console.info('[profile] register CTA clicked');
  registerPanel.classList.remove('hidden');
  registerPanel.setAttribute('aria-hidden', 'false');
  openRegisterBtn?.setAttribute('aria-expanded', 'true');
  registerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

if (urlMode === 'register' || location.hash === '#register') openRegister();
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

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideInline(registerMessage);
  const { email, password, name } = e.target;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await updateProfile(cred.user, { displayName: name.value });
    showInline(registerMessage, 'Kayıt tamamlandı. Profilinize yönlendiriliyorsunuz.', 'ok');
    e.target.reset();
    console.info('[profile] register success');
  } catch (error) {
    console.warn('[profile] register failure', error?.code || error);
    showInline(registerMessage, mapFirebaseError(error), 'error');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideInline(loginMessage);
  const { email, password } = e.target;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    showInline(loginMessage, 'Giriş başarılı. Üye paneliniz yükleniyor.', 'ok');
    e.target.reset();
    console.info('[profile] login success');
  } catch (error) {
    console.warn('[profile] login failure', error?.code || error);
    showInline(loginMessage, mapFirebaseError(error), 'error');
  }
});

signOutBtn.onclick = async () => {
  await signOut(auth);
  console.info('[profile] sign out');
};

onAuthStateChanged(auth, async (u) => {
  console.info('[profile] auth state changed', { uid: u?.uid || null });
  setAuthView(Boolean(u));

  if (!u) {
    userBox.innerHTML = '';
    show('Üye paneli için giriş yapın.');
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

  show('Üye paneline hoş geldiniz.', 'ok');
});
