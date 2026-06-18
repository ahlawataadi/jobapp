import { useGetAdminConfigQuery } from "../store/jobsApi.js";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

export default function AboutUs() {
  const { data, isLoading } = useGetAdminConfigQuery();
  const config = data?.config;
  const content = config?.aboutUs || "";
  const isHtml = content.trimStart().startsWith("<");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-gray-700">
      {config?.aboutUsImage && (
        <img
          src={config.aboutUsImage}
          alt="About Us"
          className="w-full max-h-64 object-cover rounded-2xl shadow-card"
        />
      )}
      <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
      {isLoading ? (
        <div className="skeleton h-32 rounded-xl" />
      ) : isHtml ? (
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      ) : (
        content.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
      )}
    </div>
  );
}
