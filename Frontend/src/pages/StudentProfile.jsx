import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, GraduationCap, Hash, LogOut, Mail, UserRound } from "lucide-react";
import { apiRequest } from "../api/client";
import { MobileShell } from "../components/MobileShell";
import { ProfileRows } from "../components/ProfileRows";
import { studentTabs } from "./studentConfig";

export default function StudentProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => apiRequest("/profile/me") });
  const profile = profileQuery.data?.profile;

  async function handleSignOut() {
    setError("");
    setSigningOut(true);

    try {
      await apiRequest("/auth/signout", { method: "POST" });
      queryClient.removeQueries({ queryKey: ["profile"] });
      navigate("/auth/signin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <MobileShell tabs={studentTabs} homeTo="/student/dashboard" profileTo="/student/profile" navLabel="Student navigation">
      <section className="page-heading">
        <p className="eyebrow">Student</p>
        <h1>Profile</h1>
      </section>

      {profileQuery.isLoading ? <div className="lectureflow-loader">LectureFlow</div> : null}
      {profileQuery.error ? <p className="form-error">{profileQuery.error.message}</p> : null}

      {profile ? (
        <ProfileRows
          profile={profile}
          rows={[
            { key: "name", label: "Name", value: profile.name, icon: UserRound, editable: true },
            { key: "email", label: "Email", value: profile.email, icon: Mail, editable: true },
            { key: "department_name", label: "Department", value: profile.department_name, icon: Building2 },
            { key: "level", label: "Level", value: profile.level, icon: GraduationCap },
            { key: "current_semester", label: "Semester", value: profile.current_semester, icon: Hash },
            { key: "matric_no", label: "Matric No", value: profile.matric_no, icon: Hash },
          ]}
        />
      ) : null}

      <section className="session-card">
        <div>
          <h2>Sign out</h2>
          <p className="muted">End this session?</p>
        </div>
        <button className="secondary-button icon-action-button" type="button" onClick={() => setConfirmOpen(true)}>
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <h2 id="logout-title">Sign out?</h2>
            <p className="muted">Your current session will end.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="secondary-button icon-action-button" type="button" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </MobileShell>
  );
}
