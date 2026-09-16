"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="space-y-4 px-4 pt-20 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
      <button onClick={reset} className="btn-primary">Попробовать снова</button>
    </main>
  );
}
