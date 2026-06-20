import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../store/authSlice.js";
import {
  useUpdateMeMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useMyVendorQuery,
  useUploadVendorLogoMutation,
  useRemoveVendorLogoMutation,
} from "../store/jobsApi.js";
import SeekerSignupFeePrompt from "../components/SeekerSignupFeePrompt.jsx";

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

function Avatar({ url, name, size = "w-20 h-20", textSize = "text-2xl" }) {
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover border border-gray-200`} />;
  }
  return (
    <div className={`${size} rounded-full bg-primary-100 text-primary-700 font-bold ${textSize} flex items-center justify-center`}>
      {initials}
    </div>
  );
}

export default function Profile() {
  const { user, accessToken } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  const [updateMe, { isLoading: savingProfile }] = useUpdateMeMutation();
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation();
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadAvatarMutation();
  const [removeAvatar] = useRemoveAvatarMutation();

  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  const isVendor = user?.role === "vendor";
  const isAdmin = user?.role === "admin";
  const { data: vendorData } = useMyVendorQuery(undefined, { skip: !isVendor });
  const [uploadLogo, { isLoading: uploadingLogo }] = useUploadVendorLogoMutation();
  const [removeLogo] = useRemoveVendorLogoMutation();
  const vendor = vendorData?.vendor;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    try {
      const { user: updated } = await updateMe(form).unwrap();
      dispatch(setCredentials({ user: updated, accessToken }));
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileErr(err?.data?.message || "Failed to update profile");
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    try {
      const data = await changePassword(pwForm).unwrap();
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      setPwForm({ currentPassword: "", newPassword: "" });
      setPwMsg("Password changed successfully.");
    } catch (err) {
      setPwErr(err?.data?.message || "Failed to change password");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const { user: updated } = await uploadAvatar(fd).unwrap();
      dispatch(setCredentials({ user: updated, accessToken }));
    } catch {}
    e.target.value = "";
  };

  const handleAvatarRemove = async () => {
    try {
      const { user: updated } = await removeAvatar().unwrap();
      dispatch(setCredentials({ user: updated, accessToken }));
    } catch {}
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    try {
      await uploadLogo(fd).unwrap();
    } catch {}
    e.target.value = "";
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <SeekerSignupFeePrompt />

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">Profile picture</h2>
        <div className="flex items-center gap-4">
          <Avatar url={user.avatarUrl} name={user.name} />
          <div className="flex flex-col gap-2">
            <label className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer text-center transition-colors">
              {uploadingAvatar ? "Uploading..." : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            {user.avatarUrl && (
              <button
                onClick={handleAvatarRemove}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Subscription</h2>
              {user.subscription?.plan && user.subscription.plan !== "none" ? (
                <p className="text-sm text-gray-500 mt-0.5 capitalize">
                  <span className={`inline-block mr-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.subscription.plan === "enterprise" ? "bg-gray-900 text-white" :
                    user.subscription.plan === "pro" ? "bg-primary-600 text-white" :
                    "bg-gray-100 text-gray-700"
                  }`}>{user.subscription.plan}</span>
                  {user.subscription.expiresAt && `Expires ${new Date(user.subscription.expiresAt).toLocaleDateString("en-IN")}`}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-0.5">No active plan — unlock intro video and premium features.</p>
              )}
            </div>
            <Link
              to="/pricing"
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              {user.subscription?.plan && user.subscription.plan !== "none" ? "Manage plan" : "View plans"}
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">Account details</h2>
        <form onSubmit={handleProfileSave} className="space-y-3">
          {profileMsg && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{profileMsg}</p>
          )}
          {profileErr && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{profileErr}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input className={`${inputCls} bg-gray-50 text-gray-500`} value={user.email} disabled />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
            <input className={`${inputCls} bg-gray-50 text-gray-500 capitalize`} value={user.role} disabled />
          </div>
          <button
            disabled={savingProfile}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
          >
            {savingProfile ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      {isVendor && vendor && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h2 className="font-bold text-gray-900 mb-4">Company logo</h2>
          <p className="text-sm text-gray-600 mb-3">{vendor.orgName}</p>
          <div className="flex items-center gap-4">
            <Avatar url={vendor.logoUrl} name={vendor.orgName} />
            <div className="flex flex-col gap-2">
              <label className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer text-center transition-colors">
                {uploadingLogo ? "Uploading..." : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              {vendor.logoUrl && (
                <button onClick={() => removeLogo()} className="text-sm font-medium text-red-600 hover:underline">
                  Reset to default
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">Change password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-3">
          {pwMsg && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{pwMsg}</p>
          )}
          {pwErr && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{pwErr}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current password</label>
            <input
              type="password"
              required
              className={inputCls}
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={6}
              className={inputCls}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
          </div>
          <button
            disabled={savingPassword}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
          >
            {savingPassword ? "Saving..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
