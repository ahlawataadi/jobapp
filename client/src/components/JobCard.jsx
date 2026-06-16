import { Link } from "react-router-dom";
import { jobTypeLabel, formatPay } from "../constants/jobTypes.js";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function JobCard({ job, selected, onToggleCompare }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify(job));
    e.dataTransfer.effectAllowed = "copy";
  };

  const initial = (job.vendorSummary?.orgName || job.title || "?")[0].toUpperCase();

  return (
    <div
      className={`group border rounded-xl p-4 bg-white shadow-card hover:shadow-card-hover transition-shadow cursor-grab active:cursor-grabbing ${
        selected ? "ring-2 ring-green-500 border-green-500" : "border-gray-200"
      }`}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <Link to={`/jobs/${job._id}`} className="font-semibold text-lg text-gray-900 hover:text-primary-700 truncate">
              {job.title}
            </Link>
            {onToggleCompare && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => onToggleCompare(job)}
                  className="accent-primary-600"
                />
                Compare
              </label>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">
            {job.vendorSummary?.orgName}
            {job.location?.district && <span className="text-gray-400"> · {job.location.district}</span>}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-3 line-clamp-2">{job.description}</p>

      <div className="flex flex-wrap gap-2 text-xs mt-3">
        {job.category && (
          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{job.category}</span>
        )}
        {job.jobType && (
          <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
            {jobTypeLabel(job.jobType)}
          </span>
        )}
        {(job.salaryMin || job.salaryMax || job.payUnit === "fixed") && (
          <span className="bg-accent-50 text-accent-600 px-2.5 py-1 rounded-full font-medium">
            {formatPay(job)}
          </span>
        )}
        {job.vendorSummary?.avgRating > 0 && (
          <span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">
            ★ {job.vendorSummary.avgRating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{job.createdAt ? `Posted ${timeAgo(job.createdAt)}` : ""}</span>
        <Link
          to={`/jobs/${job._id}`}
          className="text-primary-700 text-sm font-semibold group-hover:underline"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}
