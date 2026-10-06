/**
 * Calculate the next scheduled run time based on the agent's schedule configuration.
 */
export function calculateNextOccurrence(
  currentScheduledFor: Date,
  schedule?: {
    type?: string;
    frequency?: string;
    intervalMinutes?: number;
    time?: string;
    cron?: string;
  } | null
): Date | null {
  if (!schedule) return null;

  // Check if recurring schedule
  const isRecurring =
    schedule.type?.toLowerCase() === "recurring" ||
    Boolean(schedule.frequency) ||
    Boolean(schedule.intervalMinutes) ||
    Boolean(schedule.cron);

  if (!isRecurring) {
    return null;
  }

  const baseTime = new Date(currentScheduledFor).getTime();
  if (isNaN(baseTime)) return null;

  // Custom interval minutes
  if (schedule.intervalMinutes && schedule.intervalMinutes > 0) {
    return new Date(baseTime + schedule.intervalMinutes * 60 * 1000);
  }

  const freq = (schedule.frequency || "").toLowerCase();

  switch (freq) {
    case "every_15_mins":
    case "15m":
      return new Date(baseTime + 15 * 60 * 1000);
    case "every_30_mins":
    case "30m":
      return new Date(baseTime + 30 * 60 * 1000);
    case "hourly":
    case "every_hour":
    case "1h":
      return new Date(baseTime + 60 * 60 * 1000);
    case "daily":
    case "every_day":
    case "24h":
      return new Date(baseTime + 24 * 60 * 60 * 1000);
    case "weekly":
    case "every_week":
      return new Date(baseTime + 7 * 24 * 60 * 60 * 1000);
    default:
      // Default to 24 hours if frequency is unknown or recurring without interval
      return new Date(baseTime + 24 * 60 * 60 * 1000);
  }
}
