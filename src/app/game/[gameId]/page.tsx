
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, runTransaction, FirestoreError } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Game, Player, Phrase, Guess } from '@/lib/types';
import { getAnonymizedPhrases } from '@/app/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users, LogIn, Send, Hourglass, Gamepad2, CheckCircle, AlertTriangle, Lightbulb, Trophy, Star, Home, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DbError } from '@/components/db-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

let db: any;
try {
  db = getFirestore(app);
} catch (e) {
  console.error(e);
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [phrase1, setPhrase1] = useState('');
  const [phrase2, setPhrase2] = useState('');
  const [phrase3, setPhrase3] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!gameId || !db) {
        setDbError("Firestore is not initialized.");
        return;
    };

    const gameRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
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
        
        if (gameData?.phase === 'submission' && gameData.players.every(p => p.hasSubmitted)) {
            const allPhrases = gameData.players.length * 3;
            if (gameData.phrases?.length === allPhrases) {
                updateDoc(gameRef, { phase: 'guessing' });
            }
        }
        if (gameData?.phase === 'guessing' && gameData.players.every(p => p.hasGuessed)) {
          updateDoc(gameRef, { phase: 'results' });
        }

      } else {
        // Game doesn't exist, create it
        const newGame: Game = {
          id: gameId,
          phase: 'lobby',
          players: [],
        };
        setDoc(gameRef, newGame).catch(handleFirestoreError);
        setGame(newGame);
      }
    }, (error) => {
        handleFirestoreError(error);
    });

    return () => unsubscribe();
  }, [gameId]);

  const shuffledPhrases = useMemo(() => {
    if (game?.phrases) {
        // Create a seeded random function based on gameId for consistent shuffle
        let seed = 0;
        for (let i = 0; i < gameId.length; i++) {
            seed += gameId.charCodeAt(i);
        }
        const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        return [...game.phrases].sort(() => random() - 0.5);
    }
    return [];
  }, [game?.phrases, gameId]);


  const handleFirestoreError = (error: any) => {
    console.error("Firestore Error:", error);
    if (error instanceof FirestoreError && (error.code === 'failed-precondition' || error.code === 'unimplemented')) {
        setDbError("La base de datos de Firestore no está activada. Por favor, actívala en la consola de Firebase para continuar.");
    }
  }
  
  const handleJoinGame = async () => {
    if (!playerName.trim() || !gameId || dbError) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim(),
      hasSubmitted: false,
    };
    
    try {
      const gameRef = doc(db, 'games', gameId);
      
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) {
           const newGame: Game = {
            id: gameId,
            phase: 'lobby',
            players: [newPlayer],
            hostId: newPlayer.id,
          };
          transaction.set(gameRef, newGame);
          return;
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
      handleFirestoreError(error);
      if (!(error instanceof FirestoreError)) {
        console.error("Error al unirse a la partida:", error);
        toast({
            title: "Error",
            description: error.message || "No se pudo unir a la partida. Inténtalo de nuevo.",
            variant: "destructive",
        });
      }
    }
  };

  const handleStartGame = async () => {
    if (!isHost || dbError) return;

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
        handleFirestoreError(error);
        console.error("Error al iniciar la partida:", error);
        toast({
            title: "Error",
            description: "No se pudo iniciar la partida.",
            variant: "destructive",
          });
    }
  };

  const handleSubmission = async () => {
    if (!phrase1.trim() || !phrase2.trim() || !phrase3.trim() || !currentPlayer || dbError) return;
    setIsSubmitting(true);
    
    try {
      const originalPhrases = [phrase1, phrase2, phrase3];
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
        handleFirestoreError(error);
        if (!(error instanceof FirestoreError)){
            console.error("Error submitting phrases:", error);
            toast({
                title: "Error",
                description: error.message || "No se pudieron enviar tus frases.",
                variant: "destructive"
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGuessChange = (phraseId: string, guessedPlayerId: string) => {
    setGuesses(prev => ({...prev, [phraseId]: guessedPlayerId}));
  }

  const handleGuessingSubmission = async () => {
    if (!currentPlayer || !game ) {
        return;
    }
    const phrasesToGuess = shuffledPhrases.filter(p => p.authorId !== currentPlayer.id);
    if (Object.keys(guesses).length !== phrasesToGuess.length) {
        toast({ title: "Error", description: "Debes adivinar el autor de cada frase.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);

    const playerGuesses: Guess[] = Object.entries(guesses).map(([phraseId, guessedPlayerId]) => ({
        phraseId,
        guessedPlayerId,
    }));
    
    try {
        const gameRef = doc(db, 'games', gameId);
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error("Game not found");
            
            const currentGuesses = gameDoc.data().guesses || {};
            const updatedPlayers = gameDoc.data().players.map((p: Player) => 
                p.id === currentPlayer.id ? { ...p, hasGuessed: true } : p
            );
    
            transaction.update(gameRef, {
                [`guesses.${currentPlayer.id}`]: playerGuesses,
                players: updatedPlayers
            });
          });

        toast({
            title: "¡Adivinanzas enviadas!",
            description: "Esperando a que el resto de jugadores terminen...",
          });

    } catch (error) {
        handleFirestoreError(error);
        console.error("Error submitting guesses:", error);
        toast({
            title: "Error",
            description: "No se pudieron enviar tus adivinanzas.",
            variant: "destructive"
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCreateNewGame = () => {
    const newGameId = `partida-${crypto.randomUUID().split('-')[0]}`;
    router.push(`/game/${newGameId}`);
  };

  if (dbError) {
    return <DbError message={dbError} projectId="studio-7956312296-90b9d" />
  }

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
                    <CardDescription>Introduce tu nombre para entrar al lobby de la partida: <strong>{gameId}</strong></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Input
                        type="text"
                        placeholder="Tu nombre"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                        disabled={!!dbError}
                    />
                    <Button onClick={handleJoinGame} className="w-full" disabled={!playerName.trim() || !!dbError}>
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
            <CardDescription>ID de la partida: <strong>{gameId}</strong>. ¡Comparte este ID para que otros se unan!</CardDescription>
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
  
  const renderSubmissionStatus = (phase: "submission" | "guessing") => (
    <Card className="w-full max-w-2xl mx-auto">
       <CardHeader>
            <CardTitle>Esperando al resto</CardTitle>
            <CardDescription>La siguiente fase comenzará cuando todos hayan terminado.</CardDescription>
       </CardHeader>
       <CardContent>
            <ul className="space-y-3">
                {game.players.map(p => (
                    <li key={p.id} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="font-medium">{p.name}</span>
                        {(phase === 'submission' ? p.hasSubmitted : p.hasGuessed) ? (
                            <span className="flex items-center gap-2 text-green-600">
                                <CheckCircle /> ¡Listo!
                            </span>
                        ) : (
                           <span className="flex items-center gap-2 text-muted-foreground">
                               <Hourglass className="animate-spin" /> {phase === 'submission' ? 'Escribiendo...' : 'Adivinando...'}
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
          Escribe tres frases personales y únicas. Serán anonimizadas y el resto
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
        <Textarea 
            placeholder="Tercera frase..." 
            value={phrase3}
            onChange={e => setPhrase3(e.target.value)}
            disabled={isSubmitting}
        />
        <Button onClick={handleSubmission} className="w-full" disabled={!phrase1.trim() || !phrase2.trim() || !phrase3.trim() || isSubmitting}>
            {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
            {isSubmitting ? 'Enviando...' : 'Enviar Frases'}
        </Button>
      </CardContent>
    </Card>
  );
  
  const renderSubmission = () => {
    const playerHasSubmitted = game.players.find(p => p.id === currentPlayer.id)?.hasSubmitted;
    return playerHasSubmitted ? renderSubmissionStatus("submission") : renderSubmissionForm();
  }
  
  const renderGuessingForm = () => {
    if (!game || !currentPlayer) return null;

    const otherPlayers = game.players.filter(p => p.id !== currentPlayer.id);
    const phrasesToGuess = shuffledPhrases.filter(p => p.authorId !== currentPlayer.id);
    const allPhrasesGuessed = phrasesToGuess.length > 0 && phrasesToGuess.every(phrase => guesses[phrase.id]);

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>¿Quién escribió qué?</CardTitle>
                <CardDescription>Adivina qué jugador escribió cada una de las siguientes frases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {phrasesToGuess.map((phrase) => (
                    <div key={phrase.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 border rounded-lg">
                        <p className="italic text-lg">"{phrase.anonymizedText}"</p>
                        <Select
                           value={guesses[phrase.id] || ""}
                           onValueChange={(value) => handleGuessChange(phrase.id, value)}
                           disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un jugador..." />
                            </SelectTrigger>
                            <SelectContent>
                                {otherPlayers.map(player => (
                                    <SelectItem key={player.id} value={player.id}>
                                        {player.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
                 <Button onClick={handleGuessingSubmission} className="w-full" disabled={!allPhrasesGuessed || isSubmitting}>
                    {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Lightbulb className="mr-2"/>}
                    {isSubmitting ? 'Enviando Adivinanzas...' : 'Enviar Adivinanzas'}
                </Button>
            </CardContent>
        </Card>
    );
  };
  
  const renderGuessing = () => {
    const playerHasGuessed = game.players.find(p => p.id === currentPlayer.id)?.hasGuessed;
    return playerHasGuessed ? renderSubmissionStatus("guessing") : renderGuessingForm();
  }

  const renderResults = () => {
    if (!game || !game.phrases || !game.guesses) {
        return <p>Cargando resultados...</p>;
    }

    const playerScores: Record<string, number> = game.players.reduce((acc, player) => ({...acc, [player.id]: 0}), {});

    for (const guessingPlayerId in game.guesses) {
        const playerGuesses = game.guesses[guessingPlayerId];
        for (const guess of playerGuesses) {
            const phrase = game.phrases.find(p => p.id === guess.phraseId);
            if (phrase && phrase.authorId === guess.guessedPlayerId) {
                playerScores[guessingPlayerId]++;
            }
        }
    }

    const sortedPlayers = [...game.players].sort((a, b) => playerScores[b.id] - playerScores[a.id]);
    const maxScore = sortedPlayers.length > 0 ? playerScores[sortedPlayers[0].id] : 0;

    const getPlayerName = (playerId: string) => game.players.find(p => p.id === playerId)?.name || 'Desconocido';

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="text-amber-500"/>
                    ¡Resultados Finales!
                </CardTitle>
                <CardDescription>Veamos quién conoce mejor a los demás.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-lg font-semibold mb-4">Puntuaciones</h3>
                    <ul className="space-y-3">
                        {sortedPlayers.map((player, index) => {
                            const isWinner = playerScores[player.id] === maxScore && maxScore > 0;
                            return (
                                <li key={player.id} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold text-lg w-6 text-center ${isWinner ? 'text-amber-500' : 'text-muted-foreground'}`}>{index + 1}</span>
                                        <span className="font-medium">{player.name}</span>
                                        {isWinner && <Star className="text-amber-500" size={20}/>}
                                    </div>
                                <Badge variant={isWinner ? "default" : "secondary"}>{playerScores[player.id]} Puntos</Badge>
                               </li>
                            )
                        })}
                    </ul>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-4">Resumen de Adivinanzas</h3>
                    <Accordion type="single" collapsible className="w-full">
                        {shuffledPhrases.map(phrase => (
                             <AccordionItem key={phrase.id} value={phrase.id}>
                                <AccordionTrigger>
                                    <div className="text-left">
                                        <p className="italic">"{phrase.anonymizedText}"</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Escrita por: <span className="font-semibold text-primary">{getPlayerName(phrase.authorId)}</span>
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pl-4">
                                        {game.players.map(guessingPlayer => {
                                            if (guessingPlayer.id === phrase.authorId) return null;
                                            
                                            const guess = game.guesses?.[guessingPlayer.id]?.find(g => g.phraseId === phrase.id);
                                            const guessedPlayerName = guess ? getPlayerName(guess.guessedPlayerId) : "N/A";
                                            const isCorrect = guess?.guessedPlayerId === phrase.authorId;

                                            return (
                                                <li key={guessingPlayer.id} className="text-sm">
                                                    <strong>{guessingPlayer.name}</strong> ha adivinado: 
                                                    <Badge variant={isCorrect ? "default" : "destructive"} className="ml-2">
                                                        {guessedPlayerName}
                                                    </Badge>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row justify-center gap-4 pt-6">
                <Button onClick={handleCreateNewGame}>
                    <PartyPopper className="mr-2" />
                    Crear Nueva Partida
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                    <Home className="mr-2" />
                    Volver al Inicio
                </Button>
            </CardFooter>
        </Card>
    );
};


  return (
     <div className="flex flex-col min-h-screen">
      <Header />
       <main className="flex-1 container mx-auto p-4 md:p-8">
        {game.phase === 'lobby' && renderLobby()}
        {game.phase === 'submission' && renderSubmission()}
        {game.phase === 'guessing' && renderGuessing()}
        {game.phase === 'results' && renderResults()}
       </main>
     </div>
  );
}

    