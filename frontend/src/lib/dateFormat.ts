// File: frontend/src/lib/dateFormat.ts
// Purpose: Spanish-Argentina date formatters used across the UI.
// Functionality: Converts UTC ISO strings (as returned by the backend) to
// the Argentina time-zone (UTC-3) and renders the short labels used by
// match cards ("Vie 12/06 · 16:00") and the fixture's day headers
// ("Viernes, 12 de junio").
// Role: Shared by the Predicciones, Fixture and admin Resultados screens.

// Short weekday labels used in match cards. Matches the mockup wording
// exactly so the UI mirrors the design without further tweaks.
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// Maps the English short weekday Intl returns (Sun, Mon, …) to our index.
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type ArDateParts = {
  weekday: number;
  day: number;
  month: number;
  year: number;
  hour: string;
  minute: string;
};

// Extracts every date component we need for a given instant, all in the
// Argentina time-zone. Using `en-US` for the source format keeps the
// weekday short names predictable; we map them through WEEKDAY_INDEX
// before applying our Spanish labels.
function toArgentinaParts(input: string | Date): ArDateParts {
  const date = typeof input === 'string' ? new Date(input) : input;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const weekdayShort = get('weekday');
  // Intl with hour12=false can sometimes return "24" — normalise to "00"
  // so the value plays well in 24h displays.
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return {
    weekday: WEEKDAY_INDEX[weekdayShort] ?? 0,
    day: parseInt(get('day'), 10),
    month: parseInt(get('month'), 10),
    year: parseInt(get('year'), 10),
    hour,
    minute: get('minute'),
  };
}

// "Vie 12/06" used by the match-card eyebrow.
export function formatShortDate(input: string | Date): string {
  const p = toArgentinaParts(input);
  return `${WEEKDAYS_SHORT[p.weekday]} ${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`;
}

// "16:00" — kickoff time in Argentina hours.
export function formatTime(input: string | Date): string {
  const p = toArgentinaParts(input);
  return `${p.hour}:${p.minute}`;
}

// "Viernes, 12 de junio" used by the Fixture screen as a day header.
export function formatDayHeader(input: string | Date): string {
  const p = toArgentinaParts(input);
  return `${WEEKDAYS_LONG[p.weekday]}, ${p.day} de ${MONTHS_LONG[p.month - 1]}`;
}

// Returns a stable bucket key (YYYY-MM-DD in Argentina time) used to group
// fixture matches by day before rendering.
export function dayKey(input: string | Date): string {
  const p = toArgentinaParts(input);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
