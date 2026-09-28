import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../dist/client/', import.meta.url);
const rootPath = fileURLToPath(root).replace(/\/$/, '');
const base = process.env.PAGES_BASE_PATH ?? '';

async function htmlFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const url = new URL(
        entry.name + (entry.isDirectory() ? '/' : ''),
        folder,
      );
      return entry.isDirectory()
        ? htmlFiles(url)
        : entry.name.endsWith('.html')
          ? [url]
          : [];
    }),
  );
  return nested.flat();
}

const pages = await htmlFiles(root);
for (const path of pages) {
  let html = await readFile(path, 'utf8');
  // This publication is read-only: remove hydration scripts, but retain the X
  // widget that upgrades server-rendered fallback cards to official embeds.
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) =>
      /\bsrc=["']https:\/\/platform\.x\.com\/widgets\.js["']/.test(tag)
        ? tag
        : '',
    )
    .replace(/<link\b[^>]*(?:rel="modulepreload"|as="script")[^>]*>/gi, '');
  if (base)
    html = html.replace(
      /(href|src)="\/(?!\/)/g,
      (_, attribute) => `${attribute}="${base}/`,
    );
  await writeFile(path, html);

  const file = fileURLToPath(path);
  if (dirname(file) === rootPath && basename(file) !== 'index.html') {
    const folder = join(dirname(file), basename(file, extname(file)));
    await mkdir(folder, { recursive: true });
    await rename(file, join(folder, 'index.html'));
  }
}

console.log(`Static publication ready (${pages.length} pages)`);
