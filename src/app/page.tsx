import { Header } from '@/components/header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  // For now, we'll hardcode the game ID for simplicity.
  // In the future, you could have a creation/joining flow.
  const gameId = 'main-game';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full space-y-6">
          <h2 className="text-3xl font-bold text-primary">
            ¡Bienvenido al Juego de Misterio!
          </h2>
          <p className="text-muted-foreground">
            Únete a una partida para empezar a jugar con tus amigos.
          </p>

          <div className="flex w-full max-w-sm items-center space-x-2">
             <Link href={`/game/${gameId}`} className="w-full">
                <Button size="lg" className="w-full">
                Unirse a la Partida Principal
                </Button>
             </Link>
          </div>
           <p className="text-xs text-muted-foreground">
            (Todos los jugadores se unirán a la misma partida por ahora)
          </p>
        </div>
      </main>
    </div>
  );
}
