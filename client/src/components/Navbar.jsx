import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice.js";
import { api } from "../api/axios.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { useGetAdminConfigQuery, useUnreadCountQuery } from "../store/jobsApi.js";

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { data: configData } = useGetAdminConfigQuery();
  const { data: unreadData } = useUnreadCountQuery(undefined, { skip: !user, pollingInterval: 30000 });
  const unread = unreadData?.count || 0;
  const siteName = configData?.config?.siteName || "Haryana Job Marketplace";
  const logoUrl = configData?.config?.logoUrl;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
      if (e.key === "Tab") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(logout());
    setMenuOpen(false);
    navigate("/");
  };

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-30 bg-white border-b shadow-sm" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label={`${siteName} — go to home`}>
          {logoUrl ? (
            <img src={logoUrl} alt="" aria-hidden="true" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <span aria-hidden="true" className="bg-primary-600 text-white w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg">
              H
            </span>
          )}
          <span className="font-bold text-lg text-gray-900 hidden sm:inline">
            {siteName}
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          <Link to="/jobs" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            Find Jobs
          </Link>
          <Link to="/workers" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            Find Workers
          </Link>
          <Link to="/blog" className="hidden md:inline px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            Blog
          </Link>
          <Link to="/pricing" className="hidden md:inline px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            Pricing
          </Link>
          <Link to="/about" className="hidden md:inline px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            About
          </Link>
          <Link to="/contact" className="hidden md:inline px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
            Contact
          </Link>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-base"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {user?.role === "vendor" && (
            <Link to="/vendor" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
              Dashboard
            </Link>
          )}
          {user?.role === "seeker" && (
            <Link to="/applications" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
              My Applications
            </Link>
          )}
          {user && (
            <Link
              to="/chat"
              className="relative px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700"
              aria-label={unread > 0 ? `Chat — ${unread} unread message${unread !== 1 ? "s" : ""}` : "Chat"}
            >
              Chat
              {unread > 0 && (
                <span aria-hidden="true" className="absolute top-1 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
          {user?.role === "admin" && (
            <Link to="/admin" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-700">
              Admin
            </Link>
          )}

          {!user && (
            <>
              <Link to="/login" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign up
              </Link>
            </>
          )}

          {user && (
            <div className="relative ml-1" ref={menuRef}>
              <button
                ref={triggerRef}
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={`${user.name || user.email} — account menu`}
                className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center hover:ring-2 hover:ring-primary-200 transition overflow-hidden"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden="true">{initials}</span>
                )}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Account menu"
                  className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-card-hover overflow-hidden text-sm"
                >
                  <div className="px-4 py-3 border-b" role="presentation">
                    <p className="font-medium text-gray-900 truncate">{user?.name || user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <Link role="menuitem" to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50">
                    My Profile
                  </Link>
                  <Link role="menuitem" to="/pricing" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 md:hidden">
                    Pricing
                  </Link>
                  {user?.role === "seeker" && (
                    <Link role="menuitem" to="/worker-profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50">
                      Worker Profile
                    </Link>
                  )}
                  {user?.role === "vendor" && (
                    <Link role="menuitem" to="/vendor/onboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50">
                      Vendor Onboarding
                    </Link>
                  )}
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
