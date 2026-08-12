import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { PasswordInput } from "../components/PasswordInput";
import { adminSections, adminTabs, subtitleFor } from "./adminConfig";

function buildInitialForm(fields) {
  return fields.reduce((values, field) => {
    values[field.name] = field.defaultValue || "";
    return values;
  }, {});
}

function toPayload(form, fields) {
  return fields.reduce((payload, field) => {
    const value = form[field.name];
    payload[field.name] = field.type === "number" || field.name.endsWith("_id") || field.name === "level" || field.name === "semester"
      ? Number(value)
      : value;
    return payload;
  }, {});
}

function getOptions(field, lookups) {
  if (field.options) return field.options.map((value) => ({ value, label: String(value) }));
  if (field.source === "faculties") return lookups.faculties.map((item) => ({ value: item.id, label: item.name }));
  if (field.source === "departments") {
    return lookups.departments.map((item) => ({
      value: item.id,
      label: item.faculty_name ? `${item.name} (${item.faculty_name})` : item.name,
    }));
  }
  return [];
}

function needsLookup(section, source) {
  return section.fields.some((field) => field.source === source);
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeKey, setActiveKey] = useState(adminSections[0].key);
  const activeSection = useMemo(
    () => adminSections.find((section) => section.key === activeKey) || adminSections[0],
    [activeKey],
  );
  const [forms, setForms] = useState(() =>
    adminSections.reduce((values, section) => {
      values[section.key] = buildInitialForm(section.fields);
      return values;
    }, {}),
  );

  const listQuery = useQuery({
    queryKey: ["admin", activeSection.key],
    queryFn: () => apiRequest(activeSection.path),
  });

  const facultiesQuery = useQuery({
    queryKey: ["admin", "faculties", "lookup"],
    queryFn: () => apiRequest("/admin/faculties"),
    enabled: needsLookup(activeSection, "faculties"),
  });

  const departmentsQuery = useQuery({
    queryKey: ["admin", "departments", "lookup"],
    queryFn: () => apiRequest("/admin/departments"),
    enabled: needsLookup(activeSection, "departments"),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => apiRequest(activeSection.path, { method: "POST", body: payload }),
    onSuccess: () => {
      setForms((current) => ({
        ...current,
        [activeSection.key]: buildInitialForm(activeSection.fields),
      }));
      queryClient.invalidateQueries({ queryKey: ["admin", activeSection.key] });
      queryClient.invalidateQueries({ queryKey: ["admin", activeSection.key, "lookup"] });
    },
  });

  const records = listQuery.data?.[activeSection.listKey] || [];
  const form = forms[activeSection.key];
  const lookups = {
    faculties: facultiesQuery.data?.faculties || [],
    departments: departmentsQuery.data?.departments || [],
  };

  function updateField(event) {
    const { name, value } = event.target;
    setForms((current) => ({
      ...current,
      [activeSection.key]: { ...current[activeSection.key], [name]: value },
    }));
  }

  function handleCreate(event) {
    event.preventDefault();
    createMutation.mutate(toPayload(form, activeSection.fields));
  }

  return (
    <MobileShell tabs={adminTabs}>
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Dashboard</h1>
      </section>

      <div className="section-tabs" aria-label="Admin resources">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              className={section.key === activeKey ? "section-tab active" : "section-tab"}
              type="button"
              onClick={() => setActiveKey(section.key)}
            >
              <Icon size={15} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>

      <section className="tool-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Create</p>
            <h2>{activeSection.label}</h2>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleCreate}>
          {activeSection.fields.map((field) => {
            const options = getOptions(field, lookups);
            return (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.type === "select" ? (
                  <select name={field.name} value={form[field.name]} onChange={updateField} required>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === "password" ? (
                  <PasswordInput name={field.name} value={form[field.name]} onChange={updateField} />
                ) : (
                  <input name={field.name} type={field.type} value={form[field.name]} onChange={updateField} required />
                )}
              </label>
            );
          })}
          {createMutation.error ? <p className="form-error">{createMutation.error.message}</p> : null}
          {createMutation.isSuccess ? <p className="form-success">Created successfully.</p> : null}
          <button className="primary-button" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : `+ New ${activeSection.singular}`}
          </button>
        </form>
      </section>

      <section className="records-section">
        <div className="panel-title-row compact">
          <h2>{activeSection.label}</h2>
          {listQuery.isFetching ? <span className="muted small-text">Refreshing</span> : null}
        </div>

        {listQuery.isLoading ? <p className="state-text">Loading records...</p> : null}
        {listQuery.error ? <p className="form-error">{listQuery.error.message}</p> : null}
        {!listQuery.isLoading && records.length === 0 ? <p className="state-text">No records yet.</p> : null}

        <div className="record-list">
          {records.map((item) => (
            <NavLink className="record-card" key={item.id} to={`/admin/resources/${activeSection.key}/${item.id}`}>
              <div>
                <h3>{item[activeSection.titleField] || item.name || item.email || `#${item.id}`}</h3>
                <p>{subtitleFor(item)}</p>
              </div>
              <span className={item.is_active === false ? "status-pill muted-pill" : "status-pill"}>
                {item.is_active === false ? "Inactive" : "Active"}
              </span>
            </NavLink>
          ))}
        </div>
      </section>
    </MobileShell>
  );
}
