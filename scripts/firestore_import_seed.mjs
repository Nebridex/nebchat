#!/usr/bin/env node
import fs from 'node:fs/promises';

const API_KEY = 'AIzaSyBAwFSe0pud59OXpx1G5hQO9opA1f7Eg9Y';
const PROJECT_ID = 'nebchat2';
const DATABASE = '(default)';

const argCount = Number(process.argv[2] || '10');
const importCount = Number.isFinite(argCount) && argCount > 0 ? argCount : 10;

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`;

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') {
    // Bu alanlar seed'te ISO string olarak tutuluyor olabilir.
    if (/At$/.test(currentField) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return { timestampValue: new Date(value).toISOString() };
    return { stringValue: value };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      currentField = k;
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

let currentField = '';

function articleToDocument(article) {
  const now = new Date().toISOString();
  const normalized = {
    ...article,
    status: article.status || 'published',
    createdAt: article.createdAt || now,
    updatedAt: article.updatedAt || now,
    publishedAt: article.publishedAt || now,
    views: typeof article.views === 'number' ? article.views : 0,
    likeCount: typeof article.likeCount === 'number' ? article.likeCount : 0
  };

  const fields = {};
  for (const [key, value] of Object.entries(normalized)) {
    currentField = key;
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

async function upsertArticle(article) {
  const slug = article.slug || article.title?.toLowerCase().replace(/\s+/g, '-') || `article-${Date.now()}`;
  const url = `${base}/articles/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const payload = articleToDocument(article);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Article upsert failed (${slug}): ${res.status} ${txt}`);
  }
  return res.json();
}

async function upsertCategories() {
  const contentRaw = await fs.readFile('js/content.js', 'utf8');
  const arrMatch = contentRaw.match(/export const CATEGORY_LIST = (\[[\s\S]*?\]);/);
  if (!arrMatch) return 0;
  const categoryList = Function(`"use strict"; return (${arrMatch[1]});`)();

  let count = 0;
  for (const [idx, c] of categoryList.entries()) {
    const doc = {
      slug: c.slug,
      name: c.name,
      description: c.description,
      order: idx + 1,
      isVisible: true
    };
    const url = `${base}/categories/${encodeURIComponent(c.slug)}?key=${API_KEY}`;
    const fields = {};
    for (const [k, v] of Object.entries(doc)) {
      currentField = k;
      fields[k] = toFirestoreValue(v);
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Category upsert failed (${c.slug}): ${res.status} ${txt}`);
    }
    count += 1;
  }
  return count;
}

async function main() {
  const raw = await fs.readFile('seed/articles.seed.json', 'utf8');
  const payload = JSON.parse(raw);
  const selected = (payload.articles || []).slice(0, importCount);
  if (!selected.length) throw new Error('Seed dosyasında makale yok.');

  const catCount = await upsertCategories();
  let articleCount = 0;
  for (const a of selected) {
    await upsertArticle(a);
    articleCount += 1;
  }

  const listUrl = `${base}/articles?pageSize=50&key=${API_KEY}`;
  const listRes = await fetch(listUrl);
  const listData = listRes.ok ? await listRes.json() : {};
  const total = (listData.documents || []).length;

  console.log(`Imported categories: ${catCount}`);
  console.log(`Imported/updated articles: ${articleCount}`);
  console.log(`Current visible article docs (pageSize 50): ${total}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
