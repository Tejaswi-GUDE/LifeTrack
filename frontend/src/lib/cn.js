/**
 * Tiny classname joiner — avoids a `clsx`/`classnames` dependency for the
 * foundation. Accepts strings, arrays, and falsy values.
 *   cn('a', cond && 'b', ['c', null]) -> 'a b c'
 */
export function cn(...parts) {
  return parts
    .flat(Infinity)
    .filter((p) => typeof p === 'string' && p.length > 0)
    .join(' ');
}
