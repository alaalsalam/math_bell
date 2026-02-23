import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import DomainPage from "../pages/DomainPage";
import SkillsPage from "../pages/SkillsPage";
import RunnerPage from "../pages/RunnerPage";
import ReportPage from "../pages/ReportPage";

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/g/:grade" element={<DomainPage />} />
        <Route path="/g/:grade/d/:domain" element={<SkillsPage />} />
        <Route path="/play" element={<RunnerPage />} />
        <Route path="/session/:sessionId" element={<RunnerPage />} />
        <Route path="/report/:sessionId" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
