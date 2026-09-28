import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import './tweet-preview.css';
export const metadata: Metadata = { title: '株の観測日誌 | Market Daily', description: 'Xの株リストをもとに、市場の話題、注目銘柄、異なる見方を出典付きで整理する日刊ニュースレター。' };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="ja"><body>{children}<Script src="https://platform.x.com/widgets.js" strategy="afterInteractive" /></body></html>; }
