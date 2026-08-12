import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { Clock3, MapPin } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { durationLabel, lectureTimeRange, startsInLabel } from "../utils/scheduleTime";
import { moderatorTabs, todayDate } from "./moderatorConfig";

function isActionable(lecture) {
  return ["scheduled", "postponed"].includes(lecture.status) && !["completed", "cancelled"].includes(lecture.live_status);
}

function LectureCard({ lecture }) {
  const content = (
    <>
      <div className="schedule-card-top">
        <span className="schedule-code">{lecture.course_code}</span>
        <span className="schedule-chip">{lecture.live_status || lecture.status}</span>
      </div>
      <h3>{lecture.course_title}</h3>
      <p><Clock3 size={13} /> {lectureTimeRange(lecture)} - {durationLabel(lecture.start_time, lecture.end_time)}</p>
      <p><MapPin size={13} /> {lecture.venue_name}</p>
      <span className="starts-label">{startsInLabel(lecture)}</span>
    </>
  );

  if (!isActionable(lecture)) {
    return <article className="today-lecture-card inactive-card">{content}</article>;
  }

  return <NavLink className="today-lecture-card" to={`/moderator/lectures/${lecture.id}`}>{content}</NavLink>;
}

export default function ModeratorToday() {
  const today = todayDate();
  const lecturesQuery = useQuery({
    queryKey: ["moderator", "today", today],
    queryFn: () => apiRequest("/lectures/my"),
    refetchOnMount: "always",
  });

  const lectures = (lecturesQuery.data?.lectures || []).filter((lecture) => lecture.date === today);

  return (
    <MobileShell tabs={moderatorTabs} homeTo="/moderator/today" profileTo="/moderator/profile" navLabel="Moderator navigation">
      <section className="page-heading">
        <p className="eyebrow">Moderator</p>
        <h1>Today</h1>
      </section>

      {lecturesQuery.isLoading ? <div className="lectureflow-loader">LectureFlow</div> : null}
      {lecturesQuery.error ? <p className="form-error">{lecturesQuery.error.message}</p> : null}
      {!lecturesQuery.isLoading && lectures.length === 0 ? <p className="state-text">No lectures fixed by you today.</p> : null}

      <section className="today-card-list">
        {lectures.map((lecture) => <LectureCard key={lecture.id} lecture={lecture} />)}
      </section>
    </MobileShell>
  );
}
