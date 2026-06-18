import { useGetAdminConfigQuery } from "../store/jobsApi.js";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

export default function TermsAndConditions() {
  const { data, isLoading } = useGetAdminConfigQuery();
  const config = data?.config;
  const content = config?.termsContent || "";
  const hasContent = content && content !== "<p></p>";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-gray-700">
      {config?.termsImage && (
        <img
          src={config.termsImage}
          alt="Terms & Conditions"
          className="w-full max-h-64 object-cover rounded-2xl shadow-card"
        />
      )}
      <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
      {isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
      ) : hasContent ? (
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      ) : (
        /* Static fallback if admin hasn't set content yet */
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Last updated: June 2026</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">1. Acceptance of terms</h2>
          <p>By creating an account or using Haryana Job Marketplace, you agree to these terms and conditions and our Privacy Policy.</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">2. Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Vendors are responsible for the accuracy of job postings and organization details.</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">3. Job postings &amp; applications</h2>
          <p>Job postings must accurately represent the role offered. Job seekers may apply to any number of listings. We do not guarantee employment outcomes.</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">4. Payments</h2>
          <p>Vendor signup fees, where applicable, are processed via our payment gateway and are non-refundable except as required by law or at our discretion.</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">5. Termination</h2>
          <p>We may suspend or terminate accounts that violate these terms, post fraudulent listings, or misuse the platform.</p>
          <h2 className="text-lg font-semibold text-gray-900 pt-2">6. Changes</h2>
          <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
        </div>
      )}
    </div>
  );
}
