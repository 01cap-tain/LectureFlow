import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client";

export function ProfileRows({ profile, rows }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");

  const updateMutation = useMutation({
    mutationFn: (payload) => apiRequest("/profile/update", { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(null);
      setValue("");
    },
  });

  function openEditor(row) {
    if (!row.editable) return;
    setEditing(row);
    setValue(profile[row.key] || "");
  }

  function handleSubmit(event) {
    event.preventDefault();
    updateMutation.mutate({ [editing.key]: value });
  }

  return (
    <>
      <section className="profile-card">
        {rows.map((row) => {
          const Icon = row.icon;
          const content = (
            <>
              <span><Icon size={16} />{row.label}</span>
              <strong>{row.value || "Not set"}</strong>
            </>
          );

          return row.editable ? (
            <button className="profile-row editable-profile-row" key={row.label} type="button" onClick={() => openEditor(row)}>
              {content}
            </button>
          ) : (
            <div className="profile-row" key={row.label}>{content}</div>
          );
        })}
      </section>

      {editing ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
            <h2 id="edit-profile-title">Edit {editing.label}</h2>
            <form className="form-stack" onSubmit={handleSubmit}>
              <input
                type={editing.key === "email" ? "email" : "text"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                required
              />
              {updateMutation.error ? <p className="form-error">{updateMutation.error.message}</p> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

