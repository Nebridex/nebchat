import { db, serverTimestamp } from './firebase.js';
import { CATEGORY_LIST } from './content.js';
import {
  addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  return new Date(value);
};

export const markdownToHtml = (markdown = '') => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .concat('</p>');
};

function mapArticle(docSnap) {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    publishedAtDate: toDate(d.publishedAt),
    createdAtDate: toDate(d.createdAt),
    updatedAtDate: toDate(d.updatedAt),
    html: d.bodyHtml || markdownToHtml(d.bodyMarkdown || '')
  };
}



function sortByPublishedAtDesc(rows = []) {
  return [...rows].sort((a, b) => {
    const da = a.publishedAtDate ? a.publishedAtDate.getTime() : 0;
    const db = b.publishedAtDate ? b.publishedAtDate.getTime() : 0;
    return db - da;
  });
}
async function loadSeedArticlesForImportOnly() {
  const response = await fetch('./seed/articles.seed.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`seed json ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.articles) || !payload.articles.length) {
    throw new Error('seed articles dosyası boş veya hatalı');
  }
  return payload.articles;
}

export async function fetchCategories() {
  try {
    const snap = await getDocs(query(collection(db, 'categories'), where('isVisible', '==', true), orderBy('order', 'asc')));
    if (snap.empty) return CATEGORY_LIST;
    return snap.docs.map((d) => d.data());
  } catch (error) {
    console.warn('Kategori sorgusu başarısız, statik kategori listesi kullanılıyor:', error);
    return CATEGORY_LIST;
  }
}

export async function fetchArticles({ category = '', search = '', sort = 'newest', max = 24 } = {}) {
  let rows = [];
  try {
    // orderBy kaldırıldı: kompozit index bağımlılığını düşürmek için sıralama client-side yapılıyor.
    const q = query(collection(db, 'articles'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    rows = snap.docs.map(mapArticle);
  } catch (error) {
    console.warn('Makale sorgusu başarısız:', error);
    return [];
  }

  if (category) rows = rows.filter((a) => a.category === category);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((a) => [a.title, a.excerpt, ...(a.tags || [])].join(' ').toLowerCase().includes(s));
  }

  if (sort === 'popular') {
    rows.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    rows = sortByPublishedAtDesc(rows);
  }

  return rows.slice(0, max);
}

export async function fetchArticleBySlug(slug) {
  try {
    const snap = await getDocs(query(collection(db, 'articles'), where('slug', '==', slug)));
    if (snap.empty) return null;
    const matches = snap.docs.map(mapArticle).filter((a) => a.status === 'published');
    if (!matches.length) return null;
    return sortByPublishedAtDesc(matches)[0];
  } catch (error) {
    console.warn('Makale detayı sorgusu başarısız:', error);
    return null;
  }
}

export async function fetchComments(articleSlug) {
  try {
    const snap = await getDocs(query(collection(db, 'comments'), where('articleSlug', '==', articleSlug), where('status', '==', 'published'), orderBy('createdAt', 'asc'), limit(200)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtDate: toDate(d.data().createdAt) }));
  } catch (error) {
    console.warn('Yorum sorgusu başarısız:', error);
    return [];
  }
}

export async function addComment({ articleId = '', articleSlug, userId, displayName, body, parentId = null }) {
  return addDoc(collection(db, 'comments'), {
    articleId,
    articleSlug,
    parentId,
    userId,
    displayName,
    body: body.trim().slice(0, 1500),
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    likeCount: 0
  });
}

export async function incrementView(articleId) {
  if (!articleId || String(articleId).startsWith('seed-')) return;
  const ref = doc(db, 'articles', articleId);
  const snap = await getDoc(ref);
  const views = (snap.data()?.views || 0) + 1;
  await updateDoc(ref, { views });
}

export async function seedInitialDataIfEmpty() {
  const articleCheck = await getDocs(query(collection(db, 'articles'), limit(1)));
  if (!articleCheck.empty) return false;
  await Promise.all(CATEGORY_LIST.map((c, idx) => setDoc(doc(collection(db, 'categories')), { ...c, order: idx + 1, isVisible: true })));
  const seeds = await loadSeedArticlesForImportOnly();
  await Promise.all(seeds.map((a) => setDoc(doc(collection(db, 'articles')), {
    ...a,
    bodyHtml: a.bodyHtml || markdownToHtml(a.bodyMarkdown || ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    views: Math.floor(Math.random() * 1400) + 250
  })));
  return true;
}
