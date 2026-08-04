export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;

  if (!detail) return error?.message || fallback;

  // FastAPI validation errors return a list of {loc, msg, type}
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).join(" ");
  }

  return typeof detail === "string" ? detail : fallback;
}
