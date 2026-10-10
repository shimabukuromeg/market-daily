import { useEffect, useRef, useState } from 'react';
import { BaseProvider } from 'baseui';
import { Button, KIND, SIZE } from 'baseui/button';
import { Provider } from 'styletron-react';
import { Client } from 'styletron-engine-monolithic';

import { baseTheme as theme } from '../lib/base-theme';
export default function BaseShareActions({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [engine] = useState(() => new Client());
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('コピーしました');
    } catch {
      setStatus('コピーできませんでした。アドレスバーからコピーしてください。');
    }
    timer.current = setTimeout(() => setStatus(''), 4000);
  }
  const xUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: title, url })}`;
  return (
    <Provider value={engine}>
      <BaseProvider theme={theme}>
        <div className="share-controls">
          <Button
            $as="a"
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            size={SIZE.compact}
            startEnhancer={() => <span aria-hidden="true">𝕏</span>}
          >
            Xでシェア
          </Button>
          <Button kind={KIND.secondary} size={SIZE.compact} onClick={copy}>
            リンクをコピー
          </Button>
        </div>
        <output
          className="share-status"
          style={{ color: theme.colors.contentSecondary }}
        >
          {status}
        </output>
      </BaseProvider>
    </Provider>
  );
}
