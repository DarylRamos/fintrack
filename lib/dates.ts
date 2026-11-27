// Calendar dates (YYYY-MM-DD) for display. A calendar date has no time zone, so it is formatted as
// that day in UTC and never shifts. "27 Nov 2026", the format the Settings page uses. Shared by server
// and browser; no secrets.

const calendarDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCalendarDate(isoDate: string): string {
  return calendarDateFormat.format(new Date(`${isoDate}T00:00:00.000Z`));
}
