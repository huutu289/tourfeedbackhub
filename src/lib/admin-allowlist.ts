const ADMIN_EMAILS = [
  "huutu289@gmail.com",
  "iposntmk@gmail.com",
];

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminAllowlist(): string[] {
  return [...ADMIN_EMAILS];
}
