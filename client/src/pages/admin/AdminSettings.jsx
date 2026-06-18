import { useEffect, useState } from "react";
import {
  useGetIntegrationSettingsQuery,
  useUpdateIntegrationSettingsMutation,
  useGetAdminConfigQuery,
  useUpdateAdminConfigMutation,
  useUploadLogoMutation,
} from "../../store/jobsApi.js";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

const SECTIONS = {
  smtp: { host: "", port: 587, secure: false, user: "", pass: "", fromName: "Haryana Job Marketplace", fromEmail: "" },
  sms: { provider: "twilio", apiUrl: "", apiKey: "", senderId: "", accountSid: "", authToken: "", fromNumber: "" },
  paymentGateway: { provider: "razorpay", keyId: "", keySecret: "", webhookSecret: "" },
  s3Storage: { enabled: false, bucket: "", region: "", accessKeyId: "", secretAccessKey: "", publicUrl: "" },
};

const BRANDING_DEFAULTS = { siteName: "", siteTitle: "", metaDescription: "" };
const OTP_DEFAULTS = { emailEnabled: true, smsEnabled: true };
const MAPS_DEFAULTS = { googleMapsApiKey: "" };

export default function AdminSettings() {
  const { data, isLoading } = useGetIntegrationSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateIntegrationSettingsMutation();
  const [smtp, setSmtp] = useState(SECTIONS.smtp);
  const [sms, setSms] = useState(SECTIONS.sms);
  const [paymentGateway, setPaymentGateway] = useState(SECTIONS.paymentGateway);
  const [s3Storage, setS3Storage] = useState(SECTIONS.s3Storage);
  const [savedMsg, setSavedMsg] = useState("");

  const { data: configData, isLoading: configLoading } = useGetAdminConfigQuery();
  const [updateConfig, { isLoading: savingBranding }] = useUpdateAdminConfigMutation();
  const [uploadLogo, { isLoading: uploadingLogo }] = useUploadLogoMutation();
  const [branding, setBranding] = useState(BRANDING_DEFAULTS);
  const [otpSettings, setOtpSettings] = useState(OTP_DEFAULTS);
  const [maps, setMaps] = useState(MAPS_DEFAULTS);

  useEffect(() => {
    if (data) {
      setSmtp({ ...SECTIONS.smtp, ...data.smtp });
      setSms({ ...SECTIONS.sms, ...data.sms });
      setPaymentGateway({ ...SECTIONS.paymentGateway, ...data.paymentGateway });
      setS3Storage({ ...SECTIONS.s3Storage, ...data.s3Storage });
    }
  }, [data]);

  useEffect(() => {
    if (configData?.config) {
      setBranding({ ...BRANDING_DEFAULTS, ...configData.config });
      setOtpSettings({ ...OTP_DEFAULTS, ...configData.config.otpSettings });
      setMaps({ googleMapsApiKey: configData.config.googleMapsApiKey || "" });
    }
  }, [configData]);

  const save = async (section, payload) => {
    setSavedMsg("");
    try {
      await updateSettings({ [section]: payload }).unwrap();
      setSavedMsg(`${section} settings saved.`);
    } catch {
      setSavedMsg(`Failed to save ${section} settings.`);
    }
  };

  const saveBranding = async () => {
    setSavedMsg("");
    try {
      await updateConfig(branding).unwrap();
      setSavedMsg("Branding settings saved.");
    } catch {
      setSavedMsg("Failed to save branding settings.");
    }
  };

  const saveOtpSettings = async () => {
    setSavedMsg("");
    try {
      await updateConfig({ otpSettings }).unwrap();
      setSavedMsg("OTP verification settings saved.");
    } catch {
      setSavedMsg("Failed to save OTP verification settings.");
    }
  };

  const saveMaps = async () => {
    setSavedMsg("");
    try {
      await updateConfig({ googleMapsApiKey: maps.googleMapsApiKey }).unwrap();
      setSavedMsg("Google Maps API key saved.");
    } catch {
      setSavedMsg("Failed to save Google Maps API key.");
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavedMsg("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      await uploadLogo(formData).unwrap();
      setSavedMsg("Logo uploaded.");
    } catch {
      setSavedMsg("Failed to upload logo.");
    }
  };

  if (isLoading || configLoading) {
    return <div className="skeleton h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {savedMsg && (
        <p className="text-sm bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2">{savedMsg}</p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">Branding & SEO</h2>
        <p className="text-sm text-gray-500">
          Controls the site logo (shown in the navbar), the browser tab title, and the meta description used by
          search engines.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Site name</label>
            <input className={inputCls} value={branding.siteName} onChange={(e) => setBranding({ ...branding, siteName: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Site title (browser tab / SEO title)</label>
            <input className={inputCls} value={branding.siteTitle} onChange={(e) => setBranding({ ...branding, siteTitle: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Meta description</label>
            <textarea rows={3} className={inputCls} value={branding.metaDescription} onChange={(e) => setBranding({ ...branding, metaDescription: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {configData?.config?.logoUrl && (
                <img src={configData.config.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              )}
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} className="text-sm" />
            </div>
          </div>
        </div>
        <button
          disabled={savingBranding}
          onClick={saveBranding}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {savingBranding ? "Saving..." : "Save branding settings"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">OTP verification</h2>
        <p className="text-sm text-gray-500">
          Control whether new signups and unverified logins require an email or SMS one-time-passcode. If both are
          disabled, accounts are activated immediately without verification.
        </p>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={otpSettings.emailEnabled}
              onChange={(e) => setOtpSettings({ ...otpSettings, emailEnabled: e.target.checked })}
            />
            Email OTP verification enabled
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={otpSettings.smsEnabled}
              onChange={(e) => setOtpSettings({ ...otpSettings, smsEnabled: e.target.checked })}
            />
            SMS OTP verification enabled
          </label>
        </div>
        <button
          disabled={savingBranding}
          onClick={saveOtpSettings}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {savingBranding ? "Saving..." : "Save OTP settings"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">Google Maps</h2>
        <p className="text-sm text-gray-500">
          API key used for location autocomplete (address/city/state search) across the site.
        </p>
        <div className="text-sm">
          <label className="block text-gray-600 mb-1">Google Maps API key</label>
          <input
            className={inputCls}
            value={maps.googleMapsApiKey}
            onChange={(e) => setMaps({ googleMapsApiKey: e.target.value })}
          />
        </div>
        <button
          disabled={savingBranding}
          onClick={saveMaps}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {savingBranding ? "Saving..." : "Save Google Maps key"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">Email (SMTP) settings</h2>
        <p className="text-sm text-gray-500">
          Used to send password reset links and application status notifications. Once filled in, emails are sent
          automatically — no code changes needed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">SMTP Host</label>
            <input className={inputCls} placeholder="smtp.gmail.com" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">SMTP Port</label>
            <input className={inputCls} type="number" placeholder="587" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">SMTP Username</label>
            <input className={inputCls} value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">SMTP Password</label>
            <input className={inputCls} type="password" value={smtp.pass} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">From Name</label>
            <input className={inputCls} value={smtp.fromName} onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">From Email</label>
            <input className={inputCls} type="email" value={smtp.fromEmail} onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-gray-700 sm:col-span-2">
            <input type="checkbox" className="accent-primary-600" checked={smtp.secure} onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })} />
            Use TLS/SSL (secure connection)
          </label>
        </div>
        <button
          disabled={saving}
          onClick={() => save("smtp", smtp)}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save SMTP settings"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">SMS gateway settings (OTP verification)</h2>
        <p className="text-sm text-gray-500">
          Used to send OTP codes for phone-based signup/login verification. Twilio is used by default — just fill in
          your Account SID, Auth Token and From Number below and SMS will start sending automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Twilio Account SID</label>
            <input className={inputCls} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={sms.accountSid} onChange={(e) => setSms({ ...sms, accountSid: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Twilio Auth Token</label>
            <input className={inputCls} type="password" value={sms.authToken} onChange={(e) => setSms({ ...sms, authToken: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Twilio From Number</label>
            <input className={inputCls} placeholder="+1XXXXXXXXXX" value={sms.fromNumber} onChange={(e) => setSms({ ...sms, fromNumber: e.target.value })} />
          </div>
        </div>

        <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
          Or, use a generic HTTP SMS gateway instead (used if Twilio fields above are left blank). The API URL may use
          placeholders <code className="bg-gray-100 px-1 rounded">{"{apiKey}"}</code>,{" "}
          <code className="bg-gray-100 px-1 rounded">{"{senderId}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{to}"}</code> and{" "}
          <code className="bg-gray-100 px-1 rounded">{"{message}"}</code>, substituted automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Provider name</label>
            <input className={inputCls} placeholder="Fast2SMS / MSG91 / etc." value={sms.provider} onChange={(e) => setSms({ ...sms, provider: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Sender ID</label>
            <input className={inputCls} value={sms.senderId} onChange={(e) => setSms({ ...sms, senderId: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">API URL template</label>
            <input className={inputCls} placeholder="https://api.example.com/send?key={apiKey}&to={to}&msg={message}&sender={senderId}" value={sms.apiUrl} onChange={(e) => setSms({ ...sms, apiUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">API Key</label>
            <input className={inputCls} type="password" value={sms.apiKey} onChange={(e) => setSms({ ...sms, apiKey: e.target.value })} />
          </div>
        </div>
        <button
          disabled={saving}
          onClick={() => save("sms", sms)}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save SMS settings"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">Payment gateway settings</h2>
        <p className="text-sm text-gray-500">
          Razorpay credentials used for vendor signup fee payments. Falls back to environment variables if left blank.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Provider</label>
            <input className={inputCls} value={paymentGateway.provider} onChange={(e) => setPaymentGateway({ ...paymentGateway, provider: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Key ID</label>
            <input className={inputCls} value={paymentGateway.keyId} onChange={(e) => setPaymentGateway({ ...paymentGateway, keyId: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Key Secret</label>
            <input className={inputCls} type="password" value={paymentGateway.keySecret} onChange={(e) => setPaymentGateway({ ...paymentGateway, keySecret: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Webhook Secret</label>
            <input className={inputCls} type="password" value={paymentGateway.webhookSecret} onChange={(e) => setPaymentGateway({ ...paymentGateway, webhookSecret: e.target.value })} />
          </div>
        </div>
        <button
          disabled={saving}
          onClick={() => save("paymentGateway", paymentGateway)}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save payment gateway settings"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
        <h2 className="font-bold text-gray-900">File storage (Amazon S3)</h2>
        <p className="text-sm text-gray-500">
          Store uploaded images and files (logos, avatars, page/editor images, vendor docs, videos) on Amazon S3
          instead of the server's local disk — required for hosts with an ephemeral or non-shared filesystem. When
          disabled, files stay on local disk and are served from <code className="bg-gray-100 px-1 rounded">/uploads</code>.
          See <code className="bg-gray-100 px-1 rounded">docs/S3_SETUP.md</code> for the full guide.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="accent-primary-600 w-4 h-4"
            checked={s3Storage.enabled}
            onChange={(e) => setS3Storage({ ...s3Storage, enabled: e.target.checked })}
          />
          Enable S3 storage
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Bucket name</label>
            <input className={inputCls} placeholder="haryana-jobapp-uploads" value={s3Storage.bucket} onChange={(e) => setS3Storage({ ...s3Storage, bucket: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Region</label>
            <input className={inputCls} placeholder="ap-south-1" value={s3Storage.region} onChange={(e) => setS3Storage({ ...s3Storage, region: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Access Key ID</label>
            <input className={inputCls} value={s3Storage.accessKeyId} onChange={(e) => setS3Storage({ ...s3Storage, accessKeyId: e.target.value })} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Secret Access Key</label>
            <input className={inputCls} type="password" value={s3Storage.secretAccessKey} onChange={(e) => setS3Storage({ ...s3Storage, secretAccessKey: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-600 mb-1">Public URL / CDN (optional)</label>
            <input className={inputCls} placeholder="https://dxxxx.cloudfront.net (leave blank to use the default bucket URL)" value={s3Storage.publicUrl} onChange={(e) => setS3Storage({ ...s3Storage, publicUrl: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Tip: leave Access Key / Secret blank to use the server's IAM role or environment credentials.
        </p>
        <button
          disabled={saving}
          onClick={() => save("s3Storage", s3Storage)}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save storage settings"}
        </button>
      </div>
    </div>
  );
}
