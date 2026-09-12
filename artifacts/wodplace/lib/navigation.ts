import type { PlatformAgreementStatus } from '@workspace/api-client-react';

export type AdminNavItem = {
  key: 'admin' | 'platform-agreement';
  label: string;
  icon: 'shield' | 'file-text';
  route: string;
};

/**
 * What (if anything) to show in place of the admin-only nav slot, driven by
 * the account's real role — resolved server-side via the profiles/user_roles
 * email bridge (see api-server's lib/adminRole.ts), never guessed
 * client-side. Someone with no admin role gets nothing: the item simply
 * doesn't exist for them, same as before.
 *
 * A box_admin who hasn't accepted the platform agreement gets a different
 * item pointing at that acceptance screen instead of straight into the
 * admin panel — this is what actually hides "Administrador" until they
 * accept (point 2 of the platform-agreement design). super_admin is exempt
 * (see routes/platformAgreement.ts) and always gets "Administrador".
 */
export function getAdminNavItem(
  adminStatus: Pick<PlatformAgreementStatus, 'roles' | 'accepted'> | null | undefined,
): AdminNavItem | null {
  if (!adminStatus?.roles.length) return null;
  if (!adminStatus.accepted) {
    return {
      key: 'platform-agreement',
      label: 'Acuerdo de Plataforma',
      icon: 'file-text',
      route: '/platform-agreement',
    };
  }
  return { key: 'admin', label: 'Administrador', icon: 'shield', route: '/admin-login' };
}
