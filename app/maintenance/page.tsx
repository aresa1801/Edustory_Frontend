import ColorMatchGame from '@/components/game/ColorMatchGame';

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            ⚙️ Sedang Maintenance
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kami sedang meningkatkan performa website. Sambil nunggu, main game dulu yuk!
          </p>
        </div>
        <ColorMatchGame />
      </div>
    </main>
  );
}