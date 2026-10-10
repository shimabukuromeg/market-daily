import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const base = process.env.PAGES_BASE_PATH || '/';

export default defineConfig({
  site: 'https://shimabukuromeg.github.io',
  base,
  output: 'static',
  integrations: [react()],
  trailingSlash: 'always',
});
