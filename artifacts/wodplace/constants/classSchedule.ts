export type ClassType = 'Crossfit' | 'GAP' | 'Halterofilia' | 'Movilidad';

export interface ClassTemplate {
  time: string; // "HH:mm"
  durationMin: number;
  type: ClassType;
  coach: string;
  capacity: number;
}

export const DAILY_TEMPLATE: ClassTemplate[] = [
  { time: '06:00', durationMin: 60, type: 'Crossfit', coach: 'Juanito Pérez', capacity: 12 },
  { time: '07:15', durationMin: 60, type: 'Crossfit', coach: 'Juanita Pérez', capacity: 12 },
  { time: '12:00', durationMin: 45, type: 'GAP', coach: 'Camila Soto', capacity: 16 },
  { time: '17:00', durationMin: 45, type: 'Movilidad', coach: 'Ignacio Vera', capacity: 10 },
  { time: '18:00', durationMin: 60, type: 'Crossfit', coach: 'Matías Reyes', capacity: 12 },
  { time: '19:15', durationMin: 60, type: 'GAP', coach: 'Juanita Pérez', capacity: 16 },
  { time: '20:15', durationMin: 60, type: 'Crossfit', coach: 'Juanito Pérez', capacity: 12 },
];

export const ATTENDEE_POOL: string[] = [
  'Pía Pastén',
  'Diego Fuentes',
  'Camila Rojas',
  'Tomás Herrera',
  'Fernanda Silva',
  'Sebastián Muñoz',
  'Valentina Castro',
  'Cristóbal Araya',
  'Josefa Vargas',
  'Nicolás Contreras',
  'Antonia Sepúlveda',
  'Benjamín Torres',
  'Martina González',
  'Vicente Morales',
  'Isidora Flores',
  'Joaquín Espinoza',
  'Constanza Núñez',
  'Rodrigo Peña',
  'Francisca Bravo',
  'Álvaro Cárdenas',
  'Trinidad Soto',
  'Felipe Aguilar',
  'Javiera Riquelme',
  'Gaspar Ortiz',
];

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSessionId(dateKey: string, time: string): string {
  return `${dateKey}_${time}`;
}

/** Deterministic count of attendees already booked by other athletes. */
export function getBaseAttendeeCount(sessionId: string, capacity: number): number {
  const h = hashString(sessionId);
  // Bias towards mostly-open classes, with an occasional full class.
  const raw = h % (capacity + 4);
  return Math.min(raw, capacity);
}

export function getBaseAttendeeNames(sessionId: string, count: number): string[] {
  const h = hashString(sessionId + '_names');
  const pool = ATTENDEE_POOL;
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (h + i * 7919) % pool.length;
    const candidate = pool[idx] ?? pool[0] ?? 'Alumno WODPLACE';
    if (!names.includes(candidate)) {
      names.push(candidate);
    } else {
      const fallback = pool[(idx + 1) % pool.length] ?? candidate;
      names.push(fallback);
    }
  }
  return names;
}
