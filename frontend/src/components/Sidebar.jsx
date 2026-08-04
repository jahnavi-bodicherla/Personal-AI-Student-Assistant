import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/chat", label: "AI Chat", icon: "💬" },
  { to: "/notes", label: "Notes", icon: "📄" },
  { to: "/quiz", label: "Quizzes", icon: "📝" },
  { to: "/progress", label: "Progress", icon: "📊" },
];

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const {
    conversations,
    isLoadingHistory,
    activeConversationId,
    selectConversation,
    startNewChat,
    removeConversation,
  } = useChat();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info("You've been logged out.");
    navigate("/login", { replace: true });
  };

  const handleNewChat = () => {
    startNewChat();
    navigate("/chat");
    onNavigate?.();
  };

  const handleSelectConversation = (id) => {
    selectConversation(id);
    navigate("/chat");
    onNavigate?.();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    removeConversation(id);
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <span className="text-xl">🎓</span>
        <span className="font-semibold text-slate-900">AI Study Assistant</span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <span>+</span> New Chat
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Conversations
        </p>

        {isLoadingHistory && (
          <div className="space-y-2 px-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        )}

        {!isLoadingHistory && conversations.length === 0 && (
          <p className="px-2 text-sm text-slate-400">
            No conversations yet. Start one above!
          </p>
        )}

        <ul className="space-y-1">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => handleSelectConversation(conv.id)}
                className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  conv.id === activeConversationId
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{conv.title || "New conversation"}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="hidden shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  title="Delete conversation"
                >
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
