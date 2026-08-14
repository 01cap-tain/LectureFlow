import { Link, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client";

function studentProfileIsIncomplete(profile) {
  return profile?.role === "student" && (!profile.name || !profile.level || !profile.current_semester);
}

export function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiRequest("/profile/me"),
    retry: false,
  });

  if (profileQuery.isLoading) {
    return <div className="page-fallback"><div className="app-loader">LectureFlow</div></div>;
  }

  if (profileQuery.error) {
    return <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />;
  }

  const profile = profileQuery.data?.profile;
  const role = profile?.role;
  if (roles && !roles.includes(role)) {
    return <Navigate to="/auth/signin" replace />;
  }

  const isCompleteProfilePage = location.pathname === "/student/complete-profile";
  if (studentProfileIsIncomplete(profile) && !isCompleteProfilePage) {
    return (
      <main className="auth-screen">
        <section className="profile-caution">
          <p className="eyebrow">Profile required</p>
          <h1>Complete your profile before viewing lectures.</h1>
          <p className="muted">Your level and semester help LectureFlow show only the schedules meant for you.</p>
          <Link className="primary-button profile-caution-link" to="/student/complete-profile" state={{ from: location.pathname }}>
            Complete profile
          </Link>
        </section>
      </main>
    );
  }

  if (!studentProfileIsIncomplete(profile) && isCompleteProfilePage) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}
