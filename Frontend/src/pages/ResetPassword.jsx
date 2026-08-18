import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import logo from "../assets/LogoMakr-8frzfc.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setMessage("");
    setError("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset token is missing from this link.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { token, password: form.password },
      });

      setMessage(data.message || "Password reset successfully. Please sign in.");
      window.setTimeout(() => {
        navigate("/auth/signin", {
          replace: true,
          state: { message: "Password reset successfully. Please sign in." },
        });
      }, 900);
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
          <h1>Reset password</h1>
          <p className="muted">Create a new password for your account.</p>
        </div>

        {!token ? <p className="form-error">Reset token is missing from this link.</p> : null}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>New password</span>
            <PasswordInput
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
            />
          </label>

          <label>
            <span>Confirm new password</span>
            <PasswordInput
              name="confirm_password"
              value={form.confirm_password}
              onChange={updateField}
              autoComplete="new-password"
            />
          </label>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading || !token}>
            {loading ? "Updating..." : "Reset password"}
          </button>
        </form>

        <p className="auth-switch">
          Remembered your password? <Link to="/auth/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
