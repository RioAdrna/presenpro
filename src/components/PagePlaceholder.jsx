import Icon from '../components/Icon'

export default function PagePlaceholder({ icon, title, description }) {
  return (
    <div className="flex h-full min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} size={28} />
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-800">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      <button className="mt-6 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
        <Icon name="plus" size={16} />
        Buat Baru
      </button>
    </div>
  )
}
