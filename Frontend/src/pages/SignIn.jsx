import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import logo from "../assets/LogoMakr-8frzfc.png";

export default function SignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ identifier: "", password: "" });
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
      // Remove any profile cached from a previous student/moderator/admin login.
      queryClient.removeQueries({ queryKey: ["profile"] });

      const identifier = form.identifier.trim();
      const loginPayload = identifier.includes("@")
        ? { email: identifier, password: form.password }
        : { matric_no: identifier, password: form.password };

      const data = await apiRequest("/auth/signin", {
        method: "POST",
        body: loginPayload,
      });

      const role = data.user?.role;

      // Confirm the new session before entering a protected page.
      await queryClient.fetchQuery({
        queryKey: ["profile"],
        queryFn: () => apiRequest("/profile/me"),
      });

      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "moderator") navigate("/moderator/today", { replace: true });
      else navigate("/student/dashboard", { replace: true });
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
          <h1>Sign in</h1>
          <p className="muted">Access your campus schedule workspace.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>Email or matric number</span>
            <input
              name="identifier"
              type="text"
              value={form.identifier}
              onChange={updateField}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck="false"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <PasswordInput value={form.password} onChange={updateField} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
