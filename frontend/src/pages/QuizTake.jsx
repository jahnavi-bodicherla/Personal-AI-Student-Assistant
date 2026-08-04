import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchQuiz, submitQuiz } from "../services/quizService";
import { getErrorMessage } from "../utils/errorMessage";

const TYPE_LABELS = {
  mcq: "Multiple Choice",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
  coding: "Coding",
};

export default function QuizTake() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz(quizId)
      .then((data) => {
        if (data.isCompleted) {
          navigate(`/quiz/${quizId}/result`, { replace: true });
          return;
        }
        setQuiz(data);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Couldn't load this quiz."));
        navigate("/quiz", { replace: true });
      })
      .finally(() => setIsLoading(false));
  }, [quizId, navigate]);

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    const unanswered = quiz.questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      const proceed = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Submit anyway?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      await submitQuiz(quizId, answers);
      navigate(`/quiz/${quizId}/result`, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't submit the quiz."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !quiz) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
        <p className="mt-1 text-slate-500">
          {quiz.questions.length} questions · {quiz.difficulty} difficulty
        </p>

        <div className="mt-6 space-y-5">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Q{idx + 1}
                </span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {TYPE_LABELS[q.type]}
                </span>
              </div>
              <p className="mb-4 text-sm font-medium text-slate-800">{q.question}</p>

              {q.type === "mcq" && (
                <div className="space-y-2">
                  {q.options.map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm transition ${
                        answers[q.id] === option
                          ? "border-brand-400 bg-brand-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="accent-brand-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "true_false" && (
                <div className="flex gap-2">
                  {["True", "False"].map((option) => (
                    <label
                      key={option}
                      className={`flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-center text-sm transition ${
                        answers[q.id] === option
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="hidden"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "fill_blank" && (
                <input
                  type="text"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
                />
              )}

              {q.type === "coding" && (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Write your code here..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mt-6 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Grading..." : "Submit Quiz"}
        </button>
      </div>
    </div>
  );
}
