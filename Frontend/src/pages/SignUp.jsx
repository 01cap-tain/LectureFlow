import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
      await apiRequest("/auth/signup", { method: "POST", body: form });
      navigate("/auth/signin", { replace: true });
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
            <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
          </label>
          <label>
            <span>Matric number</span>
            <input name="matric_no" type="text" value={form.matric_no} onChange={updateField} autoCapitalize="characters" autoComplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <PasswordInput value={form.password} onChange={updateField} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <NavLink to="/auth/signin">Sign in</NavLink>
        </p>
      </section>
    </main>
  );
}
