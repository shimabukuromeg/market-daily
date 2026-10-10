// Brief feedback only; results remain readable immediately and never await motion.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Map<HTMLElement, Animation>();
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  for (const animation of running.values()) animation.cancel();
  running.clear();
});
export function animateFeedback(element: HTMLElement) {
  running.get(element)?.cancel();
  if (reducedMotion.matches || !element.animate) return;
  const tokens = getComputedStyle(document.documentElement);
  const animation = element.animate(
    [
      { opacity: 0.65, transform: 'translateY(2px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    {
      duration:
        parseFloat(tokens.getPropertyValue('--base-motion-timing200')) || 200,
      easing:
        tokens.getPropertyValue('--base-motion-easeOutQuinticCurve').trim() ||
        'ease-out',
    },
  );
  running.set(element, animation);
  void animation.finished
    .catch(() => {})
    .finally(() => {
      if (running.get(element) === animation) running.delete(element);
    });
}
