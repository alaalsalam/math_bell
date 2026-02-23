import { Navigate, useLocation } from "react-router-dom";
import { getStoredStudent } from "../utils/storage";

function RequireStudent({ children }) {
  const location = useLocation();
  const student = getStoredStudent();

  if (!student?.student_id) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default RequireStudent;
