import api from "./api";

export async function sendMessage({ message, conversationId }) {
  const { data } = await api.post("/api/chat", {
    message,
    conversationId: conversationId || undefined,
  });
  return data; // { conversationId, title, message }
}

export async function fetchConversationHistory() {
  const { data } = await api.get("/api/chat/history");
  return data; // [{ id, title, updatedAt, createdAt, lastMessagePreview }]
}

export async function fetchConversation(conversationId) {
  const { data } = await api.get(`/api/chat/${conversationId}`);
  return data; // { id, title, messages, createdAt, updatedAt }
}

export async function deleteConversation(conversationId) {
  await api.delete(`/api/chat/${conversationId}`);
}

export async function regenerateResponse(conversationId) {
  const { data } = await api.post(`/api/chat/${conversationId}/regenerate`);
  return data; // { conversationId, title, message }
}
