export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
        <p className="text-sm font-medium text-gray-400">Cargando...</p>
      </div>
    </div>
  )
}
