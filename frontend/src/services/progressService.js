import api from "./api";

export async function fetchProgress() {
  const { data } = await api.get("/api/progress");
  return data; // { overview, weekly, monthly, subjects }
}
