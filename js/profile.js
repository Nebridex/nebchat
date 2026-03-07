import { auth } from './firebase.js';
import { injectHeaderFooter, initAuthNav } from './common.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

injectHeaderFooter();
initAuthNav();

const status = document.getElementById('authStatus');
const userBox = document.getElementById('userBox');
const signOutBtn = document.getElementById('signOutBtn');

const show = (msg, type = '') => {
  status.className = `notice ${type}`;
  status.textContent = msg;
};

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { email, password, name } = e.target;
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await updateProfile(cred.user, { displayName: name.value });
  show('Kayıt tamamlandı.', 'ok');
  e.target.reset();
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { email, password } = e.target;
  await signInWithEmailAndPassword(auth, email.value, password.value);
  show('Giriş başarılı.', 'ok');
  e.target.reset();
});

signOutBtn.onclick = async () => { await signOut(auth); };

onAuthStateChanged(auth, (u) => {
  userBox.innerHTML = u ? `<strong>${u.displayName || 'NebChat Kullanıcısı'}</strong><p class="muted">${u.email}</p>` : '<p class="muted">Giriş yapılmadı.</p>';
});
