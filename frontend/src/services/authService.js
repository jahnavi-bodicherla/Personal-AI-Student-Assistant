import api from "./api";

export async function registerUser(payload) {
  const { data } = await api.post("/api/auth/register", payload);
  return data; // { user, tokens }
}

export async function loginUser(payload) {
  const { data } = await api.post("/api/auth/login", payload);
  return data; // { user, tokens }
}

export async function logoutUser() {
  await api.post("/api/auth/logout");
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/api/profile", payload);
  return data;
}
