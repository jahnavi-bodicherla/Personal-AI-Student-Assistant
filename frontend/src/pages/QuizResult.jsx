import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fetchQuizResult } from "../services/quizService";
import { getErrorMessage } from "../utils/errorMessage";

const COLORS = ["#16a34a", "#ef4444"];

export default function QuizResult() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuizResult(quizId)
      .then(setResult)
      .catch((err) => {
        toast.error(getErrorMessage(err, "Couldn't load this result."));
        navigate("/quiz", { replace: true });
      })
      .finally(() => setIsLoading(false));
  }, [quizId, navigate]);

  if (isLoading || !result) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  const correct = result.results.filter((r) => r.isCorrect).length;
  const incorrect = result.totalQuestions - correct;
  const chartData = [
    { name: "Correct", value: correct },
    { name: "Incorrect", value: incorrect },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <Link to="/quiz" className="text-xs text-slate-400 hover:text-brand-600">
          ← Back to quizzes
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{result.title}</h1>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-4xl font-bold text-slate-900">{result.percentage}%</p>
            <p className="mt-1 text-slate-500">
              {result.score} / {result.totalQuestions} correct
            </p>
            <div className="mt-2 flex justify-center gap-3 text-xs sm:justify-start">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-600" /> Correct ({correct})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Incorrect ({incorrect})
              </span>
            </div>
          </div>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Question breakdown</h2>
        <div className="mt-4 space-y-3">
          {result.results.map((r, idx) => (
            <div
              key={r.questionId}
              className={`rounded-2xl border p-4 shadow-sm ${
                r.isCorrect ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">
                  Q{idx + 1}. {r.question}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Your answer: </span>
                {r.userAnswer || <span className="italic text-slate-400">No answer</span>}
              </p>
              {!r.isCorrect && (
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium">Correct answer: </span>
                  {r.correctAnswer}
                </p>
              )}
              {r.explanation && <p className="mt-2 text-xs text-slate-500">{r.explanation}</p>}
            </div>
          ))}
        </div>

        <Link
          to="/quiz/new"
          className="mt-6 block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Generate Another Quiz
        </Link>
      </div>
    </div>
  );
}
