import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-12 w-12 rounded-full border-t-2 border-indigo-500"
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={user ? <DashboardLayout><Reports /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/projects" element={user ? <DashboardLayout><ProjectList /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/project/:id" element={user ? <DashboardLayout><ProjectBoard /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/tasks" element={user ? <DashboardLayout><MyTasks /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/ai-chat" element={user ? <DashboardLayout><AiChat /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/activity" element={user ? <DashboardLayout><ActivityLog /></DashboardLayout> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <DashboardLayout><Settings /></DashboardLayout> : <Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}