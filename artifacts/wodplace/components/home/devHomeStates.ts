/**
 * Estados de Inicio con datos INVENTADOS, solo para la pantalla de desarrollo (app/dev-home.tsx, solo __DEV__).
 * Sin llamadas al servidor ni a la base: cada grupo de chips ajusta un pedazo del objeto `HomeViewData` que dibuja
 * `HomeView`, igual que lo arma HomeScreen con datos reales. Los grupos se aplican en orden; dentro de un grupo se
 * elige una opción y los grupos se combinan. Nada de aquí llega a una build de producción (nadie lo importa fuera
 * de DevHomeScreen, que a su vez solo se carga con __DEV__).
 */
import type { BoxAnnouncement, MyPlan, TodayWod } from '@workspace/api-client-react';
import type { HomeViewData } from '@/components/home/HomeView';
import type { ClassSession } from '@/context/BookingContext';
import { toDateKey } from '@/lib/dateUtils';
import { NO_COACH_LABEL } from '@/lib/nextClassCard';
import { planProgressView } from '@/lib/planProgress';

/** Imagen de ejemplo (PNG de 64x36 con degradado de la paleta, incrustada: no se pide a ninguna red). */
export const DEMO_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAIAAAC2bqvFAAABEklEQVR4nO3P+y5CAQAH4B5Ry6rFNFkswzAmw1hRRFGqVeu6atUYhpE6SiddTumkdCrllksl4hU8g/9/3xt8rAtZT0jODq9xCEUvoeRebvAiKn50S3Cl7otp+smdAVIrjOsGr/WihGEoaRSnTMNp80jaIqGsoxnbWNYxfuOcyLkmafcU7ZnOe2dufbMF/1wxIL3bmy/tLzAHi8zhUvlouXK8Uj2R3Z/Ka2er9XNFPah8CK0/hlVPxOZzRP0S1TRi2w1S+xrXvSV235OGj5SxSZlaGXMra2nnrJ+0rZO3fxWc30VXt+TuMp6fsve36mMhgAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggMD/An/XH9+ImMFB7QAAAABJRU5ErkJggg==';

/** unreadCount = punto de la campana; popup = popup "Aviso importante" abierto (lo dibuja DevHomeScreen, no HomeView). */
export type DevDraft = HomeViewData & { unreadCount: number; popup: boolean };

const AVISO: BoxAnnouncement = {
  id: 'aviso-demo',
  title: 'Cambio de horario del sábado',
  body: 'Este sábado la clase de las 10:00 pasa a las 09:00. Trae agua y tu toalla; nos vemos en el box.',
  imageUrl: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  readByMe: false,
  reactions: [],
  myReaction: null,
  commentCount: 0,
};
/** Aviso del popup: el mismo contenido que el fijo "con imagen". */
export const DEMO_ANNOUNCEMENT: BoxAnnouncement = { ...AVISO, imageUrl: DEMO_IMAGE };

const TODAY_WOD: TodayWod = {
  wodOfDayId: 'wod-dia-demo',
  wodId: 'wod-demo',
  name: 'Fran',
  format: 'for_time',
  timeCapMinutes: 10,
  description: '21-15-9 de thrusters (43 kg) y dominadas. Lo más rápido que puedas con buena técnica.',
  notes: null,
  sessionDate: '2026-01-01',
  myResult: null,
};

function planDemo(over: Partial<MyPlan>): MyPlan {
  return {
    id: 'plan-demo',
    name: 'Plan demo',
    price: 45000,
    durationDays: 30,
    classesPerPeriod: 8,
    benefits: [],
    isFeatured: false,
    isSubscribed: true,
    daysUntilRenewal: 15,
    classesUsedInPeriod: 5,
    classesRemaining: 3,
    classesCompletedInPeriod: 3,
    classesReservedInPeriod: 2,
    ...over,
  };
}

/** Plan activo con datos ya cargados; calcula la vista igual que HomeScreen. */
function withPlan(d: DevDraft, plan: MyPlan) {
  d.hasActivePlan = true;
  d.myPlan = plan;
  d.planView = planProgressView({ hasActivePlan: true, planLoading: false, plan });
}

function bookedSession(coach: string): ClassSession {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(7, 0, 0, 0);
  return {
    id: 'sesion-demo',
    date: start,
    dateKey: toDateKey(start),
    type: 'CrossFit',
    coach,
    startMinutes: 420,
    endMinutes: 480,
    startDate: start,
    durationLabel: '60 min',
    durationMin: 60,
    capacity: 12,
    isBooked: true,
    remaining: 5,
    hasStarted: false,
    hasEnded: false,
    canCancel: true,
    isWaitlisted: false,
    waitlistPosition: null,
    attendeeNames: [],
    notes: null,
    level: 'todos',
  };
}

