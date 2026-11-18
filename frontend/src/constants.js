export const CATEGORIES = [
  "Electrical",
  "Plumbing",
  "Maintenance",
  "IT / Network",
  "Sanitation",
  "Furniture",
  "Security",
  "Other",
];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const STATUSES = ["Pending", "Assigned", "In Progress", "Resolved"];

export function formatDateTime(ts) {
  if (!ts) return "—";
  const normalized = ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return ts;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusSlug(status) {
  return (status || "pending").toLowerCase().replace(/\s+/g, "-");
}

export function getPrioritySlug(priority) {
  return (priority || "medium").toLowerCase();
}
