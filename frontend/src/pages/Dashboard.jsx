import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchProgress } from "../services/progressService";
import StatCard from "../components/StatCard";

const quickLinks = [
  { to: "/chat", label: "Ask a question", icon: "💬", desc: "Chat with your AI study assistant" },
  { to: "/notes", label: "Upload notes", icon: "📄", desc: "Summarize and query your study material" },
  { to: "/quiz/new", label: "Generate a quiz", icon: "📝", desc: "Test yourself with AI-generated questions" },
  { to: "/progress", label: "View progress", icon: "📊", desc: "See your learning analytics" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgress()
      .then((data) => setOverview(data.overview))
      .catch(() => setOverview(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(" ")[0] || "there"}! 👋
        </h1>
        <p className="mt-1 text-slate-500">Here's a snapshot of your learning journey.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))
          ) : (
            <>
              <StatCard label="Questions Asked" value={overview?.questionsAsked ?? 0} icon="💬" />
              <StatCard label="Quizzes Completed" value={overview?.quizzesCompleted ?? 0} icon="📝" />
              <StatCard label="Study Hours" value={overview?.studyHours ?? 0} icon="⏱️" />
              <StatCard label="Learning Streak" value={`${overview?.learningStreak ?? 0} days`} icon="🔥" />
            </>
          )}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-2xl">{link.icon}</span>
              <div>
                <p className="font-semibold text-slate-800">{link.label}</p>
                <p className="text-sm text-slate-500">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
