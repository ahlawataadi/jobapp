import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useGetAdminConfigQuery,
  useUpdateAdminConfigMutation,
  useListAdminVendorsQuery,
  useUpdateVendorStatusMutation,
  useListAdminUsersQuery,
  useUpdateUserStatusMutation,
  useAdminCreateUserMutation,
  useAdminCreateVendorMutation,
  useAdminCreateJobMutation,
  useListEtlRunsQuery,
  useSetUserSubscriptionMutation,
} from "../store/jobsApi.js";
import { JOB_TYPE_OPTIONS, PAY_UNIT_OPTIONS } from "../constants/jobTypes.js";
import Pagination from "../components/Pagination.jsx";

const ETL_STATUS_COLOR = {
  success: "text-green-700 bg-green-50",
  failed: "text-red-700 bg-red-50",
};

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function AdminPanel() {
  const { data: configData } = useGetAdminConfigQuery();
  const [updateConfig, { isLoading: savingConfig }] = useUpdateAdminConfigMutation();
  const [updateVendorStatus] = useUpdateVendorStatusMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [etlPage, setEtlPage] = useState(1);
  const { data: etlData } = useListEtlRunsQuery({ page: etlPage, limit: 10 });
  const [adminCreateUser, { isLoading: creatingUser, error: createUserError }] = useAdminCreateUserMutation();
  const [adminCreateVendor, { isLoading: creatingVendor, error: createVendorError }] = useAdminCreateVendorMutation();
  const [adminCreateJob, { isLoading: creatingJob, error: createJobError }] = useAdminCreateJobMutation();
  const [setUserSubscription] = useSetUserSubscriptionMutation();

  const [paymentRequired, setPaymentRequired] = useState(false);
  const [feeRupees, setFeeRupees] = useState(0);
  const [analyticsScript, setAnalyticsScript] = useState("");

  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorStatusFilter, setVendorStatusFilter] = useState("");
  const [vendorSort, setVendorSort] = useState("createdAt");
  const [vendorPage, setVendorPage] = useState(1);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userSort, setUserSort] = useState("createdAt");
  const [userPage, setUserPage] = useState(1);

  const { data: vendorsData } = useListAdminVendorsQuery({
    page: vendorPage,
    limit: 10,
    search: vendorSearch || undefined,
    status: vendorStatusFilter || undefined,
    sort: vendorSort,
  });
  const { data: usersData } = useListAdminUsersQuery({
    page: userPage,
    limit: 10,
    search: userSearch || undefined,
    role: userRoleFilter || undefined,
    sort: userSort,
  });

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", phone: "", role: "seeker" });
  const [newVendor, setNewVendor] = useState({ name: "", email: "", password: "", phone: "", orgName: "", industry: "", address: "", district: "", status: "active" });
  const [newJob, setNewJob] = useState({ vendorId: "", title: "", description: "", category: "", industry: "", district: "", city: "", jobType: "full-time", payUnit: "month", salaryMin: "", salaryMax: "" });
  const [newUserMsg, setNewUserMsg] = useState("");
  const [newVendorMsg, setNewVendorMsg] = useState("");
  const [newJobMsg, setNewJobMsg] = useState("");

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setNewUserMsg("");
    try {
      await adminCreateUser(newUser).unwrap();
      setNewUser({ name: "", email: "", password: "", phone: "", role: "seeker" });
      setNewUserMsg("User created successfully.");
    } catch {}
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setNewVendorMsg("");
    try {
      await adminCreateVendor(newVendor).unwrap();
      setNewVendor({ name: "", email: "", password: "", phone: "", orgName: "", industry: "", address: "", district: "", status: "active" });
      setNewVendorMsg("Vendor created successfully.");
    } catch {}
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setNewJobMsg("");
    try {
      await adminCreateJob({
        ...newJob,
        salaryMin: Number(newJob.salaryMin) || 0,
        salaryMax: Number(newJob.salaryMax) || 0,
      }).unwrap();
      setNewJob({ vendorId: "", title: "", description: "", category: "", industry: "", district: "", city: "", jobType: "full-time", payUnit: "month", salaryMin: "", salaryMax: "" });
      setNewJobMsg("Job listing created successfully.");
    } catch {}
  };

  useEffect(() => {
    if (configData?.config) {
      const c = configData.config;
      setPaymentRequired(c.paymentRequired);
      setFeeRupees((c.signupFeeAmount / 100).toFixed(2));
      setAnalyticsScript(c.analyticsScript || "");
    }
  }, [configData]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    await updateConfig({
      paymentRequired,
      signupFeeAmount: Math.round(Number(feeRupees) * 100),
      analyticsScript,
    });
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Platform Settings</h2>
        <form onSubmit={handleSaveConfig} className="space-y-3 text-sm">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              className="accent-primary-600 w-4 h-4"
              checked={paymentRequired}
              onChange={(e) => setPaymentRequired(e.target.checked)}
            />
            Require payment for vendor signup
          </label>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Fee amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className={`${inputCls} w-40`}
              value={feeRupees}
              onChange={(e) => setFeeRupees(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Analytics tracking code</label>
            <p className="text-xs text-gray-500 mb-1">
              Paste a tracking snippet (e.g. Google Analytics, Plausible). It will be injected into &lt;head&gt; on every page.
            </p>
            <textarea
              className={`${inputCls} w-full font-mono text-xs`}
              rows={4}
              placeholder="<script>...</script>"
              value={analyticsScript}
              onChange={(e) => setAnalyticsScript(e.target.value)}
            />
          </div>
          <button
            disabled={savingConfig}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
          >
            Save
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-bold text-gray-900">Vendors</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              className={`${inputCls} max-w-xs`}
              placeholder="Search by org, district, industry..."
              value={vendorSearch}
              onChange={(e) => { setVendorSearch(e.target.value); setVendorPage(1); }}
            />
            <select className={inputCls} value={vendorStatusFilter} onChange={(e) => { setVendorStatusFilter(e.target.value); setVendorPage(1); }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select className={inputCls} value={vendorSort} onChange={(e) => setVendorSort(e.target.value)}>
              <option value="createdAt">Newest first</option>
              <option value="orgName">Org name (A-Z)</option>
              <option value="district">District (A-Z)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-primary-50 text-gray-700">
              <th className="px-3 py-2 rounded-l-lg">Org</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2 rounded-r-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {vendorsData?.items?.map((v) => (
              <tr key={v._id} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">
                  <Link to={`/vendors/${v._id}`} className="hover:text-primary-700">{v.orgName}</Link>
                </td>
                <td className="px-3 py-2 text-gray-600">{v.district}</td>
                <td className="px-3 py-2 capitalize text-gray-600">{v.status}</td>
                <td className="px-3 py-2 text-gray-600">{v.paymentStatus}</td>
                <td className="px-3 py-2 flex items-center gap-2">
                  <Link to={`/vendors/${v._id}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">View</Link>
                  <select
                    value={v.status}
                    onChange={(e) => updateVendorStatus({ id: v._id, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </td>
              </tr>
            ))}
            {!vendorsData?.items?.length && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-gray-500">No vendors found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={vendorPage} pages={vendorsData?.pages} onChange={setVendorPage} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-bold text-gray-900">Users</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              className={`${inputCls} max-w-xs`}
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
            />
            <select className={inputCls} value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}>
              <option value="">All roles</option>
              <option value="seeker">Seeker</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
            <select className={inputCls} value={userSort} onChange={(e) => setUserSort(e.target.value)}>
              <option value="createdAt">Newest first</option>
              <option value="name">Name (A-Z)</option>
              <option value="email">Email (A-Z)</option>
            </select>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-primary-50 text-gray-700">
              <th className="px-3 py-2 rounded-l-lg">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Subscription</th>
              <th className="px-3 py-2 rounded-r-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.items?.map((u) => (
              <tr key={u._id} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
                <td className="px-3 py-2 text-gray-600">{u.email}</td>
                <td className="px-3 py-2 capitalize text-gray-600">{u.role}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${u.status === "suspended" ? "text-red-700 bg-red-50" : "text-green-700 bg-green-50"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <select
                      value={u.subscription?.plan || "none"}
                      onChange={(e) => setUserSubscription({ id: u._id, plan: e.target.value })}
                      className={`${inputCls} text-xs py-1`}
                    >
                      <option value="none">none</option>
                      <option value="basic">basic</option>
                      <option value="pro">pro</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                    {u.subscription?.expiresAt && u.subscription?.plan !== "none" && (
                      <span className="text-xs text-gray-400">
                        exp {new Date(u.subscription.expiresAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.role === "seeker" && (
                      <Link to={`/workers/${u._id}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">View</Link>
                    )}
                    {u.role === "vendor" && u.vendorId && (
                      <Link to={`/vendors/${u.vendorId}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">View</Link>
                    )}
                    {u.role === "admin" ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <button
                        onClick={() => updateUserStatus({ id: u._id, status: u.status === "suspended" ? "active" : "suspended" })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.status === "suspended"
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {u.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!usersData?.items?.length && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-gray-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={userPage} pages={usersData?.pages} onChange={setUserPage} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Add New User</h2>
        {newUserMsg && <p className="text-green-700 text-sm mb-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{newUserMsg}</p>}
        {createUserError && <p className="text-red-600 text-sm mb-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createUserError?.data?.message || "Failed to create user"}</p>}
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <input className={inputCls} placeholder="Name" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          <input className={inputCls} type="email" placeholder="Email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <input className={inputCls} type="password" placeholder="Password" required minLength={6} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
          <select className={inputCls} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            <option value="seeker">seeker</option>
            <option value="vendor">vendor</option>
            <option value="admin">admin</option>
          </select>
          <button disabled={creatingUser} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {creatingUser ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Add New Vendor</h2>
        {newVendorMsg && <p className="text-green-700 text-sm mb-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{newVendorMsg}</p>}
        {createVendorError && <p className="text-red-600 text-sm mb-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createVendorError?.data?.message || "Failed to create vendor"}</p>}
        <form onSubmit={handleCreateVendor} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <input className={inputCls} placeholder="Contact Name" required value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} />
          <input className={inputCls} type="email" placeholder="Email" required value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
          <input className={inputCls} type="password" placeholder="Password" required minLength={6} value={newVendor.password} onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
          <input className={inputCls} placeholder="Organization Name" required value={newVendor.orgName} onChange={(e) => setNewVendor({ ...newVendor, orgName: e.target.value })} />
          <input className={inputCls} placeholder="Industry" value={newVendor.industry} onChange={(e) => setNewVendor({ ...newVendor, industry: e.target.value })} />
          <input className={inputCls} placeholder="Address" value={newVendor.address} onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })} />
          <input className={inputCls} placeholder="District" required value={newVendor.district} onChange={(e) => setNewVendor({ ...newVendor, district: e.target.value })} />
          <select className={inputCls} value={newVendor.status} onChange={(e) => setNewVendor({ ...newVendor, status: e.target.value })}>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
          <button disabled={creatingVendor} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {creatingVendor ? "Creating..." : "Create Vendor"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Add New Job Listing</h2>
        {newJobMsg && <p className="text-green-700 text-sm mb-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{newJobMsg}</p>}
        {createJobError && <p className="text-red-600 text-sm mb-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createJobError?.data?.message || "Failed to create job"}</p>}
        <form onSubmit={handleCreateJob} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <select className={inputCls} required value={newJob.vendorId} onChange={(e) => setNewJob({ ...newJob, vendorId: e.target.value })}>
            <option value="">Select vendor...</option>
            {vendorsData?.items?.map((v) => (
              <option key={v._id} value={v._id}>{v.orgName}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Title" required value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
          <input className={inputCls} placeholder="Category" value={newJob.category} onChange={(e) => setNewJob({ ...newJob, category: e.target.value })} />
          <input className={inputCls} placeholder="Industry" value={newJob.industry} onChange={(e) => setNewJob({ ...newJob, industry: e.target.value })} />
          <input className={inputCls} placeholder="District" required value={newJob.district} onChange={(e) => setNewJob({ ...newJob, district: e.target.value })} />
          <input className={inputCls} placeholder="City" value={newJob.city} onChange={(e) => setNewJob({ ...newJob, city: e.target.value })} />
          <select className={inputCls} value={newJob.jobType} onChange={(e) => setNewJob({ ...newJob, jobType: e.target.value })}>
            {JOB_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className={inputCls} value={newJob.payUnit} onChange={(e) => setNewJob({ ...newJob, payUnit: e.target.value })}>
            {PAY_UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input className={inputCls} type="number" placeholder="Salary Min" value={newJob.salaryMin} onChange={(e) => setNewJob({ ...newJob, salaryMin: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Salary Max" value={newJob.salaryMax} onChange={(e) => setNewJob({ ...newJob, salaryMax: e.target.value })} />
          <textarea className={`${inputCls} sm:col-span-2 md:col-span-3`} placeholder="Description" rows={2} value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} />
          <button disabled={creatingJob} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            {creatingJob ? "Creating..." : "Create Job Listing"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card overflow-x-auto">
        <h2 className="font-bold text-gray-900 mb-3">ETL Status</h2>
        <p className="text-xs text-gray-500 mb-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Run <code className="bg-gray-100 px-1 rounded">npm run etl</code> in the server directory to fetch/normalize/dedupe lab
          listings and import them.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-primary-50 text-gray-700">
              <th className="px-3 py-2 rounded-l-lg">Started</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Fetched</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2 rounded-r-lg">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {etlData?.items?.map((run) => (
              <tr key={run._id} className="border-b border-gray-100">
                <td className="px-3 py-2 text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-gray-600">{run.source}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ETL_STATUS_COLOR[run.status] || "text-yellow-700 bg-yellow-50"}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{run.fetched}</td>
                <td className="px-3 py-2 text-gray-600">{run.created}</td>
                <td className="px-3 py-2 text-gray-600">{run.updated}</td>
                <td className="px-3 py-2 text-gray-600">{run.skipped}</td>
              </tr>
            ))}
            {!etlData?.items?.length && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-gray-500">
                  No ETL runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={etlPage} pages={etlData?.pages} onChange={setEtlPage} />
      </div>
    </>
  );
}
