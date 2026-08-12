import { CalendarDays, ClipboardList, UserRound } from "lucide-react";

export const moderatorTabs = [
  { to: "/moderator/today", label: "Today", icon: CalendarDays },
  { to: "/moderator/dashboard", label: "Schedule", icon: ClipboardList },
  { to: "/moderator/profile", label: "Profile", icon: UserRound },
];

export function todayDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}
