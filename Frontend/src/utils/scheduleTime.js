export function buildHourOptions() {
  const options = [];

  for (let hour = 7; hour <= 20; hour += 1) {
    const value = String(hour).padStart(2, "0");
    options.push({ value, label: formatClock(`${value}:00`).replace(":00", "") });
  }

  return options;
}

export function buildMinuteOptions() {
  return ["00", "15", "30", "45"];
}

export function toTimeValue(hour, minute) {
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

export function formatClock(time) {
  const [hourRaw, minuteRaw = "00"] = String(time || "").slice(0, 5).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time || "";

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function durationLabel(startTime, endTime) {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);

  if (start === null || end === null || end <= start) return "Duration unavailable";

  const total = end - start;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!hours) return `${minutes} mins`;
  if (!minutes) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`;
}

export function startsInLabel(lecture) {
  if (lecture.live_status === "ongoing") return "Live now";

  const start = lectureDateTime(lecture.date, lecture.start_time);
  const end = lectureDateTime(lecture.date, lecture.end_time);
  const now = new Date();

  if (!start) return "Start time unavailable";
  if (end && now > end) return "Ended";

  const diffMinutes = Math.ceil((start.getTime() - now.getTime()) / 60000);

  if (diffMinutes <= 0) return "Starting now";
  if (diffMinutes < 60) return `Live in ${diffMinutes} mins`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (!minutes) return `Live in ${hours} hr${hours > 1 ? "s" : ""}`;
  return `Live in ${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`;
}

export function lectureTimeRange(lecture) {
  return `${formatClock(lecture.start_time)} to ${formatClock(lecture.end_time)}`;
}

function minutesFromTime(time) {
  const [hourRaw, minuteRaw = "00"] = String(time || "").slice(0, 5).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function lectureDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${String(time).slice(0, 5)}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}
