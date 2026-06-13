import { useState } from "react";
import {
  useListAdminPaymentsQuery,
  useRefundPaymentMutation,
  useUpdatePaymentMutation,
} from "../../store/jobsApi.js";
import Pagination from "../../components/Pagination.jsx";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const STATUS_STYLES = {
  created: "bg-gray-100 text-gray-700",
  paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-blue-50 text-blue-700",
  disputed: "bg-yellow-50 text-yellow-700",
};

export default function AdminPayments() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAdminPaymentsQuery({
    status: status || undefined,
    search: search || undefined,
    sort,
    page,
    limit: 10,
  });
  const [refundPayment, { isLoading: refunding }] = useRefundPaymentMutation();
  const [updatePayment] = useUpdatePaymentMutation();
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");

  const handleRefund = async (id) => {
    try {
      await refundPayment({ id, reason: refundReason || undefined }).unwrap();
      setRefundTarget(null);
      setRefundReason("");
    } catch {}
  };

  const totalCollected = (data?.items || [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = (data?.items || [])
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + p.refundAmount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Payments (page)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data?.total ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-xs font-medium text-gray-500 uppercase">Collected (page)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{(totalCollected / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-xs font-medium text-gray-500 uppercase">Refunded (page)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{(totalRefunded / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-bold text-gray-900">Payments</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              className={`${inputCls} max-w-xs`}
              placeholder="Search by order/payment ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="created">Created</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="disputed">Disputed</option>
            </select>
            <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="createdAt">Newest first</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-primary-50 text-gray-700">
              <th className="px-3 py-2 rounded-l-lg">Vendor</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Order ID</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 rounded-r-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && data?.items?.map((p) => (
              <tr key={p._id} className="border-b border-gray-100 align-top">
                <td className="px-3 py-2 font-medium text-gray-900">{p.vendorId?.orgName}</td>
                <td className="px-3 py-2 text-gray-600">
                  ₹{(p.amount / 100).toFixed(2)}
                  {p.status === "refunded" && (
                    <div className="text-xs text-blue-600">refunded ₹{(p.refundAmount / 100).toFixed(2)}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[p.status] || "bg-gray-100 text-gray-700"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 break-all">{p.razorpayOrderId}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{p.refundReason || p.notes || "—"}</td>
                <td className="px-3 py-2 space-y-1">
                  {p.status === "paid" && (
                    refundTarget === p._id ? (
                      <div className="space-y-1 min-w-[160px]">
                        <input
                          className={`${inputCls} text-xs w-full`}
                          placeholder="Refund reason"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                        />
                        <div className="flex gap-1">
                          <button
                            disabled={refunding}
                            onClick={() => handleRefund(p._id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded font-semibold disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRefundTarget(null); setRefundReason(""); }}
                            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setRefundTarget(p._id)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold"
                        >
                          Refund
                        </button>
                        <button
                          onClick={() => updatePayment({ id: p._id, status: "disputed" })}
                          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-semibold"
                        >
                          Mark disputed
                        </button>
                      </div>
                    )
                  )}
                  {p.status === "disputed" && (
                    <button
                      onClick={() => updatePayment({ id: p._id, status: "paid" })}
                      className="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold"
                    >
                      Resolve (mark paid)
                    </button>
                  )}
                  {!["paid", "disputed"].includes(p.status) && <span className="text-xs text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {!isLoading && !data?.items?.length && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-gray-500">No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </div>
    </div>
  );
}
