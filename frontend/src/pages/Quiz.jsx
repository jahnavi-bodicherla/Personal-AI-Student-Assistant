import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteQuiz, fetchQuizHistory } from "../services/quizService";
import { getErrorMessage } from "../utils/errorMessage";

const DIFFICULTY_COLORS = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-red-50 text-red-700",
};

export default function Quiz() {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchQuizHistory();
      setQuizzes(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load your quizzes."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (e, quizId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete this quiz."));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
            <p className="mt-1 text-slate-500">Test yourself with AI-generated quizzes.</p>
          </div>
          <Link
            to="/quiz/new"
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + New Quiz
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            No quizzes yet. Generate one to get started!
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to={quiz.isCompleted ? `/quiz/${quiz.id}/result` : `/quiz/${quiz.id}/take`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{quiz.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_COLORS[quiz.difficulty]}`}>
                      {quiz.difficulty}
                    </span>
                    <span>{quiz.totalQuestions} questions</span>
                    <span>{quiz.subject || "General"}</span>
                    <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {quiz.isCompleted ? (
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                      {quiz.percentage}%
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      Not started
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, quiz.id)}
                    className="hidden rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                    title="Delete quiz"
                  >
                    ✕
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
