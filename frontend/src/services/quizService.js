import api from "./api";

export async function generateQuiz(payload) {
  const { data } = await api.post("/api/quiz/generate", payload);
  return data;
}

export async function fetchQuizHistory() {
  const { data } = await api.get("/api/quiz/history");
  return data;
}

export async function fetchQuiz(quizId) {
  const { data } = await api.get(`/api/quiz/${quizId}`);
  return data;
}

export async function submitQuiz(quizId, answers) {
  const { data } = await api.post(`/api/quiz/${quizId}/submit`, { answers });
  return data;
}

export async function fetchQuizResult(quizId) {
  const { data } = await api.get(`/api/quiz/${quizId}/result`);
  return data;
}

export async function deleteQuiz(quizId) {
  await api.delete(`/api/quiz/${quizId}`);
}
