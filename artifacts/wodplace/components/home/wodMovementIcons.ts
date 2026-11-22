/**
 * ÚNICO LUGAR del mapa de movimiento → ícono, preparado para la futura "WODPLACE Movement Library" (decisión (ab)). Hoy NO existe ningún ícono específico de movimientos en el proyecto, así que el mapa está vacío y
 * todo movimiento usa el ícono neutro y discreto (un punto): nunca un emoji ni un ícono que represente mal el movimiento. Cuando haya un ícono correcto para un movimiento, se agrega aquí, con el nombre en minúsculas.
 */
/** Nombres de Feather permitidos para un movimiento (todos existen en Feather; así este módulo se queda puro, sin importar la librería de íconos). */
export type MovementIconName = 'circle' | 'minus' | 'activity';

export const NEUTRAL_MOVEMENT_ICON: MovementIconName = 'circle';

export const MOVEMENT_ICONS: Readonly<Record<string, MovementIconName>> = {};

export function movementIconFor(movementName: string): MovementIconName {
  return MOVEMENT_ICONS[movementName.trim().toLowerCase()] ?? NEUTRAL_MOVEMENT_ICON;
}
