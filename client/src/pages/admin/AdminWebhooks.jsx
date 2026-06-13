import { useState } from "react";
import {
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
} from "../../store/jobsApi.js";
import Pagination from "../../components/Pagination.jsx";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function AdminWebhooks() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListWebhooksQuery({ page, limit: 10 });
  const [createWebhook, { isLoading: creating, error: createError }] = useCreateWebhookMutation();
  const [updateWebhook] = useUpdateWebhookMutation();
  const [deleteWebhook] = useDeleteWebhookMutation();
  const [testWebhook, { isLoading: testing }] = useTestWebhookMutation();
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({ url: "", secret: "", events: [] });

  const availableEvents = data?.availableEvents || [];

  const toggleEvent = (event) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createWebhook(form).unwrap();
      setForm({ url: "", secret: "", events: [] });
    } catch {}
  };

  const handleTest = async (id) => {
    setMsg("");
    try {
      await testWebhook(id).unwrap();
      setMsg("Test event sent.");
    } catch {
      setMsg("Failed to send test event.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-2">Webhooks</h2>
        <p className="text-sm text-gray-500 mb-4">
          Register endpoints to receive real-time POST notifications for platform events (job postings, applications,
          payments, vendor/user changes). Each request includes an <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code>{" "}
          HMAC-SHA256 header (if a secret is set) computed over the raw JSON body.
        </p>

        {msg && <p className="text-sm mb-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2">{msg}</p>}
        {createError && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {createError?.data?.message || "Failed to create webhook"}
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-3 text-sm mb-6 border-b border-gray-100 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="https://example.com/webhook"
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Signing secret (optional)"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Events</p>
            <div className="flex flex-wrap gap-2">
              {availableEvents.map((ev) => (
                <label
                  key={ev}
                  className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                    form.events.includes(ev)
                      ? "bg-primary-50 border-primary-300 text-primary-700"
                      : "border-gray-300 text-gray-600 hover:border-primary-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <button disabled={creating} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {creating ? "Adding..." : "Add Webhook"}
          </button>
        </form>

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        <div className="space-y-3">
          {data?.items?.map((hook) => (
            <div key={hook._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 break-all">{hook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {hook.events.map((ev) => (
                      <span key={ev} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ev}</span>
                    ))}
                    {hook.events.length === 0 && <span className="text-xs text-gray-400">No events selected</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {hook.lastTriggeredAt
                      ? `Last triggered ${new Date(hook.lastTriggeredAt).toLocaleString()} — status ${hook.lastStatus}`
                      : "Never triggered"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      className="accent-primary-600"
                      checked={hook.isActive}
                      onChange={(e) => updateWebhook({ id: hook._id, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    disabled={testing}
                    onClick={() => handleTest(hook._id)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:border-primary-300"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => deleteWebhook(hook._id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && !data?.items?.length && <p className="text-sm text-gray-500">No webhooks configured yet.</p>}
        </div>
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </div>
    </div>
  );
}
