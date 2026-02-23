import { Navigate } from "react-router-dom";
import { isTeacherModeEnabled } from "../utils/teacherMode";

function RequireTeacherMode({ children }) {
  if (!isTeacherModeEnabled()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireTeacherMode;
