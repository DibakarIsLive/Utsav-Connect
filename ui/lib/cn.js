/**
 * Join class names while ignoring falsey values.
 * Small local helper so components do not need an extra dependency.
 *
 * @param {...(string | false | null | undefined)} values
 * @returns {string}
 */
export function cn(...values) {
  return values.filter(Boolean).join(" ");
}
