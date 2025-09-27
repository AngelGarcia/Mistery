
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const router = useRouter();
  const [joinGameId, setJoinGameId] = useState('');

  const handleCreateGame = () => {
    const newGameId = `partida-${crypto.randomUUID().split('-')[0]}`;
    router.push(`/game/${newGameId}`);
  };

  const handleJoinGame = () => {
    if (joinGameId.trim()) {
      router.push(`/game/${joinGameId.trim()}`);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-primary">
              ¡Bienvenido al Juego de Misterio!
            </h2>
            <p className="text-muted-foreground">
              Crea una partida e invita a tus amigos o únete a una existente.
            </p>
          </div>

          <div className="space-y-4">
            <Button size="lg" className="w-full" onClick={handleCreateGame}>
                Crear Nueva Partida
            </Button>
            
            <div className="flex items-center space-x-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">O</span>
                <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="ID de la partida existente"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
              />
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full"
                onClick={handleJoinGame}
                disabled={!joinGameId.trim()}
              >
                Unirse a Partida
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
