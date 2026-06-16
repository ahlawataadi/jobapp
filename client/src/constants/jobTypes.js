export const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "hourly", label: "Hourly" },
  { value: "daily-wage", label: "Daily wage" },
  { value: "on-demand", label: "On-demand" },
  { value: "freelance", label: "Freelance" },
];

export const PAY_UNIT_OPTIONS = [
  { value: "month", label: "Per month" },
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "fixed", label: "Fixed / project" },
];

export const jobTypeLabel = (v) => JOB_TYPE_OPTIONS.find((o) => o.value === v)?.label || v || "";

const PAY_UNIT_SUFFIX = { month: "/mo", hour: "/hr", day: "/day", fixed: "" };

// Human-friendly pay string, e.g. "₹200–₹350/hr", "₹600/day", "₹25,000/mo".
export function formatPay({ salaryMin, salaryMax, payUnit } = {}) {
  const suffix = PAY_UNIT_SUFFIX[payUnit] ?? "";
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  if (!salaryMin && !salaryMax) return payUnit === "fixed" ? "Negotiable" : "Not disclosed";
  if (salaryMin && salaryMax && salaryMin !== salaryMax) return `${fmt(salaryMin)}–${fmt(salaryMax)}${suffix}`;
  return `${fmt(salaryMax || salaryMin)}${suffix}`;
}
