import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Quiz from "./pages/Quiz";
import QuizGenerate from "./pages/QuizGenerate";
import QuizTake from "./pages/QuizTake";
import QuizResult from "./pages/QuizResult";
import Progress from "./pages/Progress";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />

          <Route path="/notes" element={<Protected><Notes /></Protected>} />
          <Route path="/notes/:noteId" element={<Protected><NoteDetail /></Protected>} />

          <Route path="/quiz" element={<Protected><Quiz /></Protected>} />
          <Route path="/quiz/new" element={<Protected><QuizGenerate /></Protected>} />
          <Route path="/quiz/:quizId/take" element={<Protected><QuizTake /></Protected>} />
          <Route path="/quiz/:quizId/result" element={<Protected><QuizResult /></Protected>} />

          <Route path="/progress" element={<Protected><Progress /></Protected>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </ChatProvider>
    </AuthProvider>
  );
}
