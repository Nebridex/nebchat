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

function normalizeForJson(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeForJson(v);
    return out;
  }
  return value;
}

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

async function main() {
  const outputArg = process.argv[2] || 'exports/articles-export.json';
  const outputPath = path.resolve(repoRoot, outputArg);

  await ensureApp();
  const db = getFirestore();
  const snap = await db.collection('articles').get();

  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...normalizeForJson(d.data())
  }));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, articles: rows }, null, 2));

  console.log(`Export tamamlandı: ${rows.length} kayıt -> ${path.relative(repoRoot, outputPath)}`);
}

main().catch((err) => {
  console.error('Export hatası:', err?.message || err);
  process.exit(1);
});
