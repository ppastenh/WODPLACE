import type { PlatformAgreementStatus } from '@workspace/api-client-react';

export type AdminNavItem = {
  key: 'admin' | 'platform-agreement' | 'create-box';
  label: string;
  icon: 'shield' | 'file-text' | 'plus-circle';
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
 *
 * An account with NO admin role at all gets "Crear mi Box" — but only if a
 * super_admin has pre-authorized its email first
 * (box_creation_authorizations, see api-server's checkBoxCreationAuthorization
 * and the "Autorizar creación de box" section of super-admin's Boxes page).
 * Not authorized -> nothing shows here, same as "no admin role" always used
 * to mean. Authorized and used -> bootstraps a pending box + the box_admin
 * role for it (see /create-box and api-client-react's createBox()), after
 * which this same function starts returning the platform-agreement / admin
 * items above for that account.
 */
export function getAdminNavItem(
  adminStatus:
    | Pick<PlatformAgreementStatus, 'roles' | 'accepted' | 'boxCreationAuthorized'>
    | null
    | undefined,
): AdminNavItem | null {
  if (!adminStatus?.roles.length) {
    if (!adminStatus?.boxCreationAuthorized) return null;
    return { key: 'create-box', label: 'Crear mi Box', icon: 'plus-circle', route: '/create-box' };
  }
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

/**
 * Contratos Activos and Plan both have nothing to apply to before an
 * athlete actually belongs to a box (redeemed a join code) — no box's
 * contract to read/accept, and no plan assigned yet — so both stay hidden
 * until then. Admin accounts have the platform agreement instead (see
 * getAdminNavItem) regardless of box membership, so this only matters for a
 * plain athlete.
 */
export function shouldShowContracts(
  adminStatus: Pick<PlatformAgreementStatus, 'roles'> | null | undefined,
  hasBoxMembership: boolean | null,
): boolean {
  if (adminStatus?.roles.length) return false;
  return !!hasBoxMembership;
}
