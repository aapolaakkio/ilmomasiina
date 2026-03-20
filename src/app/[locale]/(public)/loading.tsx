export default function PublicRouteLoading() {
  return (
    <div className="animate-pulse space-y-4 py-2">
      <div className="flex items-center gap-3">
        <div className="h-6 w-1 rounded bg-gray-200" />
        <div className="h-8 w-40 rounded bg-gray-200" />
      </div>
      <div className="hidden h-72 rounded-lg border border-gray-100 bg-gray-100 sm:block" />
      <div className="space-y-3 sm:hidden">
        <div className="h-20 rounded border border-gray-100 bg-gray-100" />
        <div className="h-20 rounded border border-gray-100 bg-gray-100" />
      </div>
    </div>
  );
}
