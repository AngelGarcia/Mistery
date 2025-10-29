
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { GameMode } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [joinGameId, setJoinGameId] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('who-is-who');

  const handleCreateGame = () => {
    const newGameId = `partida-${crypto.randomUUID().split('-')[0]}`;
    router.push(`/game/${newGameId}?gameMode=${selectedGameMode}`);
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
        <div className="max-w-2xl w-full space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-primary tracking-wider">
              ¿Quién es Quién?
            </h2>
            <p className="text-muted-foreground mt-2">
              Atrévete a entrar. Descubre los secretos de tus amigos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Nueva Partida</CardTitle>
                    <CardDescription>Crea una nueva sala y elige un modo de juego.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RadioGroup value={selectedGameMode} onValueChange={(value: any) => setSelectedGameMode(value)} className="space-y-4">
                        <div>
                            <RadioGroupItem value="who-is-who" id="who-is-who" className="peer sr-only" />
                            <Label htmlFor="who-is-who" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <h3 className="text-lg font-semibold">¿Quién es Quién?</h3>
                                <p className="text-sm text-muted-foreground mt-1">Adivina el autor de frases anónimas.</p>
                            </Label>
                        </div>
                         <div>
                            <RadioGroupItem value="two-truths-one-lie" id="two-truths-one-lie" className="peer sr-only" />
                            <Label htmlFor="two-truths-one-lie" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                 <h3 className="text-lg font-semibold">2 Verdades, 1 Mentira</h3>
                                 <p className="text-sm text-muted-foreground mt-1">Descubre la mentira de cada jugador.</p>
                            </Label>
                        </div>
                    </RadioGroup>
                    <Button size="lg" className="w-full" onClick={handleCreateGame}>
                        Crear Nueva Partida
                    </Button>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Unirse a una Partida</CardTitle>
                    <CardDescription>¿Ya tienes un código? Introdúcelo aquí para unirte.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col justify-center h-full space-y-4">
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
                </CardContent>
            </Card>

          </div>

        </div>
      </main>
    </div>
  );
}