/** Cumpleaños dentro de n días (mes y día reales de esa fecha; nunca año ni edad). */
function birthdayIn(name: string, days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { name, month: d.getMonth() + 1, day: d.getDate(), daysUntil: days };
}

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
    popup: false,
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
    id: 'cumpleanos',
    title: 'Cumpleaños',
    options: [
      { id: 'sin', label: 'Sin cumpleaños', apply: () => {} },
      {
        id: 'hoy',
        label: 'Cumpleaños hoy',
        apply: (d) => {
          d.isOwnBirthdayToday = true;
        },
      },
      {
        id: 'lista',
        label: 'Lista de cumpleaños',
        apply: (d) => {
          d.birthdays = [
            birthdayIn('Valentina Soto', 0),
            birthdayIn('Matías Pérez', 3),
            birthdayIn('Constanza Muñoz Henríquez de la Fuente', 5),
          ];
        },
      },
    ],
  },
  {
    id: 'proxima-clase',
    title: 'Próxima clase',
    options: [
      { id: 'sin-reserva', label: 'Sin reserva', apply: () => {} },
      {
        id: 'cargando',
        label: 'Cargando',
        apply: (d) => {
          d.nextClassState = 'loading';
        },
      },
      {
        id: 'con-coach',
        label: 'Con reserva con coach',
        apply: (d) => {
          d.nextClassState = 'booked';
          d.nextBooked = bookedSession('Andrés Vidal');
        },
      },
      {
        id: 'sin-coach',
        label: 'Con reserva sin coach',
        apply: (d) => {
          d.nextClassState = 'booked';
          d.nextBooked = bookedSession(NO_COACH_LABEL);
        },
      },
    ],
  },
  {
    id: 'contrato',
    title: 'Contrato',
    options: [
      { id: 'sin', label: 'Sin contrato pendiente', apply: () => {} },
      {
        id: 'pendiente',
        label: 'Contrato pendiente',
        apply: (d) => {
          d.hasPendingContract = true;
        },
      },
    ],
  },
  {
    id: 'aviso',
    title: 'Aviso fijo',
    options: [
      { id: 'sin', label: 'Sin aviso', apply: () => {} },
      {
        id: 'sin-imagen',
        label: 'Aviso sin imagen',
        apply: (d) => {
          d.pinnedPush = AVISO;
        },
      },
      {
        id: 'con-imagen',
        label: 'Aviso con imagen',
        apply: (d) => {
          d.pinnedPush = DEMO_ANNOUNCEMENT;
        },
      },
    ],
  },
  {
    id: 'popup',
    title: 'Popup de aviso',
    options: [
      { id: 'cerrado', label: 'Cerrado', apply: () => {} },
      {
        id: 'abierto',
        label: 'Abierto',
        apply: (d) => {
          d.popup = true;
        },
      },
    ],
  },
  {
    id: 'plan',
    title: 'Plan',
    options: [
      { id: 'sin-plan', label: 'Sin plan', apply: () => {} },
      {
        id: 'ilimitado',
        label: 'Plan ilimitado',
        apply: (d) =>
          withPlan(
            d,
            planDemo({
              classesPerPeriod: null,
              classesUsedInPeriod: null,
              classesRemaining: null,
              classesCompletedInPeriod: 0,
              classesReservedInPeriod: 1,
              daysUntilRenewal: 20,
            }),
          ),
      },
      { id: 'con-clases', label: 'Plan por cantidad', apply: (d) => withPlan(d, planDemo({})) },
      {
        id: 'por-vencer',
        label: 'Plan por vencer',
        apply: (d) => {
          withPlan(
            d,
            planDemo({
              classesUsedInPeriod: 7,
              classesRemaining: 1,
              classesCompletedInPeriod: 6,
              classesReservedInPeriod: 1,
              daysUntilRenewal: 3,
            }),
          );
          d.nearPlanLimit = true;
        },
      },
      {
        id: 'cargando',
        label: 'Cargando plan',
        apply: (d) => {
          d.hasActivePlan = true;
          d.myPlan = null;
          d.planView = planProgressView({ hasActivePlan: true, planLoading: true, plan: null });
        },
      },
    ],
  },
  {
    id: 'wod',
    title: 'WOD de hoy',
    options: [
      { id: 'sin', label: 'Sin WOD', apply: () => {} },
      {
        id: 'sin-registrar',
        label: 'WOD sin registrar',
        apply: (d) => {
          d.todayWod = TODAY_WOD;
        },
      },
      {
        id: 'registrado',
        label: 'WOD registrado',
        apply: (d) => {
          d.todayWod = {
            ...TODAY_WOD,
            myResult: { timeSeconds: 245, rounds: null, reps: null, level: 'rx', notes: null },
          };
        },
      },
    ],
  },
  {
    id: 'pr',
    title: 'PR destacado',
    options: [
      { id: 'vacio', label: 'PR vacío', apply: () => {} },
      {
        id: 'con-marca',
        label: 'PR con marca',
        apply: (d) => {
          d.rotatingFeaturedPr = { liftName: 'Peso muerto', weightKg: 140 };
        },
      },
    ],
  },
  {
    id: 'racha',
    title: 'Racha',
    options: [
      { id: 'cero', label: 'Racha 0', apply: () => {} },
      {
        id: 'doce',
        label: 'Racha 12',
        apply: (d) => {
          d.achievementStats = { currentStreakDays: 12 };
        },
      },
    ],
  },
  {
    id: 'medallas',
    title: 'Medallas',
    options: [
      { id: 'cero', label: 'Medallas 0', apply: () => {} },
      {
        id: 'varias',
        label: 'Medallas varias',
        apply: (d) => {
          d.medalsSummary = {
            totalUnlocked: 6,
            totalAchievements: 30,
            recent: [{ id: 'pr_first', icon: 'award', name: 'Primer PR' }],
          };
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
