import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyApplicationsQuery } from "../store/jobsApi.js";

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  shortlisted: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  hired: "bg-green-50 text-green-700",
};

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function MyApplications() {
  const { data, isLoading } = useMyApplicationsQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = (data?.items || []).filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return a.jobId?.title?.toLowerCase().includes(s) || a.jobId?.vendorSummary?.orgName?.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h1>

      <div className="flex gap-3 flex-wrap">
        <input
          className={`${inputCls} flex-1 min-w-[200px]`}
          placeholder="Search by job title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white space-y-2">
            <div className="skeleton h-5 w-1/2 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
          </div>
        ))}

      {!isLoading && data?.items?.length === 0 && (
        <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">
          You haven't applied to any jobs yet.{" "}
          <Link to="/jobs" className="text-primary-700 font-semibold hover:underline">
            Browse jobs
          </Link>
        </p>
      )}

      {!isLoading && data?.items?.length > 0 && filtered.length === 0 && (
        <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">
          No applications match your filters.
        </p>
      )}

      {filtered.map((a) => (
        <Link
          to={`/jobs/${a.jobId?._id}`}
          key={a._id}
          className="border border-gray-200 rounded-xl p-4 bg-white shadow-card hover:shadow-card-hover transition-shadow flex justify-between items-center"
        >
          <div>
            <p className="font-semibold text-gray-900">{a.jobId?.title}</p>
            <p className="text-sm text-gray-600">
              {a.jobId?.vendorSummary?.orgName} · {a.jobId?.location?.district}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[a.status] || "bg-gray-100 text-gray-700"}`}>
            {a.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
