import { useGetAdminConfigQuery } from "../store/jobsApi.js";

export default function AboutUs() {
  const { data, isLoading } = useGetAdminConfigQuery();
  const content = data?.config?.aboutUs || "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 text-gray-700">
      <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
      {isLoading ? (
        <div className="skeleton h-32 rounded-xl" />
      ) : (
        content.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
      )}
    </div>
  );
}
