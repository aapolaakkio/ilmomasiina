export default function AdminRouteLoading() {
  return (
    <div className="animate-pulse space-y-4 py-2">
      <div className="h-8 w-56 rounded bg-gray-200" />
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-24 rounded bg-gray-100" />
        <div className="h-8 w-24 rounded bg-gray-100" />
        <div className="h-8 w-32 rounded bg-gray-100" />
      </div>
      <div className="h-64 rounded border border-gray-100 bg-gray-100" />
    </div>
  );
}
