import { useState } from "react";
import { useImportUsersMutation, useImportVendorsMutation } from "../../store/jobsApi.js";

function ImportCard({ title, columns, sampleRow, onImport, isLoading }) {
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
      <p className="text-sm text-gray-500">
        Upload a CSV with header row containing these columns:
      </p>
      <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto">
        {columns.join(",")}
      </code>
      <p className="text-xs text-gray-400">Example row: {sampleRow}</p>

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
          <p>Created: {result.created} · Skipped: {result.skipped}</p>
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

export default function AdminImport() {
  const [importUsers, { isLoading: importingUsers }] = useImportUsersMutation();
  const [importVendors, { isLoading: importingVendors }] = useImportVendorsMutation();

  return (
    <div className="space-y-6">
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
    </div>
  );
}
