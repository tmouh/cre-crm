export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-surface-0 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wide">{title}</h1>
        {subtitle && (
          <>
            <span className="text-slate-300 dark:text-slate-600 text-[10px]">/</span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{subtitle}</p>
          </>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  )
}
