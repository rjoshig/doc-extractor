/**
 * Convert a heading string to a kebab-case slug suitable for use as a section id.
 *
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Given a desired slug and a Set of slugs already in use, return a unique slug
 * (suffixed with -2, -3, ... if needed). Mutates the provided Set.
 *
 * @param {string} desired
 * @param {Set<string>} used
 * @returns {string}
 */
export function uniqueSlug(desired, used) {
  const base = desired || 'section';
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}
