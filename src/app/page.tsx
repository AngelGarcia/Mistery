import { Header } from '@/components/header';
import { GameManager } from '@/components/game-manager';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <GameManager />
      </main>
    </div>
  );
}
