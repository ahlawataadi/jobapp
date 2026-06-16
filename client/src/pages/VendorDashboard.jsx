import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  useMyVendorQuery,
  useMyJobsQuery,
  useCreateJobMutation,
  useDeleteJobMutation,
  useJobApplicantsQuery,
  useUpdateApplicationStatusMutation,
  useImportMyJobsMutation,
} from "../store/jobsApi.js";
import RazorpayCheckout from "../components/RazorpayCheckout.jsx";
import { JOB_TYPE_OPTIONS, PAY_UNIT_OPTIONS } from "../constants/jobTypes.js";

const emptyJob = {
  title: "",
  description: "",
  category: "",
  industry: "",
  district: "",
  city: "",
  jobType: "full-time",
  payUnit: "month",
  salaryMin: "",
  salaryMax: "",
};

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const STATUS_BADGE = {
  active: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  suspended: "bg-red-50 text-red-700",
};

export default function VendorDashboard() {
  const { data: vendorData, isLoading: vendorLoading, error: vendorError } = useMyVendorQuery();
  const { data: jobsData } = useMyJobsQuery(undefined, { skip: !vendorData });
  const [createJob, { isLoading: creating, error: createError }] = useCreateJobMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [form, setForm] = useState(emptyJob);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("");

  if (vendorLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (vendorError?.status === 404) return <Navigate to="/vendor/onboard" replace />;

  const vendor = vendorData?.vendor;

  const handleCreate = async (e) => {
    e.preventDefault();
    await createJob({
      ...form,
      salaryMin: Number(form.salaryMin) || 0,
      salaryMax: Number(form.salaryMax) || 0,
    }).unwrap();
    setForm(emptyJob);
  };

  const filteredJobs = (jobsData?.items || []).filter((job) => {
    if (jobStatusFilter && job.status !== jobStatusFilter) return false;
    const s = jobSearch.trim().toLowerCase();
    if (!s) return true;
    return job.title?.toLowerCase().includes(s) || job.location?.district?.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vendor?.orgName}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {vendor?.district}
              {vendor?.paymentStatus !== "not_required" && ` · Payment: ${vendor?.paymentStatus}`}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${STATUS_BADGE[vendor?.status] || "bg-gray-100 text-gray-700"}`}>
            {vendor?.status}
          </span>
        </div>
        {vendor?.status === "pending" && vendor?.paymentStatus === "pending" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Complete payment to activate your account and start posting jobs.</p>
            <RazorpayCheckout onSuccess={() => window.location.reload()} />
          </div>
        )}
      </div>

      {vendor?.status === "active" && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
            <h2 className="font-bold text-gray-900 mb-3">Post a New Job</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Title"
                required
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                placeholder="Category"
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <input
                placeholder="Industry"
                className={inputCls}
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
              <select
                className={inputCls}
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
              >
                {JOB_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={form.payUnit}
                onChange={(e) => setForm({ ...form, payUnit: e.target.value })}
                title="What the salary range is per"
              >
                {PAY_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                placeholder="District"
                required
                className={inputCls}
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
              <input
                placeholder="City"
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <input
                type="number"
                placeholder="Min salary"
                className={inputCls}
                value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max salary"
                className={inputCls}
                value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              />
              <textarea
                placeholder="Description"
                required
                rows={3}
                className={`${inputCls} md:col-span-2`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <button
                disabled={creating}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold md:col-span-2 transition-colors"
              >
                {creating ? "Posting..." : "Post Job"}
              </button>
              {createError && (
                <p className="text-red-600 text-sm md:col-span-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createError?.data?.message}</p>
              )}
            </form>
          </div>

          <JobImportCard />

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <h2 className="font-bold text-gray-900">My Job Postings</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search by title or district..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
                <select className={inputCls} value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div key={job._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-600">{job.location?.district} · <span className="capitalize">{job.status}</span></p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveJobId(activeJobId === job._id ? null : job._id)}
                        className="text-primary-700 text-sm font-medium hover:underline"
                      >
                        {activeJobId === job._id ? "Hide applicants" : "View applicants"}
                      </button>
                      <button onClick={() => deleteJob(job._id)} className="text-red-600 text-sm font-medium hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                  {activeJobId === job._id && <Applicants jobId={job._id} />}
                </div>
              ))}
              {jobsData?.items?.length === 0 && <p className="text-sm text-gray-500">No jobs posted yet.</p>}
              {jobsData?.items?.length > 0 && filteredJobs.length === 0 && (
                <p className="text-sm text-gray-500">No jobs match your filters.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function JobImportCard() {
  const [importMyJobs, { isLoading }] = useImportMyJobsMutation();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      setResult(await importMyJobs(fd).unwrap());
    } catch (err) {
      setError(err?.data?.message || "Import failed");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
      <h2 className="font-bold text-gray-900">Bulk import jobs (CSV)</h2>
      <p className="text-sm text-gray-500">Header columns:</p>
      <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto">
        title,description,category,industry,district,city,salaryMin,salaryMax,jobType,payUnit
      </code>
      <button
        type="button"
        onClick={() => {
          const csv =
            "title,description,category,industry,district,city,salaryMin,salaryMax,jobType,payUnit\n" +
            "Helper needed,Daily wage helper for a site,Construction,Labour,Gurugram,Sector 5,500,700,daily-wage,day";
          const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "jobs-template.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }}
        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
      >
        ↓ Download CSV template
      </button>
      <form onSubmit={submit} className="flex items-center gap-3 flex-wrap">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
        <button
          disabled={!file || isLoading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {isLoading ? "Importing..." : "Upload & Import"}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      {result && (
        <p className="text-sm bg-green-50 border border-green-100 text-green-800 rounded-lg px-3 py-2">
          Created: {result.created} · Skipped: {result.skipped}
        </p>
      )}
    </div>
  );
}

function Applicants({ jobId }) {
  const { data } = useJobApplicantsQuery(jobId);
  const [updateStatus] = useUpdateApplicationStatusMutation();

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      {data?.items?.length === 0 && <p className="text-sm text-gray-500">No applicants yet.</p>}
      {data?.items?.map((a) => (
        <div key={a._id} className="border border-gray-100 bg-gray-50 rounded-lg p-3 flex justify-between items-center text-sm gap-3">
          <div>
            <p className="font-medium text-gray-900">{a.userId?.name}</p>
            <p className="text-gray-600">{a.userId?.email} · {a.userId?.phone}</p>
            {a.coverNote && <p className="text-gray-600 italic mt-1">"{a.coverNote}"</p>}
          </div>
          <select
            value={a.status}
            onChange={(e) => updateStatus({ id: a._id, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-400 outline-none shrink-0"
          >
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      ))}
    </div>
  );
}
