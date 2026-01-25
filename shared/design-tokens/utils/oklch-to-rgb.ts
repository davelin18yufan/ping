import { oklch, formatRgb } from 'culori';

/**
 * Converts OKLCH color string to RGB format for React Native compatibility
 *
 * @param oklchString - OKLCH color string (e.g., "oklch(0.5 0.2 180)")
 * @returns RGB color string (e.g., "rgb(128, 200, 150)")
 *
 * @example
 * ```ts
 * oklchToRgb('oklch(1 0 0)') // returns 'rgb(255, 255, 255)'
 * oklchToRgb('oklch(0.5 0.2 180)') // returns 'rgb(0, 200, 180)'
 * ```
 */
export function oklchToRgb(oklchString: string): string {
  const color = oklch(oklchString);

  if (!color) {
    console.warn(`Invalid OKLCH color: ${oklchString}`);
    return 'rgba(0, 0, 0, 1)';
  }

  return formatRgb(color);
}

/**
 * Converts OKLCH color string to RGBA format with custom alpha
 *
 * @param oklchString - OKLCH color string
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color string
 *
 * @example
 * ```ts
 * oklchToRgba('oklch(1 0 0)', 0.5) // returns 'rgba(255, 255, 255, 0.5)'
 * ```
 */
export function oklchToRgba(oklchString: string, alpha: number): string {
  const color = oklch(oklchString);

  if (!color) {
    console.warn(`Invalid OKLCH color: ${oklchString}`);
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const rgb = formatRgb(color);
  // Convert "rgb(r, g, b)" to "rgba(r, g, b, alpha)"
  return rgb.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
}
