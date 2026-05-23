// Honestly I'm regretting not using the temporal polyfill...

/**
 * Convert a zoned date string (e.g., "2024-06-16T12:00:00Z") to a local date string (e.g., "2024-06-16T08:00").  
 * Intended for use with datetime-local inputs, which require a local date string.
 */
export function zonedToLocal(zonedDate: string | null): string | null {
    if(!zonedDate) return null;

    const date = new Date(zonedDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a local date string (e.g., "2024-06-16T08:00") to a zoned date string (e.g., "2024-06-16T12:00:00Z").  
 * Intended for use with datetime-local inputs, which require a local date string.
 */
export function localToZoned(localDate: string | null): string | null {
    if(!localDate) return null;
    
    // parse `YYYY-MM-DDTHH:mm` (value from <input type="datetime-local">) as local
    const m = localDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if(!m) return null;
    const [, y, mo, d, h, min] = m;
    const date = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(min)
    );
    return date.toISOString(); // UTC ISO string with Z
}

/**
 * Convert a date to a relative time string (e.g., "in 3 days", "2 hours ago").
 * Uses Intl.RelativeTimeFormat for localization.
 */
export function relativeTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    const units: { [key: string]: number } = {
        year: 1000 * 60 * 60 * 24 * 365,
        month: 1000 * 60 * 60 * 24 * 30,
        // Weeks aren't a very useful unit for card times
        // week: 1000 * 60 * 60 * 24 * 7,
        day: 1000 * 60 * 60 * 24,
        hour: 1000 * 60 * 60,
        minute: 1000 * 60,
        second: 1000
    };

    for(const unit in units) {
        if(Math.abs(diff) >= units[unit] || unit === 'second') {
            return rtf.format(Math.round(diff / units[unit]), unit as Intl.RelativeTimeFormatUnit);
        }
    }
    return '';
}

export function dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}
export function localDateFromDateOnly(dateOnly: string): Date {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        // Best effort
        return new Date(dateOnly);
    }
    return new Date(dateOnly + "T00:00:00");
}

/** Get a Date object representing tomorrow at 00:00 local time. */
export function tomorrowDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
}