import { defineConfig } from 'astro/config';

const base = process.env.PAGES_BASE_PATH || '/';

export default defineConfig({
  site: 'https://shimabukuromeg.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
});
