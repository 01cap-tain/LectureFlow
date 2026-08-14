import { Navigate, useLocation } from "react-router-dom";
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
    return <Navigate to="/student/complete-profile" replace state={{ from: location.pathname }} />;
  }

  if (!studentProfileIsIncomplete(profile) && isCompleteProfilePage) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}
