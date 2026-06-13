import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetAdminConfigQuery,
  useVendorSignupMutation,
  useUploadVendorDocumentsMutation,
} from "../store/jobsApi.js";
import RazorpayCheckout from "../components/RazorpayCheckout.jsx";

const STEPS = ["Organization", "Documents", "Payment"];
const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {STEPS.map((label, idx) => (
        <div key={label} className="flex-1 flex items-center">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              idx < step
                ? "bg-green-500 text-white"
                : idx === step
                ? "bg-primary-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {idx + 1}
          </div>
          <span className={`ml-2 text-xs ${idx === step ? "text-gray-900 font-semibold" : "text-gray-500"}`}>{label}</span>
          {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
        </div>
      ))}
    </div>
  );
}

export default function VendorOnboard() {
  const { data: configData } = useGetAdminConfigQuery();
  const [signup, { isLoading: signingUp, error: signupError }] = useVendorSignupMutation();
  const [uploadDocs, { isLoading: uploading }] = useUploadVendorDocumentsMutation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ orgName: "", industry: "", address: "", district: "" });
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const paymentRequired = configData?.config?.paymentRequired;

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    const res = await signup(form).unwrap().catch((err) => {
      throw err;
    });
    setResult(res);
    setStep(1);
  };

  const handleDocsSubmit = async (e) => {
    e.preventDefault();
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((f) => formData.append("documents", f));
      await uploadDocs(formData).unwrap().catch(() => {});
    }

    if (result?.paymentRequired) {
      setStep(2);
    } else {
      navigate("/vendor");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 mb-10 bg-white p-8 rounded-2xl shadow-card-hover border border-gray-100 space-y-4">
      <div className="text-center mb-2">
        <span className="inline-flex bg-primary-600 text-white w-12 h-12 rounded-xl items-center justify-center font-bold text-xl mb-2">
          H
        </span>
        <h1 className="text-xl font-bold text-gray-900">Vendor Onboarding</h1>
      </div>
      <StepIndicator step={step} />

      {paymentRequired && step === 0 && (
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
          A signup fee of ₹{(configData.config.signupFeeAmount / 100).toFixed(2)} applies and will
          be collected after document upload.
        </p>
      )}

      {step === 0 && (
        <form onSubmit={handleOrgSubmit} className="space-y-3">
          <input
            placeholder="Organization name"
            required
            className={inputCls}
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
          />
          <input
            placeholder="Industry (e.g. Diagnostics, IT Services)"
            className={inputCls}
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
          <input
            placeholder="Address"
            className={inputCls}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            placeholder="District (e.g. Gurugram)"
            required
            className={inputCls}
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
          <button
            disabled={signingUp}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {signingUp ? "Submitting..." : "Continue"}
          </button>
          {signupError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{signupError?.data?.message}</p>
          )}
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleDocsSubmit} className="space-y-3">
          <p className="text-sm text-gray-600">
            Upload registration certificate, GST/PAN, or other verification documents
            (PDF/JPG/PNG, max 5 files).
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium"
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
          {files.length > 0 && (
            <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
              {files.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
          <button
            disabled={uploading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {uploading ? "Uploading..." : result?.paymentRequired ? "Continue to payment" : "Finish"}
          </button>
          <button
            type="button"
            onClick={() => (result?.paymentRequired ? setStep(2) : navigate("/vendor"))}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
          >
            Skip for now
          </button>
        </form>
      )}

      {step === 2 && result?.paymentRequired && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Complete payment to activate your vendor account.</p>
          <RazorpayCheckout onSuccess={() => navigate("/vendor")} />
        </div>
      )}
    </div>
  );
}
