import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useStore } from "./store/useStore";
import { Toaster } from "./components/ui/toaster";
import { DashboardLayout } from "./components/DashboardLayout";

// Every page is its own chunk: visitors download the landing page's WebGL and scroll effects,
// or the app's screens, but never both up front.
const page = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const LandingPage = page(() => import("./pages/LandingPage"), "LandingPage");
const Login = page(() => import("./pages/Auth/Login"), "Login");
const Register = page(() => import("./pages/Auth/Register"), "Register");
const ProjectList = page(() => import("./pages/ProjectList"), "ProjectList");
const ProjectBoard = page(() => import("./pages/ProjectBoard"), "ProjectBoard");
const AiChat = page(() => import("./pages/AiChat"), "AiChat");
const ActivityLog = page(() => import("./pages/ActivityLog"), "ActivityLog");
const Reports = page(() => import("./pages/Reports"), "Reports");
const MyTasks = page(() => import("./pages/MyTasks"), "MyTasks");
const Settings = page(() => import("./pages/Settings"), "Settings");
const NotFound = page(() => import("./pages/NotFound"), "NotFound");

const FullScreenLoader = ({ label }) => (
  <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-gray-50" role="status" aria-live="polite">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
    <span className="text-sm text-gray-500">{label}</span>
  </div>
);

// Keeps the sidebar and header on screen while a page's chunk loads.
const PageLoader = () => (
  <div className="flex min-h-64 items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
  </div>
);

const ProtectedLayout = () => {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
};

export default function App() {
  const { user, isAuthChecking, checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthChecking) {
    return <FullScreenLoader label="Loading your workspace…" />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />

        {/* Protected Routes with Nested Layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={user?.role?.viewReports ? <Reports /> : <Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/project/:id" element={<ProjectBoard />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/ai-chat" element={<AiChat />} />
          <Route path="/activity" element={user?.role?.viewReports ? <ActivityLog /> : <Navigate to="/projects" replace />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
