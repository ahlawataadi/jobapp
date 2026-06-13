import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetJobQuery,
  useApplyToJobMutation,
  useListReviewsQuery,
  useCreateReviewMutation,
} from "../store/jobsApi.js";

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading } = useGetJobQuery(id);
  const [apply, { isLoading: applying, isSuccess, error }] = useApplyToJobMutation();
  const [coverNote, setCoverNote] = useState("");

  const job = data?.job;
  const { data: reviewData } = useListReviewsQuery(job?.vendorId, { skip: !job });
  const [createReview] = useCreateReviewMutation();
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-8 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-32 w-full rounded" />
      </div>
    );
  }
  if (!job) return <p className="text-center mt-8 text-gray-500">Job not found</p>;

  const handleApply = async (e) => {
    e.preventDefault();
    await apply({ id: job._id, coverNote });
  };

  const handleReview = async (e) => {
    e.preventDefault();
    await createReview({ vendorId: job.vendorId, ...reviewForm });
    setReviewForm({ rating: 5, comment: "" });
  };

  const initial = (job.vendorSummary?.orgName || job.title || "?")[0].toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-700 font-bold text-xl flex items-center justify-center shrink-0">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-600 mt-0.5">
              {job.vendorSummary?.orgName} · {job.location?.district}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs mt-4">
          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{job.category}</span>
          <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full capitalize">{job.jobType}</span>
          <span className="bg-accent-50 text-accent-600 px-2.5 py-1 rounded-full font-medium">
            ₹{job.salaryMin?.toLocaleString()} - ₹{job.salaryMax?.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h3 className="font-bold text-gray-900 mb-2">Job Description</h3>
        <p className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">{job.description}</p>
      </div>

      {user && user.role === "seeker" && (
        <form onSubmit={handleApply} className="border border-gray-200 rounded-xl p-6 bg-white shadow-card space-y-3">
          <h3 className="font-bold text-gray-900">Apply for this job</h3>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
            rows={3}
            placeholder="Cover note (optional)"
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
          />
          <button
            disabled={applying}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
          >
            {applying ? "Submitting..." : "Apply"}
          </button>
          {isSuccess && <p className="text-green-600 text-sm font-medium">Application submitted!</p>}
          {error && <p className="text-red-600 text-sm">{error?.data?.message}</p>}
        </form>
      )}
      {!user && (
        <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          Log in as a job seeker to apply.
        </p>
      )}

      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-card space-y-3">
        <h3 className="font-bold text-gray-900">Employer Reviews</h3>
        {reviewData?.items?.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
        {reviewData?.items?.map((r) => (
          <div key={r._id} className="border-b border-gray-100 pb-2">
            <p className="text-sm font-medium text-gray-900">{r.userId?.name} — <span className="text-yellow-600">★ {r.rating}</span></p>
            {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
          </div>
        ))}

        {user && (
          <form onSubmit={handleReview} className="space-y-2 pt-2">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              value={reviewForm.rating}
              onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} stars
                </option>
              ))}
            </select>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              rows={2}
              placeholder="Write a review..."
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            />
            <button className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
              Submit Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
