import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { apiRequest } from "../api/client";
import { PasswordInput } from "./PasswordInput";

const emptyForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export function ProfilePasswordReset() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const passwordMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest("/profile/password", { method: "PATCH", body: payload }),
    onSuccess: () => {
      setForm(emptyForm);
      setMessage("Password updated successfully.");
      setOpen(false);
    },
  });

  function updateField(event) {
    setMessage("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (form.new_password !== form.confirm_password) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    passwordMutation.mutate({
      current_password: form.current_password,
      new_password: form.new_password,
    });
  }

  function closeModal() {
    setOpen(false);
    setForm(emptyForm);
    setMessage("");
    passwordMutation.reset();
  }

  return (
    <>
      <section className="session-card">
        <div>
          <h2>Password reset</h2>
          <p className="muted">Change your account password.</p>
        </div>
        <button className="secondary-button icon-action-button" type="button" onClick={() => setOpen(true)}>
          <KeyRound size={17} />
          <span>Reset password</span>
        </button>
        {message ? <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p> : null}
      </section>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
            <h2 id="password-reset-title">Reset password</h2>
            <form className="form-stack" onSubmit={handleSubmit}>
              <label>
                <span>Current password</span>
                <PasswordInput
                  name="current_password"
                  value={form.current_password}
                  onChange={updateField}
                  autoComplete="current-password"
                />
              </label>

              <label>
                <span>New password</span>
                <PasswordInput
                  name="new_password"
                  value={form.new_password}
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

              {passwordMutation.error ? <p className="form-error">{passwordMutation.error.message}</p> : null}
              {message && !message.includes("successfully") ? <p className="form-error">{message}</p> : null}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
