import { useState } from "react";
import { useListBroadcastsQuery, useCreateSmsBroadcastMutation } from "../../store/jobsApi.js";
import Pagination from "../../components/Pagination.jsx";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none w-full";

const AUDIENCES = [
  { value: "all", label: "All users (seekers + vendors)" },
  { value: "seekers", label: "Job seekers only" },
  { value: "vendors", label: "Vendors only" },
];

export default function AdminBroadcastSms() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListBroadcastsQuery({ channel: "sms", page, limit: 10 });
  const [createSmsBroadcast, { isLoading: sending, error }] = useCreateSmsBroadcastMutation();
  const [form, setForm] = useState({ title: "", description: "", audience: "all" });
  const [result, setResult] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult("");
    try {
      const res = await createSmsBroadcast(form).unwrap();
      setResult(`Sent to ${res.broadcast.sentCount} of ${res.broadcast.recipientCount} recipients.`);
      setForm({ title: "", description: "", audience: "all" });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">SMS Broadcast</h2>
        <p className="text-sm text-gray-500">
          Send an SMS announcement to all users, job seekers, or vendors with a registered phone number.
        </p>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error?.data?.message || "Failed to send broadcast"}
          </p>
        )}
        {result && (
          <p className="text-sm bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2">{result}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Title</label>
            <input
              className={inputCls}
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Message</label>
            <textarea
              rows={4}
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Audience</label>
            <select className={inputCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <button disabled={sending} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {sending ? "Sending..." : "Send SMS Broadcast"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Recent SMS Broadcasts</h2>
        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        <div className="space-y-3">
          {data?.broadcasts?.map((b) => (
            <div key={b._id} className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">{b.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                Audience: {b.audience} · Sent {b.sentCount}/{b.recipientCount} · {new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {!isLoading && !data?.broadcasts?.length && <p className="text-sm text-gray-500">No SMS broadcasts sent yet.</p>}
        </div>
        <div className="mt-4">
          <Pagination page={page} pages={data?.pages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
