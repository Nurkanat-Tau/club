/** Shown instantly while a page loads (the free database can take a second to wake up). */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 px-4 pt-6" aria-busy="true" aria-label="Загрузка">
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-soft">
        <div className="h-full w-1/3 animate-[loadbar_1.2s_ease-in-out_infinite] bg-brand" />
      </div>
      <div className="h-8 w-2/3 rounded-xl bg-soft" />
      <div className="h-4 w-1/2 rounded-xl bg-soft" />
      <div className="h-24 rounded-3xl bg-soft" />
      <div className="h-24 rounded-3xl bg-soft" />
      <div className="h-24 rounded-3xl bg-soft" />
    </div>
  );
}
