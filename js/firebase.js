import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBAwFSe0pud59OXpx1G5hQO9opA1f7Eg9Y',
  authDomain: 'nebchat2.firebaseapp.com',
  projectId: 'nebchat2',
  storageBucket: 'nebchat2.firebasestorage.app',
  messagingSenderId: '46979426016',
  appId: '1:46979426016:web:fd1fbe341fff6970ae9285'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp };
