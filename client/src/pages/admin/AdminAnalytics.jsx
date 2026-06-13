import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";
import { useGetAnalyticsQuery, useListActivityLogsQuery } from "../../store/jobsApi.js";
import Pagination from "../../components/Pagination.jsx";

const COLORS = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

const StatCard = ({ label, value, accent }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${accent || "text-gray-900"}`}>{value}</p>
  </div>
);

function mergeTrends(trends) {
  const map = new Map();
  const series = ["userSignups", "vendorSignups", "jobPostings", "applications"];
  const labels = { userSignups: "Users", vendorSignups: "Vendors", jobPostings: "Jobs", applications: "Applications" };
  series.forEach((key) => {
    (trends?.[key] || []).forEach(({ date, count }) => {
      if (!map.has(date)) map.set(date, { date });
      map.get(date)[labels[key]] = count;
    });
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

const ACTION_COLOR = {
  signup: "text-green-700 bg-green-50",
  login: "text-blue-700 bg-blue-50",
};

export default function AdminAnalytics() {
  const { data, isLoading, isFetching } = useGetAnalyticsQuery(undefined, { pollingInterval: 15000 });
  const [logPage, setLogPage] = useState(1);
  const { data: logsData, isLoading: logsLoading } = useListActivityLogsQuery({ page: logPage, limit: 10 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-xl" />
      </div>
    );
  }

  const totals = data?.totals || {};
  const trendData = mergeTrends(data?.trends);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">Platform Analytics</h2>
        <span className="text-xs text-gray-400">
          {isFetching ? "Refreshing…" : "Live — updates every 15s"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totals.users ?? 0} />
        <StatCard label="Active Users" value={totals.activeUsers ?? 0} accent="text-green-600" />
        <StatCard label="Suspended Users" value={totals.suspendedUsers ?? 0} accent="text-red-600" />
        <StatCard label="Vendors" value={totals.vendors ?? 0} />
        <StatCard label="Open Jobs" value={totals.openJobs ?? 0} accent="text-primary-700" />
        <StatCard label="Total Jobs" value={totals.jobs ?? 0} />
        <StatCard label="Applications" value={totals.applications ?? 0} />
        <StatCard label="Payments Collected" value={`₹${((totals.paymentsTotal || 0) / 100).toFixed(2)}`} accent="text-green-600" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Growth — last 30 days</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Users" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Vendors" stroke={COLORS[1]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Jobs" stroke={COLORS[2]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Applications" stroke={COLORS[3]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Users by role</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data?.usersByRole || []}
                dataKey="count"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.role}: ${entry.count}`}
              >
                {(data?.usersByRole || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Vendors by status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data?.vendorsByStatus || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.status}: ${entry.count}`}
              >
                {(data?.vendorsByStatus || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Open jobs by district (top 10)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.jobsByDistrict || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="district" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">User activity logs (signups & logins)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">User agent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logsLoading && (
                <tr><td colSpan={6} className="px-3 py-3 text-gray-500">Loading...</td></tr>
              )}
              {logsData?.items?.map((log) => (
                <tr key={log._id}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-900">
                    <div className="font-medium">{log.name}</div>
                    <div className="text-xs text-gray-500">{log.email} · {log.role}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLOR[log.action] || "bg-gray-50 text-gray-600"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{log.ip}</td>
                  <td className="px-3 py-2 text-gray-600">{log.location || "—"}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={log.userAgent}>{log.userAgent}</td>
                </tr>
              ))}
              {!logsLoading && !logsData?.items?.length && (
                <tr><td colSpan={6} className="px-3 py-3 text-gray-500">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={logPage} pages={logsData?.pages} onChange={setLogPage} />
      </div>
    </div>
  );
}
