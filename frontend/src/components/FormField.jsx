export default function FormField({ label, error, className = "", ...inputProps }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        {...inputProps}
        className={`rounded-xl border px-4 py-2.5 text-sm outline-none transition
          focus:ring-2 focus:ring-brand-400/60
          ${error ? "border-red-400 focus:ring-red-300" : "border-slate-200 focus:border-brand-400"}`}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
