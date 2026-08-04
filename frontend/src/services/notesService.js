import api from "./api";

export async function uploadNote(file, subject) {
  const formData = new FormData();
  formData.append("file", file);
  if (subject) formData.append("subject", subject);

  const { data } = await api.post("/api/notes/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchNotes() {
  const { data } = await api.get("/api/notes");
  return data;
}

export async function fetchNote(noteId) {
  const { data } = await api.get(`/api/notes/${noteId}`);
  return data;
}

export async function deleteNote(noteId) {
  await api.delete(`/api/notes/${noteId}`);
}

export async function askNote(noteId, question) {
  const { data } = await api.post(`/api/notes/${noteId}/ask`, { question });
  return data;
}

export async function generateNoteSummary(noteId) {
  const { data } = await api.post(`/api/notes/${noteId}/summary`);
  return data;
}

export async function fetchNoteSummary(noteId) {
  const { data } = await api.get(`/api/notes/${noteId}/summary`);
  return data;
}
