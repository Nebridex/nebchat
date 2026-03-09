#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const srcArg = process.argv[2] || 'exports/articles-export.json';
  const outArg = process.argv[3] || 'exports/articles-edit-draft.json';
  const srcPath = path.resolve(repoRoot, srcArg);
  const outPath = path.resolve(repoRoot, outArg);

  const raw = JSON.parse(await fs.readFile(srcPath, 'utf8'));
  const articles = Array.isArray(raw?.articles) ? raw.articles : raw;

  const editable = articles.map((a) => ({
    id: a.id,
    slug: a.slug || a.id,
    status: a.status || 'published',
    category: a.category || '',
    tags: Array.isArray(a.tags) ? a.tags : [],
    title: a.title || '',
    excerpt: a.excerpt || a.summary || '',
    seoTitle: a.seoTitle || a.title || '',
    seoDescription: a.seoDescription || a.excerpt || a.summary || '',
    bodyMarkdown: a.bodyMarkdown || '',
    bodyHtml: a.bodyHtml || ''
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    note: 'Bu dosyada title/excerpt/seo/body/tags/category alanlarını düzenleyin. id sabit kalmalı.',
    count: editable.length,
    articles: editable
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
  console.log(`Edit taslağı hazır: ${editable.length} kayıt -> ${path.relative(repoRoot, outPath)}`);
}

main().catch((err) => {
  console.error('Taslak üretim hatası:', err?.message || err);
  process.exit(1);
});
