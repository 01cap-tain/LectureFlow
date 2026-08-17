import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  StickyNote,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import {
  buildHourOptions,
  buildMinuteOptions,
  durationLabel,
  lectureTimeRange,
  startsInLabel,
  toTimeValue,
} from "../utils/scheduleTime";
import { moderatorTabs, todayDate } from "./moderatorConfig";

const initialForm = {
  course_id: "",
  venue_id: "",
  date: todayDate(),
  start_hour: "",
  start_minute: "00",
  end_hour: "",
  end_minute: "00",
  notes: "",
};

const hourOptions = buildHourOptions();
const minuteOptions = buildMinuteOptions();
const scheduleDraftKey = "lectureflow:moderator:schedule-draft";

function readScheduleDraft() {
  try {
    const storedDraft = window.sessionStorage.getItem(scheduleDraftKey);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch (_) {
    return null;
  }
}

function writeScheduleDraft(draft) {
  try {
    window.sessionStorage.setItem(scheduleDraftKey, JSON.stringify(draft));
  } catch (_) {
    // Draft persistence should never block scheduling if browser storage is unavailable.
  }
}

function clearScheduleDraft() {
  try {
    window.sessionStorage.removeItem(scheduleDraftKey);
  } catch (_) {
    // Browser storage failures are ignored because the submitted lecture is already handled by the API.
  }
}

function hasDraftInput(draft) {
  return Boolean(
    draft.course_id ||
      draft.venue_id ||
      draft.date !== initialForm.date ||
      draft.start_hour ||
      draft.end_hour ||
      draft.notes,
  );
}

function VenueContext({ venueId }) {
  const venueQueue = useQuery({
    queryKey: ["moderator", "venue-queue", venueId],
    queryFn: () => apiRequest(`/lectures/venues/${venueId}/queue`),
    enabled: Boolean(venueId),
  });

  if (!venueId) return null;
  if (venueQueue.isLoading)
    return (
      <div className="venue-context">
        <div className="lectureflow-loader">LectureFlow</div>
      </div>
    );
  if (venueQueue.error)
    return <p className="form-error">{venueQueue.error.message}</p>;

  const current = venueQueue.data?.current_lecture;
  const lectures = venueQueue.data?.lectures || [];
  const byTime = lectures.reduce((groups, lecture) => {
    const key = lecture.date;
    groups[key] = groups[key] || [];
    groups[key].push(lecture);
    return groups;
  }, {});

  return (
    <section className="venue-context">
      <div className="panel-title-row compact">
        <h2>Venue schedule</h2>
      </div>
      <div className="venue-live-box">
        <span className="schedule-chip">
          {current ? "Occupied" : "Free now"}
        </span>
        <strong>
          {current
            ? `${current.course_code} - ${current.course_title}`
            : "No ongoing lecture"}
        </strong>
        {current ? (
          <p>
            {lectureTimeRange(current)} - {current.lecturer_name}
          </p>
        ) : null}
      </div>

      {Object.entries(byTime).length === 0 ? (
        <p className="state-text">No upcoming queue for this venue.</p>
      ) : null}
      {Object.entries(byTime).map(([date, items]) => (
        <div className="venue-time-group" key={date}>
          <p className="eyebrow">{date}</p>
          {items.map((lecture) => (
            <div className="venue-time-row" key={lecture.id}>
              <span>{lectureTimeRange(lecture)}</span>
              <strong>{lecture.course_code}</strong>
              <small>{lecture.lecturer_name}</small>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function ModeratorDashboard() {
  const queryClient = useQueryClient();
  const upcomingSectionRef = useRef(null);
  const upcomingStripRef = useRef(null);
  const draftLoadedRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [draftRestored, setDraftRestored] = useState(false);
  const [toast, setToast] = useState(null);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiRequest("/profile/me"),
  });
  const coursesQuery = useQuery({
    queryKey: ["moderator", "courses"],
    queryFn: () => apiRequest("/lectures/courses/my"),
  });
  const venuesQuery = useQuery({
    queryKey: ["moderator", "venues"],
    queryFn: () => apiRequest("/lectures/venues"),
  });
  const lecturesQuery = useQuery({
    queryKey: ["moderator", "lectures"],
    queryFn: () => apiRequest("/lectures/my?upcoming=true"),
  });

  const courses = coursesQuery.data?.courses || [];
  const venues = venuesQuery.data?.venues || [];
  const lectures = lecturesQuery.data?.lectures || [];
  const lecturerName = profileQuery.data?.profile?.name || "You";

  useEffect(() => {
    const savedDraft = readScheduleDraft();
    draftLoadedRef.current = true;

    if (!savedDraft) return;

    setForm((current) => ({ ...current, ...savedDraft }));
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftLoadedRef.current) return;

    if (!hasDraftInput(form)) {
      clearScheduleDraft();
      return;
    }

    writeScheduleDraft(form);
  }, [form]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const section = upcomingSectionRef.current;
    const strip = upcomingStripRef.current;

    if (!section || !strip || lectures.length < 2) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || strip.scrollWidth <= strip.clientWidth)
          return;

        strip.classList.add("is-auto-nudging");
        strip.scrollTo({ left: 72, behavior: "smooth" });

        window.setTimeout(() => {
          strip.scrollTo({ left: 0, behavior: "smooth" });
          strip.classList.remove("is-auto-nudging");
        }, 1600);
      },
      { threshold: 0.55 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [lectures.length]);

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest("/lectures", { method: "POST", body: payload }),
    onSuccess: () => {
      setForm(initialForm);
      clearScheduleDraft();
      setDraftRestored(false);
      queryClient.invalidateQueries({ queryKey: ["moderator"] });
      showToast("success", "Lecture scheduled.");
    },
    onError: (error) => showToast("error", error.message),
  });

  function showToast(type, message) {
    setToast({ type, message });
  }

  function updateField(event) {
    setDraftRestored(false);
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function handleClearDraft() {
    clearScheduleDraft();
    setForm(initialForm);
    setDraftRestored(false);
    showToast("success", "Draft cleared.");
  }

  function handleSubmit(event) {
    event.preventDefault();
    createMutation.mutate({
      course_id: Number(form.course_id),
      venue_id: Number(form.venue_id),
      date: form.date,
      start_time: toTimeValue(form.start_hour, form.start_minute),
      end_time: toTimeValue(form.end_hour, form.end_minute),
      notes: form.notes || null,
    });
  }

  const showVenue = Boolean(form.course_id);
  const showDate = Boolean(form.venue_id);
  const showStart = Boolean(form.date);
  const showEnd = Boolean(form.start_hour);
  const showNotes = Boolean(form.end_hour);

  return (
    <MobileShell
      tabs={moderatorTabs}
      homeTo="/moderator/today"
      profileTo="/moderator/profile"
      navLabel="Moderator navigation"
    >
      {toast ? (
        <div className={`top-toast ${toast.type}`}>{toast.message}</div>
      ) : null}

      <section className="page-heading">
        <p className="eyebrow">Moderator</p>
        <h1>Schedule</h1>
      </section>

      <section className="tool-panel schedule-panel">
        <div className="panel-title-row">
          <h2>New lecture</h2>
          {hasDraftInput(form) ? (
            <button className="secondary-button compact-button" type="button" onClick={handleClearDraft}>
              Clear draft
            </button>
          ) : null}
        </div>
        {draftRestored ? (
          <p className="draft-notice">Unsaved schedule restored.</p>
        ) : null}
        <form className="form-stack schedule-form" onSubmit={handleSubmit}>
          <label className="field-shell">
            <span className="field-label">
              <span className="field-icon">
                <BookOpen size={15} />
              </span>
              Course
            </span>
            <select
              name="course_id"
              value={form.course_id}
              onChange={updateField}
              required
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.title}
                </option>
              ))}
            </select>
          </label>

          {showVenue ? (
            <label className="field-shell">
              <span className="field-label">
                <span className="field-icon">
                  <MapPin size={15} />
                </span>
                Venue
              </span>
              <select
                name="venue_id"
                value={form.venue_id}
                onChange={updateField}
                required
              >
                <option value="">Select venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} ({venue.location})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showDate ? <VenueContext venueId={form.venue_id} /> : null}

          {showDate ? (
            <label className="field-shell">
              <span className="field-label">
                <span className="field-icon">
                  <CalendarDays size={15} />
                </span>
                Date
              </span>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={updateField}
                required
              />
            </label>
          ) : null}

          {showStart ? (
            <label className="field-shell">
              <span className="field-label">
                <span className="field-icon">
                  <Clock3 size={15} />
                </span>
                Start time
              </span>
              <div
                className="time-picker-row"
                aria-label="Start time in Africa Lagos time"
              >
                <select
                  name="start_hour"
                  value={form.start_hour}
                  onChange={updateField}
                  required
                >
                  <option value="">Hour</option>
                  {hourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="start_minute"
                  value={form.start_minute}
                  onChange={updateField}
                  required
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          ) : null}

          {showEnd ? (
            <label className="field-shell">
              <span className="field-label">
                <span className="field-icon">
                  <Clock3 size={15} />
                </span>
                End time
              </span>
              <div
                className="time-picker-row"
                aria-label="End time in Africa Lagos time"
              >
                <select
                  name="end_hour"
                  value={form.end_hour}
                  onChange={updateField}
                  required
                >
                  <option value="">Hour</option>
                  {hourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="end_minute"
                  value={form.end_minute}
                  onChange={updateField}
                  required
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          ) : null}

          {showNotes ? (
            <label className="field-shell">
              <span className="field-label">
                <span className="field-icon">
                  <StickyNote size={15} />
                </span>
                Notes
              </span>
              <input name="notes" value={form.notes} onChange={updateField} />
            </label>
          ) : null}

          {showNotes ? (
            <button
              className="primary-button"
              type="submit"
              disabled={createMutation.isPending}
            >
              + New lecture
            </button>
          ) : null}
        </form>
      </section>

      <section
        className="records-section upcoming-section"
        ref={upcomingSectionRef}
      >
        <div className="panel-title-row compact">
          <h2>Upcoming</h2>
        </div>
        {lecturesQuery.isLoading ? (
          <div className="lectureflow-loader">LectureFlow</div>
        ) : null}
        {lecturesQuery.error ? (
          <p className="form-error">{lecturesQuery.error.message}</p>
        ) : null}
        {!lecturesQuery.isLoading && lectures.length === 0 ? (
          <p className="state-text">No upcoming schedules.</p>
        ) : null}
        <div className="schedule-strip" ref={upcomingStripRef}>
          {lectures.map((lecture) => (
            <NavLink
              className="schedule-card"
              key={lecture.id}
              to={`/moderator/lectures/${lecture.id}`}
            >
              <div className="schedule-card-top">
                <span className="schedule-code">{lecture.course_code}</span>
                <span className="schedule-chip">{startsInLabel(lecture)}</span>
              </div>
              <h3>{lecture.course_title}</h3>
              <p>
                <UserRound size={13} /> {lecture.lecturer_name || lecturerName}
              </p>
              <p>
                <Clock3 size={13} /> {lectureTimeRange(lecture)} -{" "}
                {durationLabel(lecture.start_time, lecture.end_time)}
              </p>
              <p>
                <MapPin size={13} /> {lecture.venue_name}
              </p>
            </NavLink>
          ))}
        </div>
      </section>
    </MobileShell>
  );
}

