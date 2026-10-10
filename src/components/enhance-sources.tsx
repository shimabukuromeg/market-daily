import { createRoot } from 'react-dom/client';
import { BaseProvider } from 'baseui';
import { Accordion, Panel } from 'baseui/accordion';
import { StyledLink } from 'baseui/link';
import { Provider } from 'styletron-react';
import { Client } from 'styletron-engine-monolithic';
import { baseTheme } from '../lib/base-theme';

type XWindow = Window & {
  twttr?: {
    ready?: (callback: () => void) => void;
    widgets?: { load: (element: HTMLElement) => Promise<void> };
  };
};
let widgets: Promise<void> | undefined;
function loadWidgets() {
  widgets ??= new Promise<void>((resolve, reject) => {
    if ((window as XWindow).twttr?.widgets) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://platform.x.com/widgets.js';
    script.async = true;
    script.onload = () => {
      const api = (window as XWindow).twttr;
      if (api?.widgets) resolve();
      else if (api?.ready) api.ready(resolve);
      else reject(new Error('Preview unavailable'));
    };
    script.onerror = () => {
      widgets = undefined;
      script.remove();
      reject(new Error('Preview unavailable'));
    };
    document.head.append(script);
  });
  return widgets;
}
export function enhanceSources() {
  const engine = new Client({ prefix: 'md-sources-' });
  for (const container of document.querySelectorAll<HTMLElement>(
    '.source-accordion',
  )) {
    const summary = container.querySelector('summary')?.textContent ?? '引用元';
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a')].map(
      (link) => ({
        label: link.querySelector('span')?.textContent ?? link.textContent,
        href: link.href,
      }),
    );
    createRoot(container).render(
      <Provider value={engine}>
        <BaseProvider theme={baseTheme}>
          <Accordion stateReducer={(_type, next) => next}>
            <Panel
              title={summary}
              overrides={{
                Content: {
                  style: {
                    transitionDuration: baseTheme.animation.timing200,
                    transitionDelay: '0ms',
                  },
                },
                ContentAnimationContainer: {
                  style: { transitionDuration: baseTheme.animation.timing200 },
                },
                ToggleIcon: {
                  style: { transitionDuration: baseTheme.animation.timing200 },
                },
              }}
            >
              <ul className="source-links">
                {links.map((link) => (
                  <li key={link.href}>
                    <StyledLink
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label} ↗
                    </StyledLink>
                  </li>
                ))}
              </ul>
            </Panel>
          </Accordion>
        </BaseProvider>
      </Provider>,
    );
  }
  for (const details of document.querySelectorAll<HTMLDetailsElement>(
    '.source-previews',
  )) {
    let loaded = false;
    details.addEventListener('toggle', () => {
      if (!details.open || loaded) return;
      loaded = true;
      void loadWidgets()
        .then(() => (window as XWindow).twttr?.widgets?.load(details))
        .catch(() => {
          loaded = false;
        });
    });
  }
  const toc = document.querySelector<HTMLDetailsElement>('.article-toc');
  const desktop = matchMedia('(min-width: 1136px)');
  if (toc) {
    toc.open = desktop.matches;
    desktop.addEventListener('change', () => {
      toc.open = desktop.matches;
    });
  }
  const anchors = [
    ...document.querySelectorAll<HTMLAnchorElement>('.article-rail a'),
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          for (const anchor of anchors) {
            if (anchor.hash === `#${entry.target.id}`)
              anchor.setAttribute('aria-current', 'location');
            else anchor.removeAttribute('aria-current');
          }
        }
    },
    { rootMargin: '-10% 0px -65% 0px' },
  );
  for (const heading of document.querySelectorAll('.prose h2[id]'))
    observer.observe(heading);
}
