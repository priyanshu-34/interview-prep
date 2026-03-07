/** Admin email from env (VITE_ADMIN_EMAIL). If unset, no user is treated as admin. */
const ADMIN_EMAIL =
  typeof import.meta.env?.VITE_ADMIN_EMAIL === 'string'
    ? import.meta.env.VITE_ADMIN_EMAIL.trim()
    : '';

export function isAdmin(email: string | null | undefined): boolean {
  return !!ADMIN_EMAIL && email != null && email.trim() === ADMIN_EMAIL;
}
