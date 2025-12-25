
/**
 * Converts a year, month, day to Julian Day Number (JDN)
 * Handles BC years (e.g., year 0 is 1 BC, -1 is 2 BC)
 */
export const dateToJDN = (year: number, month: number, day: number): number => {
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};

/**
 * Parses the specific date strings provided in the input CSV
 * Formats: "0-01-10 07:34:47", "-3974-07-25 16:41:19"
 */
export const parseEclipseDate = (dateStr: string) => {
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(-?\d+)-(\d{1,2})-(\d{1,2})/);
  
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : "00:00:00";

  return { year, month, day, time };
};

/**
 * Normalizes astronomical year to human-friendly year
 */
export const formatYear = (y: number): string => {
  if (y < 1) return `BC ${Math.abs(y - 1)}`;
  return `AD ${y}`;
};

/**
 * Formats date into "AD/BC YYYY-MM-DD" style as requested by the user
 */
export const formatUnifiedDate = (year: number, month: number, day: number): string => {
  const prefix = year < 1 ? 'BC' : 'AD';
  const absYear = year < 1 ? Math.abs(year - 1) : year;
  const yearStr = absYear.toString().padStart(4, '0');
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  return `${prefix} ${yearStr}-${monthStr}-${dayStr}`;
};

export const formatFullDate = (e: { year: number, month: number, day: number }) => {
  const monthStr = e.month.toString().padStart(2, '0');
  const dayStr = e.day.toString().padStart(2, '0');
  return `${formatYear(e.year)}-${monthStr}-${dayStr}`;
};
