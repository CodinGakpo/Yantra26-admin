import { Navigate, useLocation } from "react-router-dom";
import { getAccess, refreshAccess, clearTokens } from "./api";
export default function RequireAuth({ children }) {
  const location = useLocation();
  const access = getAccess();
  if (access) return children;
  return <Navigate to="/" state={{ from: location }} replace />;
}
