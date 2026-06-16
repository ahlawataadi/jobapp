import { Link } from "react-router-dom";
import { categoryLabel } from "../constants/categories.js";

const PAY_SUFFIX = { hourly: "/hr", daily: "/day", monthly: "/mo", fixed: "" };

function formatWorkerPay(wp) {
  if (!wp) return null;
  const rate = wp.payPreference === "hourly" ? wp.hourlyRate : wp.dailyRate;
  if (!rate) return null;
  return `₹${Number(rate).toLocaleString("en-IN")}${PAY_SUFFIX[wp.payPreference] || ""}`;
}

export default function WorkerCard({ worker }) {
  const wp = worker.workerProfile || {};
  const initials = (worker.name || "?")[0].toUpperCase();
  const pay = formatWorkerPay(wp);

  return (
    <Link
      to={`/workers/${worker._id}`}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex gap-3"
    >
      <div className="shrink-0">
        {worker.avatarUrl ? (
          <img src={worker.avatarUrl} alt={worker.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 truncate">{worker.name}</p>
          <div className="flex gap-1 shrink-0">
            {wp.verificationBadge && (
              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
            )}
            {wp.featured && (
              <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {categoryLabel(wp.skillCategory)}
          {wp.location?.district ? ` · ${wp.location.district}` : ""}
        </p>
        {wp.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {wp.skills.slice(0, 3).map((s) => (
              <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
            ))}
            {wp.skills.length > 3 && (
              <span className="text-xs text-gray-400">+{wp.skills.length - 3}</span>
            )}
          </div>
        )}
        {pay && (
          <p className="text-xs text-accent-600 font-semibold mt-2">{pay}</p>
        )}
      </div>
    </Link>
  );
}
