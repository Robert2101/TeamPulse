import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "./store/useStore";

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

export default function App() {
  const { user, isAuthChecking, checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div
          className="h-12 w-12 animate-spin rounded-full border-t-2 border-indigo-500"
        />
      </div>
    );
  }

  const ProtectedLayout = () => {
    if (!user) return <Navigate to="/" />;
    return (
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    );
  };

  return (
    <BrowserRouter>
      <>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Protected Routes with Nested Layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={user?.role?.viewReports ? <Reports /> : <Navigate to="/projects" />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/project/:id" element={<ProjectBoard />} />
            <Route path="/tasks" element={<MyTasks />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/activity" element={user?.role?.viewReports ? <ActivityLog /> : <Navigate to="/projects" />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </>
    </BrowserRouter>
  );
}