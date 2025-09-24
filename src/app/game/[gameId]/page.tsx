"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getFirestore, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Game, Player } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, LogIn, Send, Hourglass, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const db = getFirestore(app);

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef, (doc) => {
      const gameData = doc.data() as Game;
      setGame(gameData);

      const storedPlayerId = localStorage.getItem(`player-id-${gameId}`);
      if (storedPlayerId && gameData) {
        const player = gameData.players.find(p => p.id === storedPlayerId);
        if (player) {
          setCurrentPlayer(player);
          setIsHost(gameData.hostId === player.id);
        } else {
            // Player was removed or game was reset, clear local storage
            localStorage.removeItem(`player-id-${gameId}`);
            setCurrentPlayer(null);
            setIsHost(false);
        }
      }
    });

    // Ensure the game document exists on first load
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

    return () => unsubscribe();
  }, [gameId]);
  
  const handleJoinGame = async () => {
    if (!playerName.trim() || !gameId) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim(),
    };
    
    try {
      const gameRef = doc(db, 'games', gameId);
      
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) {
          throw "La partida no existe.";
        }
        
        const gameData = gameDoc.data();
        const players = gameData.players || [];
        
        // Don't allow duplicate names
        if (players.some((p: Player) => p.name === newPlayer.name)) {
            throw new Error(`El nombre "${newPlayer.name}" ya está en uso.`);
        }

        const updateData: Partial<Game> = {
            players: [...players, newPlayer]
        };

        // The first player to join becomes the host
        if (!gameData.hostId) {
            updateData.hostId = newPlayer.id;
        }

        transaction.update(gameRef, updateData);
      });
      
      localStorage.setItem(`player-id-${gameId}`, newPlayer.id);
      setCurrentPlayer(newPlayer);
      toast({
        title: "¡Bienvenido/a!",
        description: `Te has unido a la partida como ${newPlayer.name}.`,
      });

    } catch (error: any) {
      console.error("Error al unirse a la partida:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo unir a la partida. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;

    try {
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
            phase: 'submission'
        });
        toast({
            title: "¡La partida ha comenzado!",
            description: "Es hora de enviar vuestras frases.",
        });
    } catch (error) {
        console.error("Error al iniciar la partida:", error);
        toast({
            title: "Error",
            description: "No se pudo iniciar la partida.",
            variant: "destructive",
          });
    }
  };


  if (!game) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <Hourglass className="animate-spin" /> 
          <span className="ml-2">Cargando partida...</span>
        </div>
    );
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
  
  const renderLobby = () => (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
            <Users /> Lobby de la Partida
            </CardTitle>
            <CardDescription>Esperando a que el anfitrión inicie el juego. ¡La partida comenzará pronto!</CardDescription>
        </CardHeader>
        <CardContent>
            <h3 className="font-semibold mb-4">Jugadores Conectados ({game.players.length}):</h3>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {game.players.map((player) => (
                <li key={player.id} className={`p-3 rounded-lg flex items-center justify-center transition-all ${player.id === game.hostId ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-primary/10'}`}>
                <span className={`font-medium ${player.id === game.hostId ? 'text-amber-700 dark:text-amber-300' : 'text-primary'}`}>
                    {player.name}
                    {player.id === game.hostId && ' (Anfitrión)'}
                </span>
                </li>
            ))}
            </ul>
            <div className="mt-8 text-center">
                <p className="text-muted-foreground mb-4">¡Hola, <strong>{currentPlayer.name}</strong>!</p>
                {isHost ? (
                    <Button onClick={handleStartGame} size="lg" disabled={game.players.length < 2}>
                        <Gamepad2 className="mr-2" />
                        Empezar Partida ({game.players.length} Jugadores)
                    </Button>
                ) : (
                    <p>Espera a que el anfitrión inicie el juego.</p>
                )}
                 {isHost && game.players.length < 2 && (
                    <p className="text-sm text-muted-foreground mt-2">Se necesitan al menos 2 jugadores para empezar.</p>
                )}
            </div>
        </CardContent>
    </Card>
  );

  const renderSubmission = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Envía tus Frases</CardTitle>
        <CardDescription>
          Escribe dos frases personales y únicas. Serán anonimizadas y el resto
          de jugadores tendrán que adivinar cuáles son las tuyas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea placeholder="Primera frase..." />
        <Textarea placeholder="Segunda frase..." />
        <Button className="w-full">
            <Send className="mr-2"/>
            Enviar Frases
        </Button>
      </CardContent>
    </Card>
  );


  return (
     <div className="flex flex-col min-h-screen">
      <Header />
       <main className="flex-1 container mx-auto p-4 md:p-8">
        {game.phase === 'lobby' && renderLobby()}
        {game.phase === 'submission' && renderSubmission()}
        {/* Other game phases will be rendered here */}
       </main>
     </div>
  );
}
