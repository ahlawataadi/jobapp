import { useParams, Link } from "react-router-dom";
import { useGetVendorQuery, useListReviewsQuery } from "../store/jobsApi.js";

export default function VendorProfile() {
  const { id } = useParams();
  const { data, isLoading, error } = useGetVendorQuery(id);
  const { data: reviewsData } = useListReviewsQuery(id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-24 w-full rounded-xl" />
        <div className="skeleton h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (error) return <p className="max-w-3xl mx-auto px-4 py-6 text-red-600">Vendor not found.</p>;

  const vendor = data?.vendor;
  const initial = (vendor.orgName || "?")[0].toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Link to="/jobs" className="text-primary-700 hover:underline text-sm font-medium">
        ← Browse jobs
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-700 font-bold text-xl flex items-center justify-center shrink-0">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.orgName}</h1>
          <p className="text-gray-600">{vendor.industry} · {vendor.district}</p>
          <p className="text-sm text-gray-500 mt-1">{vendor.address}</p>
          <p className="text-yellow-600 mt-2 font-medium">
            {vendor.avgRating > 0 ? `★ ${vendor.avgRating.toFixed(1)}` : "No ratings yet"}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-3">Reviews</h2>
        {reviewsData?.items?.length ? (
          <ul className="space-y-3 text-sm">
            {reviewsData.items.map((r) => (
              <li key={r._id} className="border-b border-gray-100 pb-2">
                <span className="text-yellow-600">{"★".repeat(r.rating)}</span>{" "}
                <span className="text-gray-700">{r.comment}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
