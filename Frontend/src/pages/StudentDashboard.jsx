import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock3, MapPin, UserRound } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { durationLabel, lectureTimeRange, startsInLabel } from "../utils/scheduleTime";
import { studentTabs } from "./studentConfig";

function statusClass(lecture) {
  if (lecture.live_status === "ongoing") return "live";
  if (lecture.live_status === "cancelled" || lecture.status === "cancelled") return "cancelled";
  return "scheduled";
}

function StatusDot({ lecture }) {
  if (lecture.status === "postponed") return null;
  return <span className={`event-dot ${statusClass(lecture)}`} aria-hidden="true" />;
}

function statusLabel(lecture) {
  if (lecture.status === "postponed") return "Rescheduled";
  if (lecture.status === "cancelled" || lecture.live_status === "cancelled") return "Cancelled";
  return startsInLabel(lecture);
}

function VenueQueue({ lecture }) {
  const venueId = lecture?.venue_id;
  const lectureDate = lecture?.date;
  const queueQuery = useQuery({
    queryKey: ["student", "venue-queue", venueId, lectureDate],
    queryFn: () => apiRequest(`/student/venues/${venueId}/queue?date=${lectureDate}`),
    enabled: Boolean(venueId && lectureDate),
  });

  if (!lecture) return <p className="state-text">Tap a lecture to check its venue.</p>;
  if (queueQuery.isLoading) return <div className="lectureflow-loader">LectureFlow</div>;
  if (queueQuery.error) return <p className="form-error">{queueQuery.error.message}</p>;

  const data = queueQuery.data;
  const current = data?.current_lecture;
  const lectures = data?.lectures || [];

  return (
    <section className="venue-context student-venue-context">
      <div className="panel-title-row compact">
        <div>
          <p className="eyebrow">{data?.queue_date}</p>
          <h2>{data?.venue?.name || "Venue"}</h2>
        </div>
        <span className="schedule-chip">{data?.venue_status || "free"}</span>
      </div>

      <div className="venue-live-box">
        <strong>{current ? `${current.course_code} - ${current.course_title}` : "No ongoing lecture"}</strong>
        {current ? <p>{lectureTimeRange(current)} - {data.remaining_minutes} mins left</p> : <p>Free right now</p>}
      </div>

      {lectures.length === 0 ? <p className="state-text">No lectures for this venue on this day.</p> : null}
      <div className="student-venue-strip">
        {lectures.map((item) => (
          <article className="student-venue-card" key={item.id}>
            <div className="schedule-card-top">
              <span className="schedule-code"><StatusDot lecture={item} />{item.course_code}</span>
              <span className="schedule-chip">{statusLabel(item)}</span>
            </div>
            <h3>{item.course_title}</h3>
            <p><Clock3 size={13} /> {lectureTimeRange(item)}</p>
            <p><UserRound size={13} /> {item.lecturer_name}</p>
            <p><BookOpen size={13} /> {item.department_name}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  const [selectedLecture, setSelectedLecture] = useState(null);

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures"],
    queryFn: () => apiRequest("/student/lectures"),
  });

  const lectures = lecturesQuery.data?.lectures || [];

  return (
    <MobileShell tabs={studentTabs} homeTo="/student/dashboard" profileTo="/student/profile" navLabel="Student navigation">
      <section className="page-heading">
        <p className="eyebrow">Student</p>
        <h1>Dashboard</h1>
      </section>

      <section className="student-summary-card">
        <p className="eyebrow">Schedule</p>
        <h2>{lecturesQuery.data?.count || 0} upcoming lectures</h2>
        <p className="muted">Filtered by your department, level, and current semester.</p>
      </section>

      {lecturesQuery.isLoading ? <div className="lectureflow-loader">LectureFlow</div> : null}
      {lecturesQuery.error ? <p className="form-error">{lecturesQuery.error.message}</p> : null}
      {!lecturesQuery.isLoading && lectures.length === 0 ? <p className="state-text">No lectures available for your profile.</p> : null}

      <section className="today-card-list">
        {lectures.map((lecture) => (
          <button
            className={selectedLecture?.id === lecture.id ? "student-lecture-card active" : "student-lecture-card"}
            key={lecture.id}
            type="button"
            onClick={() => setSelectedLecture(lecture)}
          >
            <div className="schedule-card-top">
              <span className="schedule-code"><StatusDot lecture={lecture} />{lecture.course_code}</span>
              <span className="schedule-chip">{statusLabel(lecture)}</span>
            </div>
            <h3>{lecture.course_title}</h3>
            <p><BookOpen size={13} /> {lecture.course_type}</p>
            <p><Clock3 size={13} /> {lectureTimeRange(lecture)} - {durationLabel(lecture.start_time, lecture.end_time)}</p>
            <p><MapPin size={13} /> {lecture.venue_name}</p>
            <p><UserRound size={13} /> {lecture.lecturer_name}</p>
          </button>
        ))}
      </section>

      <VenueQueue lecture={selectedLecture} />
    </MobileShell>
  );
}
