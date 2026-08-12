import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Hash, UserRound } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";

export default function StudentSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", level: "", current_semester: "" });

  const setupMutation = useMutation({
    mutationFn: (payload) => apiRequest("/profile/complete", { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/student/dashboard", { replace: true });
    },
  });

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setupMutation.mutate({
      name: form.name,
      level: Number(form.level),
      current_semester: Number(form.current_semester),
    });
  }

  return (
    <MobileShell tabs={[]} homeTo="/student/setup" profileTo="/student/setup" navLabel="Student setup">
      <section className="page-heading">
        <p className="eyebrow">Student</p>
        <h1>Setup</h1>
      </section>

      <section className="tool-panel schedule-panel">
        <div className="panel-title-row"><h2>Complete profile</h2></div>
        <form className="form-stack schedule-form" onSubmit={handleSubmit}>
          <label className="field-shell">
            <span className="field-label"><span className="field-icon"><UserRound size={15} /></span>Name</span>
            <input name="name" value={form.name} onChange={updateField} required />
          </label>

          <label className="field-shell">
            <span className="field-label"><span className="field-icon"><GraduationCap size={15} /></span>Level</span>
            <select name="level" value={form.level} onChange={updateField} required>
              <option value="">Select level</option>
              {[100, 200, 300, 400, 500].map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label"><span className="field-icon"><Hash size={15} /></span>Semester</span>
            <select name="current_semester" value={form.current_semester} onChange={updateField} required>
              <option value="">Select semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </label>

          {setupMutation.error ? <p className="form-error">{setupMutation.error.message}</p> : null}
          <button className="primary-button" type="submit" disabled={setupMutation.isPending}>
            {setupMutation.isPending ? "Updating..." : "Update profile"}
          </button>
        </form>
      </section>
    </MobileShell>
  );
}
