import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../api/axios.js";
import { setCredentials } from "../store/authSlice.js";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center text-lg tracking-widest focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function VerifyOtp() {
  const location = useLocation();
  const { userId, channel, devOtp } = location.state || {};
  const [code, setCode] = useState(devOtp || "");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(devOtp ? `Email/SMS not configured yet — using dev code: ${devOtp}` : "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 text-center">
        <p className="text-gray-600">
          Nothing to verify. <Link to="/login" className="text-primary-700 font-semibold hover:underline">Go to login</Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { userId, code });
      dispatch(setCredentials(data));
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const { data } = await api.post("/auth/resend-otp", { userId, channel });
      if (data.verified) {
        // Couldn't deliver a code, so the backend activated the account directly.
        // resend-otp doesn't issue tokens, so send the user to log in instead.
        navigate("/login", { state: { activated: true } });
        return;
      }
      setInfo(data.devOtp ? `Email/SMS not configured yet — using dev code: ${data.devOtp}` : data.message);
      if (data.devOtp) setCode(data.devOtp);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-card-hover border border-gray-100 text-center">
        <span className="inline-flex bg-primary-600 text-white w-12 h-12 rounded-xl items-center justify-center font-bold text-xl mb-3">
          H
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Verify your account</h1>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Enter the 6-digit code sent to your {channel === "phone" ? "phone" : "email"}.
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        {info && (
          <p className="text-blue-700 text-sm mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{info}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            required
            className={inputCls}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-primary-700 font-semibold hover:underline mt-4 disabled:opacity-60"
        >
          {resending ? "Resending..." : "Resend code"}
        </button>
      </div>
    </div>
  );
}
