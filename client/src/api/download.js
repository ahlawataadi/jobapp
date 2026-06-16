import { api } from "./axios.js";

// Authenticated file download (carries the bearer token + refresh handling
// via the shared axios instance), then triggers a browser save.
export async function downloadCsv(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
