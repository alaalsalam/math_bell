import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireStudent from "../components/RequireStudent";
import RequireTeacherMode from "../components/RequireTeacherMode";
import DomainPage from "../pages/DomainPage";
import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ReportPage from "../pages/ReportPage";
import RunnerPage from "../pages/RunnerPage";
import SkillsPage from "../pages/SkillsPage";
import TeacherClassPage from "../pages/TeacherClassPage";
import TeacherDashboardPage from "../pages/TeacherDashboardPage";
import TeacherLeaderboardPage from "../pages/TeacherLeaderboardPage";
import TeacherStudentPage from "../pages/TeacherStudentPage";
import TeacherStudentsPage from "../pages/TeacherStudentsPage";
import TeacherSettingsPage from "../pages/TeacherSettingsPage";

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireStudent>
              <HomePage />
            </RequireStudent>
          }
        />
        <Route
          path="/g/:grade"
          element={
            <RequireStudent>
              <DomainPage />
            </RequireStudent>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireStudent>
              <DashboardPage />
            </RequireStudent>
          }
        />
        <Route
          path="/g/:grade/d/:domain"
          element={
            <RequireStudent>
              <SkillsPage />
            </RequireStudent>
          }
        />
        <Route
          path="/play"
          element={
            <RequireStudent>
              <RunnerPage />
            </RequireStudent>
          }
        />
        <Route
          path="/session/:sessionId"
          element={
            <RequireStudent>
              <RunnerPage />
            </RequireStudent>
          }
        />
        <Route
          path="/report/:sessionId"
          element={
            <RequireStudent>
              <ReportPage />
            </RequireStudent>
          }
        />

        <Route
          path="/teacher"
          element={
            <RequireTeacherMode>
              <TeacherDashboardPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/class/:classId"
          element={
            <RequireTeacherMode>
              <TeacherClassPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/student/:studentId"
          element={
            <RequireTeacherMode>
              <TeacherStudentPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <RequireTeacherMode>
              <TeacherStudentsPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/students/:studentId"
          element={
            <RequireTeacherMode>
              <TeacherStudentPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/settings"
          element={
            <RequireTeacherMode>
              <TeacherSettingsPage />
            </RequireTeacherMode>
          }
        />
        <Route
          path="/teacher/leaderboard"
          element={
            <RequireTeacherMode>
              <TeacherLeaderboardPage />
            </RequireTeacherMode>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
