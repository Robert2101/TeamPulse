import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "./store/useStore";
import { Toaster } from "./components/ui/toaster";

// Layout & Auth
import { DashboardLayout } from "./components/DashboardLayout";
import { Login } from "./pages/Auth/Login";
import { Register } from "./pages/Auth/Register";

// Pages
import { LandingPage } from "./pages/LandingPage";
import { ProjectList } from "./pages/ProjectList";
import { ProjectBoard } from "./pages/ProjectBoard";
import { AiChat } from "./pages/AiChat";
import { ActivityLog } from "./pages/ActivityLog";
import { Reports } from "./pages/Reports";
import { MyTasks } from "./pages/MyTasks";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

const ProtectedLayout = () => {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default function App() {
  const { user, isAuthChecking, checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthChecking) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-gray-50" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
        <span className="text-sm text-gray-500">Loading your workspace…</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
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
      <Toaster />
    </BrowserRouter>
  );
}
