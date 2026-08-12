import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { adminSections, adminTabs, subtitleFor } from "./adminConfig";

const hiddenFields = new Set(["password_hash"]);

function formatKey(key) {
  return key.replaceAll("_", " ");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function AdminResourceDetail() {
  const { resource, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const section = useMemo(
    () => adminSections.find((item) => item.key === resource),
    [resource],
  );

  const listQuery = useQuery({
    queryKey: ["admin", section?.key],
    queryFn: () => apiRequest(section.path),
    enabled: Boolean(section),
  });

  const records = section ? listQuery.data?.[section.listKey] || [] : [];
  const record = records.find((item) => String(item.id) === String(id));

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(section.deletePath(id), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", section.key] });
      navigate("/admin/dashboard", { replace: true });
    },
  });

  if (!section) {
    return (
      <MobileShell tabs={adminTabs}>
        <p className="form-error">Unknown resource.</p>
      </MobileShell>
    );
  }

  return (
    <MobileShell tabs={adminTabs}>
      <NavLink className="back-link" to="/admin/dashboard">
        <ArrowLeft size={16} />
        <span>Back</span>
      </NavLink>

      <section className="page-heading">
        <p className="eyebrow">{section.label}</p>
        <h1>{record ? record[section.titleField] || record.name || record.email : "Details"}</h1>
        {record ? <p className="muted detail-subtitle">{subtitleFor(record)}</p> : null}
      </section>

      {listQuery.isLoading ? <div className="lectureflow-loader">LectureFlow</div> : null}
      {listQuery.error ? <p className="form-error">{listQuery.error.message}</p> : null}
      {!listQuery.isLoading && !record ? <p className="state-text">Resource not found.</p> : null}

      {record ? (
        <section className="detail-list">
          {Object.entries(record)
            .filter(([key]) => !hiddenFields.has(key))
            .map(([key, value]) => (
              <div key={key}>
                <span>{formatKey(key)}</span>
                <strong>{formatValue(value)}</strong>
              </div>
            ))}
        </section>
      ) : null}

      {record && section.deletePath ? (
        <section className="danger-zone">
          <div>
            <p className="eyebrow danger-text">Operation</p>
            <h2>Deactivate {section.singular}</h2>
            <p className="muted">This keeps history but prevents this record from being used as active data.</p>
          </div>
          <button className="danger-button" type="button" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} />
            <span>Deactivate</span>
          </button>
          {deleteMutation.error ? <p className="form-error">{deleteMutation.error.message}</p> : null}
        </section>
      ) : null}

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <h2 id="deactivate-title">Confirm deactivate</h2>
            <p className="muted">Are you sure you want to deactivate this {section.singular}?</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Working..." : "Deactivate"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </MobileShell>
  );
}
