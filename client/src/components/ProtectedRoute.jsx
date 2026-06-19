import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ roles, children }) {
  const { user, authReady } = useSelector((s) => s.auth);
  const location = useLocation();

  // On a hard refresh the in-memory session is empty until the silent
  // /auth/refresh resolves. Wait for it instead of bouncing to /login.
  if (!authReady) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center" aria-busy="true">
        <div className="skeleton h-32 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
