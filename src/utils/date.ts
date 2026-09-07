/**
 * Date utilities for timezone-aware operations.
 * All datetimes are stored as UTC in PostgreSQL (TIMESTAMPTZ).
 * Conversion for display happens at the API response layer.
 */

/**
 * Convert a UTC Date to an ISO string in the given IANA timezone.
 * Example: toLocalISOString(new Date(), 'Asia/Makassar') => '2026-09-08T20:00:00+08:00'
 */
export function toLocalISOString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'shortOffset',
  })
    .format(date)
    .replace(' GMT', '');
}

/**
 * Get the start of a calendar day (00:00:00) in the given timezone, returned as UTC Date.
 */
export function startOfDayInTz(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(date); // 'YYYY-MM-DD'
  return new Date(`${localDateStr}T00:00:00.000+00:00`);
}

/**
 * Get the end of a calendar day (23:59:59.999) in the given timezone, returned as UTC Date.
 */
export function endOfDayInTz(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(date); // 'YYYY-MM-DD'
  return new Date(`${localDateStr}T23:59:59.999+00:00`);
}

/**
 * Parse a date string (YYYY-MM-DD) as start of day in the given timezone.
 */
export function parseDateInTz(dateStr: string, timezone: string): Date {
  // Create a date at midnight in the given timezone
  const dt = new Date(`${dateStr}T00:00:00.000`);
  const tzOffset = getTzOffsetMs(dateStr, timezone);
  return new Date(dt.getTime() - tzOffset);
}

/**
 * Get timezone offset in milliseconds for a given date string and IANA timezone.
 */
function getTzOffsetMs(dateStr: string, timezone: string): number {
  const utcDate = new Date(`${dateStr}T00:00:00.000Z`);
  const localStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(utcDate);

  const localDate = new Date(localStr.replace(',', ''));
  return utcDate.getTime() - localDate.getTime();
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Check if a date is a valid Date object.
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}
