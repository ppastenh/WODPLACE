/**
 * Estados de Inicio con datos INVENTADOS, solo para la pantalla de desarrollo (app/dev-home.tsx, solo __DEV__).
 * Sin llamadas al servidor ni a la base: cada grupo de chips ajusta un pedazo del objeto `HomeViewData` que dibuja
 * `HomeView`, igual que lo arma HomeScreen con datos reales. Los grupos se aplican en orden; dentro de un grupo se
 * elige una opción y los grupos se combinan. Nada de aquí llega a una build de producción (nadie lo importa fuera
 * de DevHomeScreen, que a su vez solo se carga con __DEV__).
 */
import type { HomeViewData } from '@/components/home/HomeView';

/** Imagen de ejemplo (PNG de 64x36 con degradado de la paleta, incrustada: no se pide a ninguna red). */
export const DEMO_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAIAAAC2bqvFAAABEklEQVR4nO3P+y5CAQAH4B5Ry6rFNFkswzAmw1hRRFGqVeu6atUYhpE6SiddTumkdCrllksl4hU8g/9/3xt8rAtZT0jODq9xCEUvoeRebvAiKn50S3Cl7otp+smdAVIrjOsGr/WihGEoaRSnTMNp80jaIqGsoxnbWNYxfuOcyLkmafcU7ZnOe2dufbMF/1wxIL3bmy/tLzAHi8zhUvlouXK8Uj2R3Z/Ka2er9XNFPah8CK0/hlVPxOZzRP0S1TRi2w1S+xrXvSV235OGj5SxSZlaGXMra2nnrJ+0rZO3fxWc30VXt+TuMp6fsve36mMhgAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggMD/An/XH9+ImMFB7QAAAABJRU5ErkJggg==';

export type DevDraft = HomeViewData & { unreadCount: number };

export type DevOption = { id: string; label: string; apply: (d: DevDraft) => void };
export type DevGroup = { id: string; title: string; options: DevOption[] };
export type DevSelection = Record<string, string>;

/** "Alumna típica": con box, sin reserva, sin plan, sin PRs, sin avisos, sin notificaciones. */
export function baseDraft(): DevDraft {
  return {
    user: { name: 'Camila Rojas', rank: 'rx' },
    myBox: { name: 'Box Demo', photoUrl: null },
    isOwnBirthdayToday: false,
    hasBoxMembership: true,
    hasActivePlan: false,
    myPlan: null,
    nearPlanLimit: false,
    nextClassState: 'invite',
    nextBooked: null,
    quote: 'La constancia de hoy construye la fuerza de mañana.',
    hasPendingContract: false,
    pinnedPush: null,
    todayWod: null,
    planView: { kind: 'none' },
    achievementStats: { currentStreakDays: 0 },
    rotatingFeaturedPr: null,
    medalsSummary: { totalUnlocked: 0, totalAchievements: 30, recent: [] },
    birthdays: [],
    unreadCount: 0,
  };
}

export const DEV_GROUPS: DevGroup[] = [
  {
    id: 'box',
    title: 'Box',
    options: [
      { id: 'con-box', label: 'Con box', apply: () => {} },
      {
        id: 'con-logo',
        label: 'Con logo',
        apply: (d) => {
          d.myBox = { name: 'Box Demo', photoUrl: DEMO_IMAGE };
        },
      },
      {
        id: 'nombre-largo',
        label: 'Nombre de box largo',
        apply: (d) => {
          d.myBox = { name: 'Club de Entrenamiento Funcional y Acondicionamiento Físico Cordillera', photoUrl: null };
        },
      },
      {
        id: 'sin-box',
        label: 'Sin box',
        apply: (d) => {
          d.myBox = null;
          d.hasBoxMembership = false;
        },
      },
      {
        id: 'cargando-box',
        label: 'Cargando',
        apply: (d) => {
          d.myBox = null;
          d.hasBoxMembership = null;
        },
      },
    ],
  },
  {
    id: 'campana',
    title: 'Campana',
    options: [
      { id: 'sin-notificaciones', label: 'Sin notificaciones', apply: () => {} },
      {
        id: 'tres-sin-leer',
        label: '3 sin leer',
        apply: (d) => {
          d.unreadCount = 3;
        },
      },
    ],
  },
];

export function defaultSelection(): DevSelection {
  return Object.fromEntries(DEV_GROUPS.map((g) => [g.id, g.options[0]!.id]));
}

export function buildDevState(selection: DevSelection): DevDraft {
  const draft = baseDraft();
  for (const group of DEV_GROUPS) {
    const option = group.options.find((o) => o.id === selection[group.id]) ?? group.options[0]!;
    option.apply(draft);
  }
  return draft;
}
