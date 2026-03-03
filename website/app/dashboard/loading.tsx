export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-28 rounded bg-[#ffffff0d]" />
        <div className="h-9 w-36 rounded-lg bg-[#ffffff0d]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5"
          >
            <div className="mb-2 h-5 w-32 rounded bg-[#ffffff0d]" />
            <div className="mb-4 h-3 w-20 rounded bg-[#ffffff08]" />
            <div className="h-3 w-full rounded bg-[#ffffff08]" />
          </div>
        ))}
      </div>
    </div>
  );
}
