import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../store/jobsApi.js";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: params.get("email") || "",
    token: params.get("token") || "",
    password: "",
  });
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await resetPassword(form).unwrap();
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-card-hover border border-gray-100">
        <div className="text-center mb-6">
          <span className="inline-flex bg-primary-600 text-white w-12 h-12 rounded-xl items-center justify-center font-bold text-xl mb-3">
            H
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your reset token and a new password.</p>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        {message && (
          <p className="text-green-700 text-sm mb-3 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reset token</label>
            <input
              required
              className={inputCls}
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={6}
              className={inputCls}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
