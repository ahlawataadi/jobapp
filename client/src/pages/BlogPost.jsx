import { Link, useParams } from "react-router-dom";
import { useGetBlogBySlugQuery } from "../store/jobsApi.js";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

export default function BlogPost() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useGetBlogBySlugQuery(slug);
  const post = data?.post;

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-400">Loading…</div>;
  }
  if (isError || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3">
        <p className="text-gray-500">Post not found.</p>
        <Link to="/blog" className="text-primary-600 font-medium">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/blog" className="text-sm text-primary-600 hover:text-primary-800">
        ← Back to blog
      </Link>
      {post.coverImage && (
        <img src={post.coverImage} alt="" className="w-full rounded-xl mt-4 mb-6 object-cover max-h-96" />
      )}
      <h1 className="text-3xl font-bold text-gray-900 mt-4">{post.title}</h1>
      <p className="text-sm text-gray-400 mt-2">
        {post.authorName ? `By ${post.authorName} · ` : ""}
        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
      </p>
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags.map((t) => (
            <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}
      {/* Content is authored by trusted admins. */}
      <div
        className="blog-content mt-6 text-gray-800 leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary-600 [&_a]:underline [&_img]:rounded-lg [&_img]:my-4"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
      />
    </article>
  );
}
