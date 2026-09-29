import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = new URL('../public/og/market-daily.png', import.meta.url);
await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7f9fc"/>
      <stop offset="1" stop-color="#eaf4ff"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1976d2"/>
      <stop offset="1" stop-color="#55a7ef"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#background)"/>
  <circle cx="1080" cy="-20" r="280" fill="#d9ebff"/>
  <circle cx="1140" cy="60" r="150" fill="#c7e1ff"/>
  <rect x="72" y="64" width="1056" height="502" rx="28" fill="#ffffff" stroke="#dfe3e8" stroke-width="2"/>
  <rect x="72" y="64" width="14" height="502" rx="7" fill="url(#accent)"/>
  <text x="132" y="162" fill="#1976d2" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="5">DAILY MARKET BRIEFING</text>
  <text x="132" y="278" fill="#17202d" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="800" letter-spacing="-3">Market Daily</text>
  <text x="132" y="354" fill="#17202d" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700">Ideas, signals, and what to verify next.</text>
  <line x1="132" y1="418" x2="1068" y2="418" stroke="#dfe3e8" stroke-width="2"/>
  <text x="132" y="486" fill="#687386" font-family="Arial, Helvetica, sans-serif" font-size="27">Investment ideas curated daily from selected voices on X</text>
  <text x="1048" y="528" text-anchor="end" fill="#1976d2" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">MARKET-DAILY</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(output));
console.log(`Generated ${output.pathname}`);
