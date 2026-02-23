import { Navigate, useLocation } from "react-router-dom";
import { isStudentLoggedIn } from "../utils/storage";

function RequireStudent({ children }) {
  const location = useLocation();

  if (!isStudentLoggedIn()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default RequireStudent;
