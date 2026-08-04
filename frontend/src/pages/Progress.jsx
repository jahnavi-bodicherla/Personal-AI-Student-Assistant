import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchProgress } from "../services/progressService";
import { getErrorMessage } from "../utils/errorMessage";
import StatCard from "../components/StatCard";

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Progress() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgress()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load your progress data.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-slate-400">Couldn't load progress data.</div>;
  }

  const weeklyChartData = data.weekly.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  const monthlyChartData = data.monthly.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Learning Analytics</h1>
        <p className="mt-1 text-slate-500">Track your study habits and quiz performance over time.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Questions Asked" value={data.overview.questionsAsked} icon="💬" />
          <StatCard label="Study Hours" value={data.overview.studyHours} icon="⏱️" />
          <StatCard label="Quizzes Done" value={data.overview.quizzesCompleted} icon="📝" />
          <StatCard label="Avg. Score" value={`${data.overview.averageScore}%`} icon="🎯" />
          <StatCard label="Streak" value={`${data.overview.learningStreak}d`} icon="🔥" />
          <StatCard label="Notes" value={data.overview.notesUploaded} icon="📄" />
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Weekly Activity
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="questionsAsked" name="Questions" fill="#7a5cff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quizzesCompleted" name="Quizzes" fill="#8f7bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Monthly Study Minutes
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="studyMinutes" name="Minutes" stroke="#6842f5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Performance by Subject
          </h2>
          {data.subjects.length === 0 ? (
            <p className="text-sm text-slate-400">Complete a quiz to see subject breakdowns.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjects} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="subject" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="averageScore" name="Avg. Score %" fill="#7a5cff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
