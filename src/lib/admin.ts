export const ADMIN_EMAIL = 'priyanshu.sjce@gmail.com';

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
