import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../store/jobsApi.js";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      const data = await forgotPassword({ email }).unwrap();
      setResult(data);
    } catch (err) {
      setError(err?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-card-hover border border-gray-100">
        <div className="text-center mb-6">
          <span className="inline-flex bg-primary-600 text-white w-12 h-12 rounded-xl items-center justify-center font-bold text-xl mb-3">
            H
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your account email to get a reset link.</p>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {result ? (
          <div className="space-y-3 text-sm">
            <p className="text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{result.message}</p>
            {result.resetUrl && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 space-y-2">
                <p className="text-gray-600">
                  No email service is configured in this demo, so here's your reset link directly:
                </p>
                <Link to={result.resetUrl} className="text-primary-700 font-semibold hover:underline break-all">
                  {result.resetUrl}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className={inputCls}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-600 mt-4 text-center">
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
