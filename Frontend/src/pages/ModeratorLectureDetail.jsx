import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, MapPin, StickyNote, XCircle } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { buildHourOptions, buildMinuteOptions, durationLabel, lectureTimeRange, startsInLabel, toTimeValue } from "../utils/scheduleTime";
import { moderatorTabs } from "./moderatorConfig";

const hourOptions = buildHourOptions();
const minuteOptions = buildMinuteOptions();

function canManageLecture(lecture) {
  return ["scheduled", "postponed"].includes(lecture?.status)
    && !["completed", "cancelled"].includes(lecture?.live_status);
}

function splitTime(time) {
  const [hour = "", minute = "00"] = String(time || "").slice(0, 5).split(":");
  return { hour, minute };
}

export default function ModeratorLectureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lecturesQuery = useQuery({ queryKey: ["moderator", "lectures", "all"], queryFn: () => apiRequest("/lectures/my") });
  const venuesQuery = useQuery({ queryKey: ["moderator", "venues"], queryFn: () => apiRequest("/lectures/venues") });

  const lecture = useMemo(() => {
    return (lecturesQuery.data?.lectures || []).find((item) => String(item.id) === String(id));
  }, [id, lecturesQuery.data]);

  useEffect(() => {
    if (!lecture) return;
    const start = splitTime(lecture.start_time);
    const end = splitTime(lecture.end_time);

    setForm({
      date: lecture.date,
      venue_id: String(lecture.venue_id || ""),
      start_hour: start.hour,
      start_minute: start.minute,
      end_hour: end.hour,
      end_minute: end.minute,
      notes: lecture.notes || "",
    });
  }, [lecture]);

  const postponeMutation = useMutation({
    mutationFn: (payload) => apiRequest(`/lectures/${id}/postpone`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator"] });
      navigate("/moderator/dashboard");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest(`/lectures/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator"] });
      navigate("/moderator/dashboard");
    },
  });

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    postponeMutation.mutate({
      date: form.date,
      venue_id: Number(form.venue_id),
      start_time: toTimeValue(form.start_hour, form.start_minute),
      end_time: toTimeValue(form.end_hour, form.end_minute),
      notes: form.notes || null,
    });
  }

  const venues = venuesQuery.data?.venues || [];
  const busy = lecturesQuery.isLoading || venuesQuery.isLoading;
  const canManage = canManageLecture(lecture);

  return (
    <MobileShell tabs={moderatorTabs} homeTo="/moderator/today" profileTo="/moderator/profile" navLabel="Moderator navigation">
      <NavLink className="back-link" to="/moderator/dashboard"><ArrowLeft size={16} /> Back</NavLink>

      {busy ? <div className="lectureflow-loader">LectureFlow</div> : null}
      {lecturesQuery.error ? <p className="form-error">{lecturesQuery.error.message}</p> : null}
      {!busy && !lecture ? <p className="state-text">Lecture not found.</p> : null}

      {lecture && form ? (
        <>
          <section className="lecture-detail-card">
            <div className="schedule-card-top">
              <span className="schedule-code">{lecture.course_code}</span>
              <span className="schedule-chip">{startsInLabel(lecture)}</span>
            </div>
            <h1>{lecture.course_title}</h1>
            <p><Clock3 size={14} /> {lectureTimeRange(lecture)} - {durationLabel(lecture.start_time, lecture.end_time)}</p>
            <p><MapPin size={14} /> {lecture.venue_name}</p>
          </section>

          {canManage ? (
          <section className="tool-panel schedule-panel">
            <div className="panel-title-row"><h2>Reschedule</h2></div>
            <form className="form-stack schedule-form" onSubmit={handleSubmit}>
              <label className="field-shell">
                <span className="field-label"><span className="field-icon"><MapPin size={15} /></span>Venue</span>
                <select name="venue_id" value={form.venue_id} onChange={updateField} required>
                  <option value="">Select venue</option>
                  {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} ({venue.location})</option>)}
                </select>
              </label>

              <label className="field-shell">
                <span className="field-label"><span className="field-icon"><CalendarDays size={15} /></span>Date</span>
                <input name="date" type="date" value={form.date} onChange={updateField} required />
              </label>

              <label className="field-shell">
                <span className="field-label"><span className="field-icon"><Clock3 size={15} /></span>Start time</span>
                <div className="time-picker-row">
                  <select name="start_hour" value={form.start_hour} onChange={updateField} required>
                    <option value="">Hour</option>
                    {hourOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select name="start_minute" value={form.start_minute} onChange={updateField} required>
                    {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                  </select>
                </div>
              </label>

              <label className="field-shell">
                <span className="field-label"><span className="field-icon"><Clock3 size={15} /></span>End time</span>
                <div className="time-picker-row">
                  <select name="end_hour" value={form.end_hour} onChange={updateField} required>
                    <option value="">Hour</option>
                    {hourOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select name="end_minute" value={form.end_minute} onChange={updateField} required>
                    {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                  </select>
                </div>
              </label>

              <label className="field-shell">
                <span className="field-label"><span className="field-icon"><StickyNote size={15} /></span>Notes</span>
                <input name="notes" value={form.notes} onChange={updateField} />
              </label>

              {postponeMutation.error ? <p className="form-error">{postponeMutation.error.message}</p> : null}
              <button className="primary-button" type="submit" disabled={postponeMutation.isPending}>Save changes</button>
            </form>
          </section>
          ) : (
            <p className="state-text">This lecture is not active, so it cannot be rescheduled.</p>
          )}

          {canManage ? <section className="session-card">
            <div>
              <h2>Cancel lecture</h2>
              <p className="muted">Remove this lecture from active schedules.</p>
            </div>
            <button className="secondary-button icon-action-button" type="button" onClick={() => setConfirmOpen(true)}>
              <XCircle size={17} /> Cancel lecture
            </button>
            {cancelMutation.error ? <p className="form-error">{cancelMutation.error.message}</p> : null}
          </section> : null}
        </>
      ) : null}

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <h2 id="cancel-title">Cancel lecture?</h2>
            <p className="muted">Students will no longer see it as active.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmOpen(false)}>Keep</button>
              <button className="secondary-button icon-action-button" type="button" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? "Cancelling..." : "Cancel lecture"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </MobileShell>
  );
}

