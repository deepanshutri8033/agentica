type AgentSchedule = {
  type?: string;
  frequency?: string;
  intervalMinutes?: number;
  time?: string;
  date?: string;
  timezone?: string;
  daysOfWeek?: string[];
  dayOfMonth?: number;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getLocalParts(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function parseTime(value?: string): { hour: number; minute: number } | null {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || hour < (meridiem ? 1 : 0)) {
    return null;
  }

  if (meridiem) {
    hour = hour % 12;
    if (meridiem === "PM") hour += 12;
  }

  return { hour, minute };
}

function localDateTimeToUtc(
  parts: LocalDateParts,
  timeZone: string
): Date {
  const desiredUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute
  );
  let result = desiredUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getLocalParts(new Date(result), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute
    );
    const difference = desiredUtc - actualAsUtc;
    if (difference === 0) break;
    result += difference;
  }

  return new Date(result);
}

function addCalendarDays(
  parts: LocalDateParts,
  days: number,
  time: { hour: number; minute: number }
): LocalDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: time.hour,
    minute: time.minute,
  };
}

function addCalendarMonths(
  parts: LocalDateParts,
  months: number,
  time: { hour: number; minute: number },
  dayOfMonth = parts.day
): LocalDateParts {
  const firstOfMonth = new Date(
    Date.UTC(parts.year, parts.month - 1 + months, 1)
  );
  const lastDay = new Date(
    Date.UTC(
      firstOfMonth.getUTCFullYear(),
      firstOfMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return {
    year: firstOfMonth.getUTCFullYear(),
    month: firstOfMonth.getUTCMonth() + 1,
    day: Math.min(dayOfMonth, lastDay),
    hour: time.hour,
    minute: time.minute,
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function getSelectedWeekdays(daysOfWeek?: string[]): number[] {
  return (daysOfWeek || [])
    .map((day) => WEEKDAY_INDEX[day.trim().toLowerCase()])
    .filter((day): day is number => day !== undefined);
}

function getWeekday(parts: LocalDateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function withMonthlyDayAnchor(
  schedule: AgentSchedule,
  referenceDate: Date = new Date()
): AgentSchedule {
  if (
    schedule.type?.toLowerCase() !== "recurring" ||
    !["monthly", "every_month"].includes((schedule.frequency || "").toLowerCase()) ||
    (Number.isInteger(schedule.dayOfMonth) &&
      schedule.dayOfMonth! >= 1 &&
      schedule.dayOfMonth! <= 31)
  ) {
    return schedule;
  }

  const timeZone = schedule.timezone || "UTC";
  return {
    ...schedule,
    dayOfMonth: getLocalParts(referenceDate, timeZone).day,
  };
}

/**
 * Return the next scheduled occurrence after `after`, interpreting the
 * configured time in its saved time zone. Manual schedules have no occurrence.
 */
export function getNextScheduledOccurrence(
  schedule?: AgentSchedule | null,
  after: Date = new Date()
): Date | null {
  if (!schedule || !Number.isFinite(after.getTime())) return null;

  const type = schedule.type?.toLowerCase();
  if (type === "manual") return null;

  const timeZone = schedule.timezone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(after);
  } catch {
    throw new Error(`Invalid schedule time zone: ${timeZone}`);
  }

  const configuredTime = parseTime(schedule.time);
  if (!configuredTime) {
    throw new Error(
      `Invalid schedule time "${schedule.time || ""}". Use HH:mm or h:mm AM/PM.`
    );
  }

  const nowParts = getLocalParts(after, timeZone);
  const frequency = (schedule.frequency || "").toLowerCase();
  const recurrenceType = type || (frequency ? "recurring" : "once");

  if (recurrenceType === "once") {
    const dateParts = schedule.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const requestedDate = dateParts
      ? {
          year: Number(dateParts[1]),
          month: Number(dateParts[2]),
          day: Number(dateParts[3]),
          hour: configuredTime.hour,
          minute: configuredTime.minute,
        }
      : {
          ...nowParts,
          hour: configuredTime.hour,
          minute: configuredTime.minute,
        };

    let occurrence = localDateTimeToUtc(requestedDate, timeZone);
    if (!schedule.date && occurrence <= after) {
      occurrence = localDateTimeToUtc(
        addCalendarDays(nowParts, 1, configuredTime),
        timeZone
      );
    }
    if (occurrence <= after) {
      throw new Error("The one-time schedule must be set in the future.");
    }
    return occurrence;
  }

  if (recurrenceType !== "recurring") {
    throw new Error(`Unsupported schedule type: ${recurrenceType}`);
  }

  const isInterval =
    ["interval", "every_interval"].includes(frequency) ||
    (!frequency && schedule.intervalMinutes !== undefined);
  if (isInterval) {
    if (
      !Number.isFinite(schedule.intervalMinutes) ||
      !schedule.intervalMinutes ||
      schedule.intervalMinutes <= 0
    ) {
      throw new Error("Interval schedules require a positive intervalMinutes value.");
    }
    return new Date(after.getTime() + schedule.intervalMinutes * 60_000);
  }

  if (["hourly", "every_hour", "1h"].includes(frequency)) {
    return new Date(after.getTime() + 60 * 60_000);
  }

  let days = 0;
  if (["weekly", "every_week"].includes(frequency)) days = 7;
  else if (!["daily", "every_day", "24h", ""].includes(frequency)) {
    if (!["monthly", "every_month"].includes(frequency)) {
      throw new Error(`Unsupported recurring frequency: ${frequency}`);
    }
  } else if (frequency === "") {
    days = 1;
  }

  const isMonthly = ["monthly", "every_month"].includes(frequency);
  if (isMonthly) {
    const dayOfMonth =
      Number.isInteger(schedule.dayOfMonth) &&
      schedule.dayOfMonth! >= 1 &&
      schedule.dayOfMonth! <= 31
        ? schedule.dayOfMonth!
        : nowParts.day;
    const thisMonth = localDateTimeToUtc(
      addCalendarMonths(nowParts, 0, configuredTime, dayOfMonth),
      timeZone
    );
    return thisMonth > after
      ? thisMonth
      : localDateTimeToUtc(
          addCalendarMonths(nowParts, 1, configuredTime, dayOfMonth),
          timeZone
        );
  }

  if (days === 7) {
    const selectedDays = getSelectedWeekdays(schedule.daysOfWeek);
    if (schedule.daysOfWeek?.length && selectedDays.length === 0) {
      throw new Error("Weekly schedule has no valid daysOfWeek values.");
    }
    const weekdays = selectedDays.length
      ? selectedDays
      : [getWeekday(nowParts)];

    for (let offset = 0; offset <= 7; offset += 1) {
      const candidateParts = addCalendarDays(nowParts, offset, configuredTime);
      const candidate = localDateTimeToUtc(candidateParts, timeZone);
      if (weekdays.includes(getWeekday(candidateParts)) && candidate > after) {
        return candidate;
      }
    }
    throw new Error("Unable to calculate the next weekly schedule occurrence.");
  }

  const today = localDateTimeToUtc(
    { ...nowParts, ...configuredTime },
    timeZone
  );
  return today > after
    ? today
    : localDateTimeToUtc(addCalendarDays(nowParts, 1, configuredTime), timeZone);
}

/**
 * Calculate the next recurrence from the prior scheduled instant.
 */
export function calculateNextOccurrence(
  currentScheduledFor: Date,
  schedule?: AgentSchedule | null
): Date | null {
  if (!schedule || schedule.type?.toLowerCase() !== "recurring") return null;

  const frequency = (schedule.frequency || "").toLowerCase();
  const isInterval =
    ["interval", "every_interval"].includes(frequency) ||
    (!frequency && schedule.intervalMinutes !== undefined);
  if (isInterval) {
    if (
      !Number.isFinite(schedule.intervalMinutes) ||
      !schedule.intervalMinutes ||
      schedule.intervalMinutes <= 0
    ) {
      throw new Error("Interval schedules require a positive intervalMinutes value.");
    }
    return new Date(
      currentScheduledFor.getTime() + schedule.intervalMinutes * 60_000
    );
  }
  if (["hourly", "every_hour", "1h"].includes(frequency)) {
    return new Date(currentScheduledFor.getTime() + 60 * 60_000);
  }

  const days = ["weekly", "every_week"].includes(frequency)
    ? 7
    : ["daily", "every_day", "24h", ""].includes(frequency)
      ? 1
      : 0;
  const isMonthly = ["monthly", "every_month"].includes(frequency);
  if (!days && !isMonthly) {
    throw new Error(`Unsupported recurring frequency: ${frequency}`);
  }

  const timeZone = schedule.timezone || "UTC";
  const time = parseTime(schedule.time);
  if (!time) {
    throw new Error(
      `Invalid schedule time "${schedule.time || ""}". Use HH:mm or h:mm AM/PM.`
    );
  }

  try {
    const parts = getLocalParts(currentScheduledFor, timeZone);
    if (isMonthly) {
      const dayOfMonth =
        Number.isInteger(schedule.dayOfMonth) &&
        schedule.dayOfMonth! >= 1 &&
        schedule.dayOfMonth! <= 31
          ? schedule.dayOfMonth!
          : parts.day;
      return localDateTimeToUtc(
        addCalendarMonths(parts, 1, time, dayOfMonth),
        timeZone
      );
    }

    if (days === 7) {
      const selectedDays = getSelectedWeekdays(schedule.daysOfWeek);
      if (schedule.daysOfWeek?.length && selectedDays.length === 0) {
        throw new Error("Weekly schedule has no valid daysOfWeek values.");
      }
      const weekdays = selectedDays.length
        ? selectedDays
        : [getWeekday(parts)];
      for (let offset = 1; offset <= 7; offset += 1) {
        const nextParts = addCalendarDays(parts, offset, time);
        if (weekdays.includes(getWeekday(nextParts))) {
          return localDateTimeToUtc(nextParts, timeZone);
        }
      }
      throw new Error("Unable to calculate the next weekly schedule occurrence.");
    }

    return localDateTimeToUtc(addCalendarDays(parts, days, time), timeZone);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid schedule")) {
      throw error;
    }
    throw new Error(`Invalid schedule time zone: ${timeZone}`);
  }
}
