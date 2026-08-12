import { deleteCacheKeys } from "./cache.js";

function formatDateForCache(date) {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIME_ZONE || "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getStudentLecturesCacheKey({
  department_id,
  level,
  semester,
  mode,
  date,
}) {
  const studentGroup = `v2:lectures:dept:${department_id}:level:${level}:sem:${semester}`;

  if (mode === "date") {
    return `${studentGroup}:date:${formatDateForCache(date)}`;
  }

  return `${studentGroup}:upcoming:${formatDateForCache(date)}`;
}

export async function clearStudentLecturesCache({
  department_id,
  level,
  semester,
  dates = [],
}) {
  const today = getTodayDate();

  const keys = [
    getStudentLecturesCacheKey({
      department_id,
      level,
      semester,
      mode: "upcoming",
      date: today,
    }),
    ...dates.map((date) =>
      getStudentLecturesCacheKey({
        department_id,
        level,
        semester,
        mode: "date",
        date,
      }),
    ),
  ];

  return deleteCacheKeys(keys);
}

