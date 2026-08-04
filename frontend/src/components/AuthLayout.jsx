export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 text-xl font-semibold tracking-tight">
          🎓 AI Study Assistant
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Study smarter, not harder.
          </h1>
          <p className="mt-4 text-brand-50/90">
            Ask questions, summarize notes, generate quizzes, and track your
            learning progress — all powered by AI.
          </p>
        </div>

        <div className="relative z-10 text-sm text-brand-50/70">
          © {new Date().getFullYear()} AI Personal Study Assistant
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
