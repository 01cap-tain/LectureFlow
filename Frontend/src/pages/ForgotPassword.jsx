import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import logo from "../assets/LogoMakr-8frzfc.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });

      setMessage(data.message || "If the email exists, a password reset link has been sent.");
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
          <h1>Forgot password</h1>
          <p className="muted">Enter your account email to receive a reset link.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck="false"
              required
            />
          </label>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="auth-switch">
          Remembered your password? <Link to="/auth/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
