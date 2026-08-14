import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client";
import logo from "../assets/LogoMakr-8frzfc.png";

export default function StudentCompleteProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", level: "", current_semester: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiRequest("/profile/complete", {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          level: Number(form.level),
          current_semester: Number(form.current_semester),
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <span className="brand-mark"><img src={logo} alt="" /></span>
          <span>LectureFlow</span>
        </div>
        <div>
          <h1>Complete profile</h1>
          <p className="muted">Set your level and semester to see the right lectures.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={updateField}
              autoComplete="name"
              required
            />
          </label>

          <label>
            <span>Level</span>
            <select name="level" value={form.level} onChange={updateField} required>
              <option value="">Select level</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
            </select>
          </label>

          <label>
            <span>Current semester</span>
            <select name="current_semester" value={form.current_semester} onChange={updateField} required>
              <option value="">Select semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Complete profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
