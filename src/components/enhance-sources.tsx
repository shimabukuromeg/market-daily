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
