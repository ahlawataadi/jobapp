import { useEffect, useRef, useState } from "react";
import {
  useGetAdminConfigQuery,
  useUpdateAdminConfigMutation,
  useUploadAboutImageMutation,
  useUploadContactImageMutation,
  useUploadTermsImageMutation,
  useUploadPrivacyImageMutation,
} from "../../store/jobsApi.js";
import RichTextEditor from "../../components/RichTextEditor.jsx";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const TABS = [
  { key: "about",   label: "About Us" },
  { key: "contact", label: "Contact Us" },
  { key: "terms",   label: "Terms & Conditions" },
  { key: "privacy", label: "Privacy Policy" },
];

function ImageUploader({ label, currentUrl, onUpload, uploading }) {
  const ref = useRef(null);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-24 h-16 object-cover rounded-lg border border-gray-200 shadow-sm" />
        ) : (
          <div className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">No image</div>
        )}
        <div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); if (ref.current) ref.current.value = ""; }} />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="bg-white border border-gray-300 hover:border-primary-400 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : currentUrl ? "Replace image" : "Upload image"}
          </button>
          {currentUrl && <p className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">{currentUrl.split("/").pop()}</p>}
        </div>
      </div>
    </div>
  );
}

function SaveBtn({ saving, label = "Save page" }) {
  return (
    <button
      disabled={saving}
      className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

export default function AdminPages() {
  const [activeTab, setActiveTab] = useState("about");
  const { data: configData, isLoading } = useGetAdminConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateAdminConfigMutation();
  const [uploadAboutImage,   { isLoading: upAbout }]   = useUploadAboutImageMutation();
  const [uploadContactImage, { isLoading: upContact }] = useUploadContactImageMutation();
  const [uploadTermsImage,   { isLoading: upTerms }]   = useUploadTermsImageMutation();
  const [uploadPrivacyImage, { isLoading: upPrivacy }] = useUploadPrivacyImageMutation();

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Per-page state
  const [aboutContent, setAboutContent] = useState("");
  const [contactContent, setContactContent] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");

  useEffect(() => {
    if (!configData?.config) return;
    const c = configData.config;
    setAboutContent(c.aboutUs || "");
    setContactContent(c.contact?.message || "");
    setContactEmail(c.contact?.email || "");
    setContactPhone(c.contact?.phone || "");
    setContactAddress(c.contact?.address || "");
    setTermsContent(c.termsContent || "");
    setPrivacyContent(c.privacyContent || "");
  }, [configData]);

  const flash = (ok, text) => { setMsg(""); setErr(""); ok ? setMsg(text) : setErr(text); };

  const handleImageUpload = async (mutationFn, file) => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      await mutationFn(fd).unwrap();
      flash(true, "Image uploaded.");
    } catch {
      flash(false, "Image upload failed.");
    }
  };

  const saveAbout = async (e) => {
    e.preventDefault();
    try {
      await updateConfig({ aboutUs: aboutContent }).unwrap();
      flash(true, "About Us saved.");
    } catch { flash(false, "Save failed."); }
  };

  const saveContact = async (e) => {
    e.preventDefault();
    try {
      await updateConfig({ contact: { message: contactContent, email: contactEmail, phone: contactPhone, address: contactAddress } }).unwrap();
      flash(true, "Contact Us saved.");
    } catch { flash(false, "Save failed."); }
  };

  const saveTerms = async (e) => {
    e.preventDefault();
    try {
      await updateConfig({ termsContent }).unwrap();
      flash(true, "Terms & Conditions saved.");
    } catch { flash(false, "Save failed."); }
  };

  const savePrivacy = async (e) => {
    e.preventDefault();
    try {
      await updateConfig({ privacyContent }).unwrap();
      flash(true, "Privacy Policy saved.");
    } catch { flash(false, "Save failed."); }
  };

  if (isLoading) return <div className="skeleton h-64 rounded-xl" />;

  const cfg = configData?.config || {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Pages</h2>
        <p className="text-sm text-gray-500 mt-0.5">Edit content and featured images for public pages.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1.5 shadow-card overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveTab(t.key); setMsg(""); setErr(""); }}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Flash messages */}
      {msg && <p className="text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm">{msg}</p>}
      {err && <p className="text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">{err}</p>}

      {/* About Us */}
      {activeTab === "about" && (
        <form onSubmit={saveAbout} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-5">
          <h3 className="font-semibold text-gray-900">About Us</h3>
          <ImageUploader
            label="Featured image (shown at top of page)"
            currentUrl={cfg.aboutUsImage}
            onUpload={(f) => handleImageUpload(uploadAboutImage, f)}
            uploading={upAbout}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page content</label>
            <RichTextEditor value={aboutContent} onChange={setAboutContent} minHeight={280} />
          </div>
          <SaveBtn saving={saving} />
        </form>
      )}

      {/* Contact Us */}
      {activeTab === "contact" && (
        <form onSubmit={saveContact} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-5">
          <h3 className="font-semibold text-gray-900">Contact Us</h3>
          <ImageUploader
            label="Featured image (shown at top of page)"
            currentUrl={cfg.contactImage}
            onUpload={(f) => handleImageUpload(uploadContactImage, f)}
            uploading={upContact}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Intro message</label>
            <RichTextEditor value={contactContent} onChange={setContactContent} minHeight={160} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100">
            <div>
              <label className="block text-gray-600 mb-1">Email</label>
              <input className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Phone</label>
              <input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-600 mb-1">Address</label>
              <input className={inputCls} value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
            </div>
          </div>
          <SaveBtn saving={saving} />
        </form>
      )}

      {/* Terms & Conditions */}
      {activeTab === "terms" && (
        <form onSubmit={saveTerms} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-5">
          <h3 className="font-semibold text-gray-900">Terms &amp; Conditions</h3>
          <ImageUploader
            label="Featured image (shown at top of page)"
            currentUrl={cfg.termsImage}
            onUpload={(f) => handleImageUpload(uploadTermsImage, f)}
            uploading={upTerms}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page content</label>
            <RichTextEditor value={termsContent} onChange={setTermsContent} minHeight={320} />
          </div>
          <SaveBtn saving={saving} />
        </form>
      )}

      {/* Privacy Policy */}
      {activeTab === "privacy" && (
        <form onSubmit={savePrivacy} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-5">
          <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
          <ImageUploader
            label="Featured image (shown at top of page)"
            currentUrl={cfg.privacyImage}
            onUpload={(f) => handleImageUpload(uploadPrivacyImage, f)}
            uploading={upPrivacy}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page content</label>
            <RichTextEditor value={privacyContent} onChange={setPrivacyContent} minHeight={320} />
          </div>
          <SaveBtn saving={saving} />
        </form>
      )}
    </div>
  );
}
