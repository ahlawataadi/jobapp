import DOMPurify from "dompurify";

// Sanitize admin-authored HTML (blog posts, About/Contact/Terms/Privacy pages)
// before injecting it via dangerouslySetInnerHTML. Strips <script>, event
// handlers (onerror/onload/...) and other XSS vectors while keeping the
// formatting and images the rich text editor produces.
export function sanitizeHtml(html) {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), { USE_PROFILES: { html: true } });
}
