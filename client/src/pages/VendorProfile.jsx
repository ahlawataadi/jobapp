import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetVendorQuery, useListReviewsQuery } from "../store/jobsApi.js";

export default function VendorProfile() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{vendor.orgName}</h1>
          <p className="text-gray-600">{vendor.industry} · {vendor.district}</p>
          <p className="text-sm text-gray-500 mt-1">{vendor.address}</p>
          <p className="text-yellow-600 mt-2 font-medium">
            {vendor.avgRating > 0 ? `★ ${vendor.avgRating.toFixed(1)}` : "No ratings yet"}
          </p>
          {user && vendor.userId && String(user.id || user._id) !== String(vendor.userId) && (
            <button
              onClick={() => navigate(`/chat/${vendor.userId}`)}
              className="mt-3 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
              </svg>
              Chat with Employer
            </button>
          )}
          {!user && (
            <Link to="/login" className="mt-3 inline-flex items-center gap-2 border border-primary-600 text-primary-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors">
              Log in to message
            </Link>
          )}
        </div>
      </div>

      {vendor.profileVideoUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h2 className="font-bold text-gray-900 mb-3">Intro Video</h2>
          <video src={vendor.profileVideoUrl} controls className="w-full rounded-lg max-h-64 bg-black" />
        </div>
      )}

      {vendor.businesses?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h2 className="font-bold text-gray-900 mb-3">Other Businesses</h2>
          <div className="space-y-2">
            {vendor.businesses.map((b) => (
              <div key={b._id} className="border border-gray-100 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-900">{b.name}</p>
                {(b.industry || b.district) && (
                  <p className="text-gray-500 mt-0.5">{[b.industry, b.district].filter(Boolean).join(" · ")}</p>
                )}
                {b.address && <p className="text-gray-400 text-xs mt-0.5">{b.address}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

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
