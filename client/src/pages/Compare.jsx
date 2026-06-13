import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCompareJobsMutation } from "../store/jobsApi.js";

const ROWS = [
  { label: "Employer", render: (j) => j.vendorSummary?.orgName },
  { label: "District", render: (j) => j.location?.district },
  { label: "Salary", render: (j) => `₹${j.salaryMin?.toLocaleString()} - ₹${j.salaryMax?.toLocaleString()}` },
  { label: "Job Type", render: (j) => <span className="capitalize">{j.jobType}</span> },
  { label: "Category", render: (j) => j.category },
];

export default function Compare() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [compare, { data, isLoading }] = useCompareJobsMutation();

  useEffect(() => {
    if (ids.length) compare(ids);
  }, [params]);

  if (!ids.length)
    return (
      <div className="text-center mt-16">
        <p className="text-gray-500 mb-3">No jobs selected for comparison.</p>
        <Link to="/jobs" className="text-primary-700 font-semibold hover:underline">
          Browse jobs
        </Link>
      </div>
    );
  if (isLoading) return <p className="text-center mt-8 text-gray-500">Loading...</p>;

  const jobs = data?.jobs || [];
  const vendors = data?.vendors || [];
  const vendorById = Object.fromEntries(vendors.map((v) => [v._id, v]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 overflow-x-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Compare Jobs</h1>
      <table className="min-w-full bg-white text-sm rounded-xl shadow-card overflow-hidden border border-gray-200">
        <thead>
          <tr className="bg-primary-50">
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Field</th>
            {jobs.map((j) => (
              <th key={j._id} className="px-4 py-3 text-left border-b border-gray-200">
                <Link to={`/jobs/${j._id}`} className="font-semibold text-primary-700 hover:underline">
                  {j.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 ? "bg-gray-50" : "bg-white"}>
              <td className="px-4 py-3 font-medium text-gray-700 border-b border-gray-100">{row.label}</td>
              {jobs.map((j) => (
                <td key={j._id} className="px-4 py-3 border-b border-gray-100 text-gray-800">
                  {row.render(j) || "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr className={ROWS.length % 2 ? "bg-gray-50" : "bg-white"}>
            <td className="px-4 py-3 font-medium text-gray-700">Employer Rating</td>
            {jobs.map((j) => (
              <td key={j._id} className="px-4 py-3 text-yellow-600 font-medium">
                {vendorById[j.vendorId]?.avgRating ? `★ ${vendorById[j.vendorId].avgRating.toFixed(1)}` : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
