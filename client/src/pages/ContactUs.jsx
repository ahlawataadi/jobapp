import { useState } from "react";
import { useGetAdminConfigQuery } from "../store/jobsApi.js";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none";

export default function ContactUs() {
  const { data } = useGetAdminConfigQuery();
  const config = data?.config;
  const contact = config?.contact || {};
  const message = contact.message || "Have a question or need help? Reach out and our team will get back to you.";
  const isHtml = message.trimStart().startsWith("<");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {config?.contactImage && (
        <img
          src={config.contactImage}
          alt="Contact Us"
          className="w-full max-h-48 object-cover rounded-2xl shadow-card"
        />
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        {isHtml ? (
          <div
            className="prose prose-gray prose-sm max-w-none mt-2 text-gray-500"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(message) }}
          />
        ) : (
          <p className="text-gray-500 mt-1">{message}</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-1 text-sm text-gray-600">
        <p>Email: {contact.email || "support@jobmarketplace.example"}</p>
        <p>Phone: {contact.phone || "+91 8708730150"}</p>
        <p>Address: {contact.address || "India"}</p>
      </div>

      {submitted ? (
        <p className="bg-green-50 border border-green-100 text-green-700 rounded-lg px-4 py-3 text-sm">
          Thanks for reaching out! We'll get back to you soon.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-3">
          <input
            className={inputCls}
            placeholder="Your name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputCls}
            type="email"
            placeholder="Your email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <textarea
            className={inputCls}
            rows={4}
            placeholder="Message"
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
            Send message
          </button>
        </form>
      )}
    </div>
  );
}
