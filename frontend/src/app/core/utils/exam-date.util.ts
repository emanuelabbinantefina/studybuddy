function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : toStartOfDay(raw);
  }

  const match = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const parsed = new Date(String(raw));
  if (Number.isNaN(parsed.getTime())) return null;
  return toStartOfDay(parsed);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return toStartOfDay(next);
}

function buildMonthDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

const FIXED_ITALIAN_HOLIDAYS = new Map<string, string>([
  ['01-01', 'Capodanno'],
  ['01-06', 'Epifania'],
  ['04-25', 'Festa della Liberazione'],
  ['05-01', 'Festa del Lavoro'],
  ['06-02', 'Festa della Repubblica'],
  ['08-15', 'Ferragosto'],
  ['11-01', 'Ognissanti'],
  ['12-08', 'Immacolata Concezione'],
  ['12-25', 'Natale'],
  ['12-26', 'Santo Stefano'],
]);

export function getItalianOfficialHolidayName(raw: string | Date | null | undefined): string {
  const date = parseDateOnly(raw);
  if (!date) return '';

  const fixedHoliday = FIXED_ITALIAN_HOLIDAYS.get(buildMonthDayKey(date));
  if (fixedHoliday) return fixedHoliday;

  const easterMonday = addDays(calculateEasterSunday(date.getFullYear()), 1);
  if (easterMonday.getTime() === date.getTime()) {
    return "Lunedi dell'Angelo";
  }

  return '';
}

export function getItalianExamDateValidationMessage(
  raw: string | Date | null | undefined,
  disallowPast = false
): string {
  const examDate = parseDateOnly(raw);
  if (!examDate) return 'Data esame non valida';

  if (disallowPast) {
    const today = toStartOfDay(new Date());
    if (examDate.getTime() < today.getTime()) {
      return 'Non puoi inserire una data esame nel passato';
    }
  }

  const day = examDate.getDay();
  if (day === 6) return 'Gli esami non possono essere fissati di sabato';
  if (day === 0) return 'Gli esami non possono essere fissati di domenica';

  const holidayName = getItalianOfficialHolidayName(examDate);
  if (holidayName) {
    return `Gli esami non possono essere fissati in una festivita italiana ufficiale (${holidayName})`;
  }

  return '';
}

export function getNextAllowedItalianExamDateIso(raw?: string | Date | null): string {
  let date = parseDateOnly(raw || new Date()) || toStartOfDay(new Date());

  while (getItalianExamDateValidationMessage(date, true)) {
    date = addDays(date, 1);
  }

  return formatDateIso(date);
}
