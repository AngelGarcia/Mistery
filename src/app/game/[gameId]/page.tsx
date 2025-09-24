"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getFirestore, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Game, Player, Phrase } from '@/lib/types';
import { getAnonymizedPhrases } from '@/app/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, LogIn, Send, Hourglass, Gamepad2, CheckCircle } from 'lucide-react';
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
  const [phrase1, setPhrase1] = useState('');
  const [phrase2, setPhrase2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            localStorage.removeItem(`player-id-${gameId}`);
            setCurrentPlayer(null);
            setIsHost(false);
        }
      }
      
      // Check if all players have submitted to advance the phase
      if (gameData?.phase === 'submission' && gameData.players.every(p => p.hasSubmitted)) {
        updateDoc(gameRef, { phase: 'guessing' });
      }
    });

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
        
        const gameData = gameDoc.data() as Game;
        const players = gameData.players || [];
        
        if (players.some((p: Player) => p.name === newPlayer.name)) {
            throw new Error(`El nombre "${newPlayer.name}" ya está en uso.`);
        }

        const updateData: Partial<Game> = {
            players: [...players, newPlayer]
        };

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

  const handleSubmission = async () => {
    if (!phrase1.trim() || !phrase2.trim() || !currentPlayer) return;
    setIsSubmitting(true);
    
    try {
      const originalPhrases = [phrase1, phrase2];
      const anonymized = await getAnonymizedPhrases(originalPhrases);

      const newPhrases: Phrase[] = anonymized.map((text, index) => ({
        id: `${currentPlayer.id}-${index}`,
        anonymizedText: text,
        authorId: currentPlayer.id,
      }));

      const gameRef = doc(db, 'games', gameId);
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Game not found");
        
        const currentPhrases = gameDoc.data().phrases || [];
        const updatedPlayers = gameDoc.data().players.map((p: Player) => 
            p.id === currentPlayer.id ? { ...p, hasSubmitted: true } : p
        );

        transaction.update(gameRef, {
            phrases: [...currentPhrases, ...newPhrases],
            players: updatedPlayers
        });
      });

      toast({
        title: "¡Frases enviadas!",
        description: "Tus frases han sido anonimizadas. Esperando al resto de jugadores...",
      });

    } catch (error: any) {
        console.error("Error submitting phrases:", error);
        toast({
            title: "Error",
            description: error.message || "No se pudieron enviar tus frases.",
            variant: "destructive"
        });
    } finally {
        setIsSubmitting(false);
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
  
  const renderSubmissionStatus = () => (
     <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
             <CardTitle>Esperando al resto</CardTitle>
             <CardDescription>La siguiente fase comenzará cuando todos hayan enviado sus frases.</CardDescription>
        </CardHeader>
        <CardContent>
             <ul className="space-y-3">
                 {game.players.map(p => (
                     <li key={p.id} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                         <span className="font-medium">{p.name}</span>
                         {p.hasSubmitted ? (
                             <span className="flex items-center gap-2 text-green-600">
                                 <CheckCircle /> ¡Listo!
                             </span>
                         ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <Hourglass className="animate-spin" /> Escribiendo...
                            </span>
                         )}
                     </li>
                 ))}
             </ul>
        </CardContent>
     </Card>
  );


  const renderSubmissionForm = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Envía tus Frases</CardTitle>
        <CardDescription>
          Escribe dos frases personales y únicas. Serán anonimizadas y el resto
          de jugadores tendrán que adivinar cuáles son las tuyas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea 
            placeholder="Primera frase..." 
            value={phrase1}
            onChange={e => setPhrase1(e.target.value)}
            disabled={isSubmitting}
        />
        <Textarea 
            placeholder="Segunda frase..." 
            value={phrase2}
            onChange={e => setPhrase2(e.target.value)}
            disabled={isSubmitting}
        />
        <Button onClick={handleSubmission} className="w-full" disabled={!phrase1.trim() || !phrase2.trim() || isSubmitting}>
            {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
            {isSubmitting ? 'Enviando...' : 'Enviar Frases'}
        </Button>
      </CardContent>
    </Card>
  );
  
  const renderSubmission = () => {
    const playerHasSubmitted = game.players.find(p => p.id === currentPlayer.id)?.hasSubmitted;
    return playerHasSubmitted ? renderSubmissionStatus() : renderSubmissionForm();
  }
  
  const renderGuessing = () => (
    <div className="text-center">
        <h2 className="text-2xl font-bold">Fase de Adivinanzas</h2>
        <p>¡Próximamente!</p>
    </div>
    );


  return (
     <div className="flex flex-col min-h-screen">
      <Header />
       <main className="flex-1 container mx-auto p-4 md:p-8">
        {game.phase === 'lobby' && renderLobby()}
        {game.phase === 'submission' && renderSubmission()}
        {game.phase === 'guessing' && renderGuessing()}
        {/* Other game phases will be rendered here */}
       </main>
     </div>
  );
}
