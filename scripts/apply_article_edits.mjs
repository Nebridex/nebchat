#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const firebaseConfigPath = path.join(repoRoot, 'js', 'firebase.js');

async function readProjectIdFromConfig() {
  const src = await fs.readFile(firebaseConfigPath, 'utf8');
  const match = src.match(/projectId:\s*'([^']+)'/);
  if (!match) throw new Error('projectId js/firebase.js içinden okunamadı.');
  return match[1];
}

async function ensureApp() {
  if (getApps().length) return getApps()[0];
  const projectId = await readProjectIdFromConfig();

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(key), projectId });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

function safeString(v, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback;
}

async function main() {
  const srcArg = process.argv[2] || 'exports/articles-edit-draft.json';
  const srcPath = path.resolve(repoRoot, srcArg);

  const raw = JSON.parse(await fs.readFile(srcPath, 'utf8'));
  const rows = Array.isArray(raw?.articles) ? raw.articles : [];
  if (!rows.length) throw new Error('Uygulanacak makale bulunamadı.');

  await ensureApp();
  const db = getFirestore();
  const now = Timestamp.now();

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const id = safeString(row.id);
    if (!id) {
      failed += 1;
      continue;
    }

    const payload = {
      title: safeString(row.title, 'Başlıksız Makale'),
      excerpt: safeString(row.excerpt),
      seoTitle: safeString(row.seoTitle, safeString(row.title, 'NebChat Makale')),
      seoDescription: safeString(row.seoDescription, safeString(row.excerpt)),
      category: safeString(row.category, 'turkiye-gundemi'),
      tags: Array.isArray(row.tags) ? row.tags.map((x) => String(x).trim()).filter(Boolean) : [],
      bodyMarkdown: safeString(row.bodyMarkdown),
      bodyHtml: safeString(row.bodyHtml),
      status: safeString(row.status, 'pending_review'),
      updatedAt: now
    };

    try {
      await db.collection('articles').doc(id).set(payload, { merge: true });
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`FAILED ${id}:`, err?.message || err);
    }
  }

  console.log(`Apply tamamlandı. updated=${updated}, failed=${failed}`);
  if (failed > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error('Apply hatası:', err?.message || err);
  process.exit(1);
});
