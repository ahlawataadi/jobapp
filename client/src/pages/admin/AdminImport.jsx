import { useState } from "react";
import {
  useImportUsersMutation,
  useImportVendorsMutation,
  useImportJobsMutation,
} from "../../store/jobsApi.js";
import { downloadCsv } from "../../api/download.js";

function downloadTemplate(filename, columns, exampleRow) {
  const csv = `${columns.join(",")}\n${exampleRow || ""}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function ImportCard({ title, columns, sampleRow, note, onImport, isLoading }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await onImport(formData).unwrap();
      setResult(res);
    } catch (err) {
      setError(err?.data?.message || "Import failed");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">Upload a CSV with header row containing these columns:</p>
      <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto">
        {columns.join(",")}
      </code>
      <p className="text-xs text-gray-400">Example row: {sampleRow}</p>
      {note && <p className="text-xs text-gray-400">{note}</p>}
      <button
        type="button"
        onClick={() => downloadTemplate(`${title.replace(/\s+/g, "-").toLowerCase()}-template.csv`, columns, sampleRow)}
        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
      >
        ↓ Download CSV template
      </button>

      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <button
          disabled={!file || isLoading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {isLoading ? "Importing..." : "Upload & Import"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {result && (
        <div className="text-sm bg-green-50 border border-green-100 text-green-800 rounded-lg p-3 space-y-1">
          <p>
            Created: {result.created} · Skipped: {result.skipped}
          </p>
          {result.errors?.length > 0 && (
            <ul className="list-disc list-inside text-xs text-green-700 max-h-32 overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ExportPanel() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (kind) => {
    setError("");
    setBusy(kind);
    try {
      await downloadCsv(`/admin/export/${kind}`, `${kind}.csv`);
    } catch (e) {
      setError(e?.response?.data?.message || `Could not export ${kind}`);
    } finally {
      setBusy("");
    }
  };

  const Btn = ({ kind, children }) => (
    <button
      onClick={() => run(kind)}
      disabled={!!busy}
      className="border border-gray-300 hover:border-primary-400 hover:text-primary-700 disabled:opacity-60 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
    >
      {busy === kind ? "Exporting…" : children}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
      <h2 className="font-bold text-gray-900">Export data</h2>
      <p className="text-sm text-gray-500">Download a CSV snapshot of your records.</p>
      <div className="flex flex-wrap gap-3">
        <Btn kind="users">Export Users</Btn>
        <Btn kind="vendors">Export Vendors</Btn>
        <Btn kind="jobs">Export Jobs</Btn>
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}

export default function AdminImport() {
  const [importUsers, { isLoading: importingUsers }] = useImportUsersMutation();
  const [importVendors, { isLoading: importingVendors }] = useImportVendorsMutation();
  const [importJobs, { isLoading: importingJobs }] = useImportJobsMutation();

  return (
    <div className="space-y-6">
      <ExportPanel />
      <ImportCard
        title="Import Users"
        columns={["name", "email", "password", "phone", "role"]}
        sampleRow="Ravi Kumar,ravi@example.com,Pass@1234,9876543210,seeker"
        onImport={importUsers}
        isLoading={importingUsers}
      />
      <ImportCard
        title="Import Vendors"
        columns={["name", "email", "password", "phone", "orgName", "industry", "address", "district", "status"]}
        sampleRow="Sunita Devi,sunita@acme.com,Pass@1234,9876543211,Acme Pvt Ltd,Manufacturing,Sector 5,Gurugram,active"
        onImport={importVendors}
        isLoading={importingVendors}
      />
      <ImportCard
        title="Import Jobs"
        columns={["vendorId", "title", "description", "category", "industry", "district", "city", "salaryMin", "salaryMax", "jobType", "payUnit"]}
        sampleRow="VENDOR_ID,Helper needed,Daily wage helper for a site,Construction,Labour,Gurugram,Sector 5,500,700,daily-wage,day"
        note="Tip: replace the vendorId column with vendorOrgName or vendorEmail if you don't have IDs. jobType: full-time/part-time/contract/internship/hourly/daily-wage/on-demand/freelance · payUnit: month/hour/day/fixed"
        onImport={importJobs}
        isLoading={importingJobs}
      />
    </div>
  );
}
