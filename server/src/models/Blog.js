import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true }, // HTML / rich text
    coverImage: { type: String, default: "" },
    tags: { type: [String], default: [] },
    category: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, default: "" },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

blogSchema.index({ title: "text", content: "text", tags: "text" });
blogSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.model("Blog", blogSchema);
