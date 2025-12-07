export default function ServiceCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm animate-pulse">
      {/* Header with title and location badges */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {/* Service name skeleton */}
          <div className="h-6 bg-neutral-300 rounded w-3/4 mb-2"></div>
          {/* Subtitle skeleton */}
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
        <div className="flex gap-2 ml-4">
          {/* Location badges skeleton */}
          <div className="h-6 w-20 bg-primary-100 rounded-full"></div>
        </div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-4 mt-4">
        <div className="h-3 bg-neutral-200 rounded w-full"></div>
        <div className="h-3 bg-neutral-200 rounded w-full"></div>
        <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
      </div>

      {/* Details grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="h-4 bg-neutral-200 rounded w-full"></div>
        <div className="h-4 bg-neutral-200 rounded w-full"></div>
      </div>

      {/* Button skeleton */}
      <div className="h-10 w-36 bg-primary-200 rounded-lg mt-2"></div>
    </div>
  );
}
