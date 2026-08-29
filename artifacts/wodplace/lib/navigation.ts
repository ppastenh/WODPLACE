import type { WodplaceUser } from '@/context/AuthContext';

/**
 * The current app represents navigation permissions through the account
 * rank. "Administrador" is supported for accounts provisioned by an admin,
 * while it is intentionally not part of the athlete-facing rank picker.
 */
export function canAccessAdminNavigation(
  user: Pick<WodplaceUser, 'rank'> | null | undefined,
): boolean {
  return user?.rank === 'Coach' || user?.rank === 'Administrador';
}