import ColorMatchGame from '@/components/game/ColorMatchGame';

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 section-pad">
      <div className="w-full max-w-2xl">
        <div className="surface mb-6 p-8 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            ⚙️ Sedang Maintenance
          </h1>
          <p className="mt-3 text-muted-foreground">
            Kami sedang meningkatkan performa website. Sambil nunggu, main game dulu yuk!
          </p>
        </div>
        <ColorMatchGame />
      </div>
    </main>
  );
}
