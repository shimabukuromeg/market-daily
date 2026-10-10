import { createLightTheme, LightTheme } from 'baseui';

// Keep all official metrics; only adapt the primary/heading families for Japanese.
const fontFamily = 'system-ui, "Noto Sans JP", sans-serif';
export const baseTheme = createLightTheme({
  typography: Object.fromEntries(
    Object.entries(LightTheme.typography).map(([name, font]) => [
      name,
      {
        ...font,
        fontFamily: name.startsWith('Mono') ? font.fontFamily : fontFamily,
      },
    ]),
  ),
});
