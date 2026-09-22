/**
 * Enterprise Time Formatting & Conversion Utilities (12-Hour AM/PM Standard)
 */

export interface Time12Components {
  hour12: string; // '01' through '12'
  minute: string; // '00' through '59'
  period: 'AM' | 'PM';
}

/**
 * Parses any 24h string ("HH:mm" or "HH:mm:ss") into 12-hour components.
 */
export function parseTo12Hour(time24?: string | null): Time12Components {
  if (!time24 || typeof time24 !== 'string') {
    return { hour12: '09', minute: '00', period: 'AM' };
  }

  const trimmed = time24.trim();
  // Check if it already has AM/PM
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    if (h < 1) h = 12;
    if (h > 12) h = 12;
    return {
      hour12: String(h).padStart(2, '0'),
      minute: ampmMatch[2],
      period: ampmMatch[3].toUpperCase() as 'AM' | 'PM'
    };
  }

  // Expecting "HH:mm" or "HH:mm:ss"
  const parts = trimmed.split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) h = 9;
  const m = (parts[1] || '00').slice(0, 2).padStart(2, '0');

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour12: String(h12).padStart(2, '0'),
    minute: m,
    period
  };
}

/**
 * Converts 12-hour components back into standard 24-hour "HH:mm" for APIs and DB storage.
 */
export function to24Hour(hour12: string | number, minute: string | number, period: 'AM' | 'PM'): string {
  let h = typeof hour12 === 'string' ? parseInt(hour12, 10) : hour12;
  if (isNaN(h) || h < 1) h = 12;
  if (h > 12) h = 12;

  const m = String(minute).padStart(2, '0');

  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Formats 24h string, ISO date, or timestamp into 12-hour AM/PM format ("hh:mm AM/PM").
 * E.g. "18:00" -> "06:00 PM", "09:30" -> "09:30 AM", "13:45" -> "01:45 PM"
 */
export function formatTime12(timeVal?: string | Date | null): string {
  if (!timeVal) return '—';

  if (timeVal instanceof Date) {
    return timeVal.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const str = String(timeVal).trim();
  if (!str) return '—';

  // Already formatted with AM/PM
  if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) {
    return str;
  }

  // ISO format timestamp like "2026-09-22T08:15:30.000Z"
  if (str.includes('T') || str.includes('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  // Standard "HH:mm" or "HH:mm:ss"
  if (str.includes(':')) {
    const { hour12, minute, period } = parseTo12Hour(str);
    return `${hour12}:${minute} ${period}`;
  }

  return str;
}

/**
 * Formats a shift window into 12-hour format ("09:00 AM - 06:00 PM").
 */
export function formatShiftWindow(start: string = '09:00', end: string = '18:00'): string {
  return `${formatTime12(start)} - ${formatTime12(end)}`;
}
