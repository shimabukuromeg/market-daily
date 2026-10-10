import { baseTheme } from './base-theme';

// Resolve the installed Base Web theme at build time for Astro's static surfaces.
export { baseTheme };
const groups = {
  color: baseTheme.colors,
  motion: baseTheme.animation,
  space: baseTheme.sizing,
  radius: Object.fromEntries(
    Object.entries(baseTheme.borders).filter(([key]) =>
      key.startsWith('radius'),
    ),
  ),
};
export const themeVariables = Object.entries(groups)
  .flatMap(([group, tokens]) =>
    Object.entries(tokens).flatMap(([key, value]) =>
      typeof value === 'string' ? [`--base-${group}-${key}: ${value};`] : [],
    ),
  )
  .join('\n');

export const typographyVariables = Object.entries(baseTheme.typography)
  .flatMap(([name, font]) =>
    Object.entries(font).flatMap(([property, value]) =>
      typeof value === 'string' || typeof value === 'number'
        ? [`--base-type-${name}-${property}: ${value};`]
        : [],
    ),
  )
  .join('\n');
