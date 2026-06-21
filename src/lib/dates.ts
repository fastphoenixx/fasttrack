/** Today as YYYY-MM-DD (UTC slice — matches how log_date is stored). */
export const today = (): string => new Date().toISOString().slice(0, 10)

/** YYYY-MM-DD for n days before today. */
export const daysAgo = (n: number): string =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
