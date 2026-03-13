export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-10 h-10 bg-surface-100 dark:bg-surface-200 flex items-center justify-center mb-3">
          <Icon size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
