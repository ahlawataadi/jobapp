import { useEffect, useRef, useState } from "react";
import {
  useListAdminBlogsQuery,
  useGetAdminBlogQuery,
  useCreateBlogMutation,
  useGenerateBlogMutation,
  useUpdateBlogMutation,
  useDeleteBlogMutation,
  useImportBlogsMutation,
} from "../../store/jobsApi.js";

const BLOG_CATEGORIES = [
  { value: "", label: "— General —" },
  { value: "career-tips", label: "Career Tips" },
  { value: "industry-news", label: "Industry News" },
  { value: "government-jobs", label: "Government Jobs" },
  { value: "haryana", label: "Haryana Focus" },
  { value: "agriculture", label: "Agriculture" },
  { value: "technology", label: "Technology" },
  { value: "lifestyle", label: "Lifestyle" },
];

const input =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";
const label = "block text-sm font-semibold text-gray-700 mb-1";

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "",
  tags: "",
  status: "draft",
};

export default function AdminBlog() {
  const { data, refetch } = useListAdminBlogsQuery({ limit: 50 });
  const [editingId, setEditingId] = useState(null);
  const { data: full } = useGetAdminBlogQuery(editingId, { skip: !editingId });
  const [createBlog, { isLoading: creating }] = useCreateBlogMutation();
  const [generateBlog, { isLoading: generating }] = useGenerateBlogMutation();
  const [updateBlog, { isLoading: updating }] = useUpdateBlogMutation();
  const [deleteBlog] = useDeleteBlogMutation();
  const [importBlogs, { isLoading: importing }] = useImportBlogsMutation();
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (editingId && full?.post) {
      const p = full.post;
      setForm({
        title: p.title || "",
        slug: p.slug || "",
        excerpt: p.excerpt || "",
        content: p.content || "",
        coverImage: p.coverImage || "",
        category: p.category || "",
        tags: (p.tags || []).join(", "),
        status: p.status || "draft",
      });
    }
  }, [editingId, full]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setMsg("");
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const body = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    try {
      if (editingId) {
        await updateBlog({ id: editingId, ...body }).unwrap();
        setMsg("Post updated.");
      } else {
        await createBlog(body).unwrap();
        setMsg("Post created.");
        setForm({ ...EMPTY });
      }
      refetch();
    } catch (e2) {
      setErr(e2?.data?.message || "Save failed");
    }
  };

  const handleGenerate = async () => {
    setErr("");
    setMsg("");
    try {
      const res = await generateBlog().unwrap();
      setEditingId(res.post._id); // load the generated draft into the editor
      setMsg(`Generated "${res.post.title}" as a ${res.post.status}. Review, edit and publish below.`);
      refetch();
    } catch (e2) {
      setErr(e2?.data?.message || "Generation failed");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await deleteBlog(id).unwrap();
      if (editingId === id) reset();
      refetch();
    } catch (e2) {
      setErr(e2?.data?.message || "Delete failed");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErr("");
    setImportMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await importBlogs(fd).unwrap();
      setImportMsg(`Imported ${res.created} posts, skipped ${res.skipped}.${res.errors.length ? ` Errors: ${res.errors.slice(0, 3).join("; ")}` : ""}`);
      refetch();
    } catch (e2) {
      setImportErr(e2?.data?.message || "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const posts = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-bold text-gray-900">{editingId ? "Edit post" : "New post"}</h2>
          <div className="flex items-center gap-3">
            {editingId && (
              <button onClick={reset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                + New post
              </button>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              title="Generate a draft from the automation engine"
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {generating ? "Generating…" : "⚡ Generate post now"}
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={label}>Title *</label>
            <input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Slug (optional — auto from title)</label>
              <input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="my-post-title" />
            </div>
            <div>
              <label className={label}>Category</label>
              <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Excerpt (shown in listings)</label>
            <input className={input} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </div>
          <div>
            <label className={label}>Content * (HTML allowed)</label>
            <textarea className={`${input} font-mono`} rows={12} value={form.content} onChange={(e) => set("content", e.target.value)} required />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Tags (comma-separated)</label>
              <input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="jobs, hiring, haryana" />
            </div>
            <div>
              <label className={label}>Cover image URL</label>
              <input className={input} value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="w-48">
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {err && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}
          {msg && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">{msg}</p>}

          <div className="flex gap-3">
            <button
              disabled={creating || updating}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {editingId ? (updating ? "Saving…" : "Save changes") : creating ? "Creating…" : "Create post"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-2">Import posts from CSV</h2>
        <p className="text-xs text-gray-500 mb-3">
          CSV columns: <code className="bg-gray-100 px-1 rounded">title, content, excerpt, coverImage, category, tags, status, slug</code>.
          Rows missing title or content are skipped. Status must be <em>published</em> or defaults to <em>draft</em>.
        </p>
        {importMsg && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">{importMsg}</p>}
        {importErr && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{importErr}</p>}
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} disabled={importing} className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 cursor-pointer" />
          {importing && <span className="text-sm text-gray-500">Importing…</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
        <h2 className="font-bold text-gray-900 mb-4">All posts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Updated</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p._id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-900">{p.title}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ""}</td>
                  <td className="py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingId(p._id)} className="text-primary-600 hover:text-primary-800 font-medium">
                      Edit
                    </button>
                    {p.status === "published" && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900">
                        View
                      </a>
                    )}
                    <button onClick={() => onDelete(p._id)} className="text-red-600 hover:text-red-800 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-400 text-center">
                    No posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
