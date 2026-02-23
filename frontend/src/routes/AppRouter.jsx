import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireStudent from "../components/RequireStudent";
import DomainPage from "../pages/DomainPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ReportPage from "../pages/ReportPage";
import RunnerPage from "../pages/RunnerPage";
import SkillsPage from "../pages/SkillsPage";

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
