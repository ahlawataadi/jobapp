import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useListAdminVendorsQuery,
  useAdminCreateJobMutation,
  useGetJobsQuery,
} from "../../store/jobsApi.js";
import { JOB_TYPE_OPTIONS, PAY_UNIT_OPTIONS, jobTypeLabel, formatPay } from "../../constants/jobTypes.js";

const input =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";
const label = "block text-sm font-semibold text-gray-700 mb-1";

const EMPTY = {
  vendorId: "",
  title: "",
  description: "",
  category: "",
  industry: "",
  district: "",
  city: "",
  salaryMin: "",
  salaryMax: "",
  jobType: "full-time",
  payUnit: "month",
};

export default function AdminJobs() {
  const { data: vendorsData } = useListAdminVendorsQuery({ limit: 100, status: "active" });
  const { data: jobsData, refetch } = useGetJobsQuery({ limit: 10, sort: "recent" });
  const [createJob, { isLoading }] = useAdminCreateJobMutation();
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const body = {
        ...form,
        salaryMin: Number(form.salaryMin) || 0,
        salaryMax: Number(form.salaryMax) || 0,
      };
      const res = await createJob(body).unwrap();
      setMsg(`Created "${res.job.title}".`);
      setForm({ ...EMPTY });
      refetch();
    } catch (e2) {
      setErr(e2?.data?.message || "Could not create job");
    }
  };

  const vendors = vendorsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">Add a job</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Vendor *</label>
              <select className={input} value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)} required>
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.orgName}
                    {v.district ? ` · ${v.district}` : ""}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No active vendors yet — create one first.</p>
              )}
            </div>
            <div>
              <label className={label}>Title *</label>
              <input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={label}>Description *</label>
            <textarea className={input} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Category</label>
              <input className={input} value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div>
              <label className={label}>Industry</label>
              <input className={input} value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
            <div>
              <label className={label}>District *</label>
              <input className={input} value={form.district} onChange={(e) => set("district", e.target.value)} required />
            </div>
            <div>
              <label className={label}>City</label>
              <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Job type</label>
              <select className={input} value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
                {JOB_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Pay unit</label>
              <select className={input} value={form.payUnit} onChange={(e) => set("payUnit", e.target.value)}>
                {PAY_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Pay min (₹)</label>
              <input type="number" min="0" className={input} value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} />
            </div>
            <div>
              <label className={label}>Pay max (₹)</label>
              <input type="number" min="0" className={input} value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} />
            </div>
          </div>

          {err && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}
          {msg && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{msg}</p>}

          <button
            disabled={isLoading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {isLoading ? "Creating…" : "Create job"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">Recent jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Vendor</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Pay</th>
                <th className="py-2 pr-3">District</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(jobsData?.items || []).map((j) => (
                <tr key={j._id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-900">{j.title}</td>
                  <td className="py-2 pr-3 text-gray-600">{j.vendorSummary?.orgName}</td>
                  <td className="py-2 pr-3">{jobTypeLabel(j.jobType)}</td>
                  <td className="py-2 pr-3">{formatPay(j)}</td>
                  <td className="py-2 pr-3 text-gray-600">{j.location?.district}</td>
                  <td className="py-2">
                    <Link to={`/jobs/${j._id}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">View</Link>
                  </td>
                </tr>
              ))}
              {(!jobsData?.items || jobsData.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-4 text-gray-400 text-center">
                    No jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
