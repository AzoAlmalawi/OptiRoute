/**
 * Resolves static asset paths relative to Vite's configured BASE_URL.
 * This guarantees proper resolution under GitHub Pages repository subpaths
 * (e.g., /OptiRoute/demo-audio/...) as well as root-level local dev (/demo-audio/...).
 */
export function getAssetUrl(relPath: string): string {
  if (!relPath) return '';
  if (
    relPath.startsWith('http://') ||
    relPath.startsWith('https://') ||
    relPath.startsWith('blob:') ||
    relPath.startsWith('data:')
  ) {
    return relPath;
  }

  const rawBase =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) ||
    '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const cleanPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;

  const baseTrimmed = rawBase.replace(/^\/|\/$/g, '');
  if (baseTrimmed && cleanPath.startsWith(baseTrimmed + '/')) {
    return `/${cleanPath}`;
  }

  return `${base}${cleanPath}`;
}
