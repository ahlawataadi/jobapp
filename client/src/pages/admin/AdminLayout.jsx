import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/banners", label: "Banners" },
  { to: "/admin/webhooks", label: "Webhooks" },
  { to: "/admin/import", label: "Import Data" },
  { to: "/admin/broadcasts/email", label: "Email Broadcast" },
  { to: "/admin/broadcasts/sms", label: "SMS Broadcast" },
  { to: "/admin/settings", label: "Settings" },
];

export default function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin</h1>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <nav className="md:w-48 shrink-0 md:sticky md:top-20 md:self-start">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible bg-white border border-gray-200 rounded-xl p-2 shadow-card">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="flex-1 min-w-0 space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
