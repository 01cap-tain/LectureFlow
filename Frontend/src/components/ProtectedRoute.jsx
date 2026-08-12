import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client";

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

  const role = profileQuery.data?.profile?.role;
  if (roles && !roles.includes(role)) {
    return <Navigate to="/auth/signin" replace />;
  }

  return children;
}
