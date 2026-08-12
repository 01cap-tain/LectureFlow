import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminResourceDetail = lazy(() => import("./pages/AdminResourceDetail"));
const ModeratorToday = lazy(() => import("./pages/ModeratorToday"));
const ModeratorDashboard = lazy(() => import("./pages/ModeratorDashboard"));
const ModeratorLectureDetail = lazy(() => import("./pages/ModeratorLectureDetail"));
const ModeratorProfile = lazy(() => import("./pages/ModeratorProfile"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const StudentSetup = lazy(() => import("./pages/StudentSetup"));

function PageFallback() {
  return <div className="page-fallback"><div className="app-loader">LectureFlow</div></div>;
}

function protect(element, roles) {
  return <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/signin" replace />} />
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/admin/dashboard" element={protect(<AdminDashboard />, ["admin"])} />
        <Route path="/admin/profile" element={protect(<AdminProfile />, ["admin"])} />
        <Route path="/admin/resources/:resource/:id" element={protect(<AdminResourceDetail />, ["admin"])} />
        <Route path="/moderator/today" element={protect(<ModeratorToday />, ["moderator"])} />
        <Route path="/moderator/dashboard" element={protect(<ModeratorDashboard />, ["moderator"])} />
        <Route path="/moderator/lectures/:id" element={protect(<ModeratorLectureDetail />, ["moderator"])} />
        <Route path="/moderator/profile" element={protect(<ModeratorProfile />, ["moderator"])} />
        <Route path="/student/dashboard" element={protect(<StudentDashboard />, ["student"])} />
        <Route path="/student/profile" element={protect(<StudentProfile />, ["student"])} />
        <Route path="/student/setup" element={protect(<StudentSetup />, ["student"])} />
        <Route path="*" element={<Navigate to="/auth/signin" replace />} />
      </Routes>
    </Suspense>
  );
}
