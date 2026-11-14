export function canUseSandbox(
  user: { role: string; status: string; email: string } | null,
  allowedEmail = process.env.SANDBOX_ADMIN_EMAIL
) {
  const email = allowedEmail?.trim().toLowerCase();
  return Boolean(email && user?.role === "ADMIN" && user.status === "ACTIVE" && user.email.toLowerCase() === email);
}
