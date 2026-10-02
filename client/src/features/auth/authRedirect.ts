/** Where to go after login/register: the page ProtectedRoute bounced the user from, or the map. */
export function getRedirect(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  // Only same-app paths — never "//evil.com"
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}
