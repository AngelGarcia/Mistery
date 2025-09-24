"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getFirestore, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Game, Player } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const db = getFirestore(app);

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);

    // Ensure the game document exists
    getDoc(gameRef).then(docSnap => {
      if (!docSnap.exists()) {
        const newGame: Game = {
          id: gameId,
          phase: 'lobby',
          players: [],
        };
        setDoc(gameRef, newGame);
      }
    });

    const unsubscribe = onSnapshot(gameRef, (doc) => {
      setGame(doc.data() as Game);
    });

    return () => unsubscribe();
  }, [gameId]);
  
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`player-id-${gameId}`);
    if (storedPlayerId && game) {
      const player = game.players.find(p => p.id === storedPlayerId);
      if(player) {
        setCurrentPlayer(player);
      }
    }
  }, [game, gameId]);

  const handleJoinGame = async () => {
    if (!playerName.trim() || !gameId) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim(),
    };
    
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        players: arrayUnion(newPlayer)
      });
      
      localStorage.setItem(`player-id-${gameId}`, newPlayer.id);
      setCurrentPlayer(newPlayer);
      toast({
        title: "¡Bienvenido/a!",
        description: `Te has unido a la partida como ${newPlayer.name}.`,
      });

    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error",
        description: "No se pudo unir a la partida. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (!game) {
    return <div>Cargando partida...</div>;
  }
  
  if (!currentPlayer) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Unirse a la Partida</CardTitle>
                    <CardDescription>Introduce tu nombre para entrar al lobby.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Input
                        type="text"
                        placeholder="Tu nombre"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                    />
                    <Button onClick={handleJoinGame} className="w-full">
                        <LogIn className="mr-2"/>
                        Unirse al Lobby
                    </Button>
                </CardContent>
            </Card>
        </main>
       </div>
    );
  }

  return (
     <div className="flex flex-col min-h-screen">
      <Header />
       <main className="flex-1 container mx-auto p-4 md:p-8">
        {game.phase === 'lobby' && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users /> Lobby de la Partida
              </CardTitle>
              <CardDescription>Esperando a que se unan los demás jugadores. ¡La partida comenzará pronto!</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-4">Jugadores Conectados ({game.players.length}):</h3>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {game.players.map((player) => (
                  <li key={player.id} className="bg-primary/10 p-3 rounded-lg flex items-center justify-center">
                    <span className="font-medium text-primary">{player.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                  <p className="text-muted-foreground">Hola, <strong>{currentPlayer.name}</strong>. ¡Espera a que el anfitrión inicie el juego!</p>
                  {/* The host will have a button to start the game here */}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Other game phases will be rendered here */}
       </main>
     </div>
  );
}
