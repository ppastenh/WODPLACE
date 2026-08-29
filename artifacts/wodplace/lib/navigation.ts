import type { WodplaceUser } from '@/context/AuthContext';

// Test account provisioned as an administrator for this environment.
const ADMIN_EMAILS = new Set(['pasten.hueche@gmail.com']);

/**
 * The current app represents navigation permissions through the account
 * rank. "Administrador" is supported for accounts provisioned by an admin,
 * while it is intentionally not part of the athlete-facing rank picker.
 */
export function canAccessAdminNavigation(
  user: Pick<WodplaceUser, 'rank' | 'email'> | null | undefined,
): boolean {
  return (
    user?.rank === 'Coach' ||
    user?.rank === 'Administrador' ||
    ADMIN_EMAILS.has(user?.email.trim().toLowerCase() ?? '')
  );
}