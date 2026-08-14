import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import logo from "../assets/LogoMakr-8frzfc.png";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", matric_no: "", password: "" });
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
      await apiRequest("/auth/signup", {
        method: "POST",
        body: {
          email: form.email.trim(),
          matric_no: form.matric_no.trim(),
          password: form.password,
        },
      });

      navigate("/auth/signin", {
        replace: true,
        state: { message: "Account created. Please sign in." },
      });
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
          <h1>Sign up</h1>
          <p className="muted">Create your student schedule account.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck="false"
              required
            />
          </label>

          <label>
            <span>Matric number</span>
            <input
              name="matric_no"
              type="text"
              value={form.matric_no}
              onChange={updateField}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="username"
              spellCheck="false"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <PasswordInput
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/auth/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
