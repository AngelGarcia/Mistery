

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import type { Game, Player, Phrase, Guess, GameMode, TwoTruthsOneLieStatement } from '@/lib/types';
import { getAnonymizedPhrases } from '@/app/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users, LogIn, Send, Hourglass, Gamepad2, CheckCircle, Lightbulb, Trophy, Star, Home, PartyPopper, XCircle, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';


function GamePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const gameModeFromURL = searchParams.get('gameMode') as GameMode | null;
  const { toast } = useToast();
  const firestore = useFirestore();

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  
  // State for "Two Truths, One Lie"
  const [statements, setStatements] = useState<[string, string, string]>(['', '', '']);
  const LIE_INDEX = 2; // The lie is always the last statement

  useEffect(() => {
    if (!gameId || !firestore) return;

    const gameRef = doc(firestore, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef,
      (doc) => {
        if (doc.exists()) {
          const gameData = doc.data() as Game;
          setGame(gameData);

          const storedPlayerId = localStorage.getItem(`player-id-${gameId}`);
          if (storedPlayerId) {
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
          
          if (gameData.players.every(p => p.hasSubmitted)) {
              if (gameData.phase === 'submission' && isHost) {
                  if (gameData.gameMode === 'who-is-who') {
                      if (gameData.phrases?.length === gameData.players.length) {
                          updateDoc(gameRef, { phase: 'guessing' });
                      }
                  } else if (gameData.gameMode === 'two-truths-one-lie') {
                      if (gameData.statements?.length === gameData.players.length) {
                          updateDoc(gameRef, { phase: 'guessing', currentStatementIndex: 0 });
                      }
                  }
              }
          }
          
          if (gameData.gameMode === 'who-is-who' && gameData?.phase === 'guessing' && gameData.players.every(p => p.hasGuessed)) {
            updateDoc(gameRef, { phase: 'results' });
          }

        } else {
            if (game) { 
                toast({
                    title: "Partida cancelada",
                    description: "La partida ha sido cancelada por el anfitrión.",
                });
                router.push('/');
            }
            setGame(null);
        }
      }, 
      async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: gameRef.path,
            operation: 'get',
          }));
        console.error("Error en snapshot de partida:", error);
      }
    );

    return () => unsubscribe();
  }, [gameId, router, toast, firestore, isHost]);

  const shuffledPhrases = useMemo(() => {
    if (game?.phrases) {
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

  const handleJoinGame = async () => {
    if (!playerName.trim() || !gameId || !firestore) return;

    const playerId = `player-${crypto.randomUUID()}`;
    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim(),
      hasSubmitted: false,
    };

    const gameRef = doc(firestore, 'games', gameId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) {
                if (!gameModeFromURL) {
                    toast({
                        title: 'Error',
                        description: 'No se ha especificado un modo de juego para esta nueva partida.',
                        variant: 'destructive',
                    });
                    throw new Error('Game mode not specified');
                }
                const newGame: Game = {
                    id: gameId,
                    phase: 'lobby',
                    players: [newPlayer],
                    hostId: newPlayer.id,
                    gameMode: gameModeFromURL,
                    currentStatementIndex: 0,
                    statements: [],
                    twoTruthsGuesses: {},
                };
                transaction.set(gameRef, newGame);
                setIsHost(true);
            } else {
                const gameData = gameDoc.data() as Game;
                if (gameData.players.some((p: Player) => p.name === newPlayer.name)) {
                    throw new Error(`El nombre "${newPlayer.name}" ya está en uso.`);
                }
                if (gameData.phase !== 'lobby') {
                    throw new Error('La partida ya ha comenzado.');
                }
                const updatedPlayers = [...gameData.players, newPlayer];
                transaction.update(gameRef, { players: updatedPlayers });
                setIsHost(false);
            }
        });

        localStorage.setItem(`player-id-${gameId}`, newPlayer.id);
        setCurrentPlayer(newPlayer);

        toast({
            title: '¡Bienvenido/a!',
            description: `Te has unido a la partida como ${newPlayer.name}.`,
        });

    } catch (error: any) {
        console.error('Error al unirse a la partida:', error);
        toast({
            title: 'Error al unirse',
            description: error.message || 'No se pudo unir a la partida. Inténtalo de nuevo.',
            variant: 'destructive',
        });
        localStorage.removeItem(`player-id-${gameId}`);
        setCurrentPlayer(null);
        setIsHost(false);
    }
};

  const handleStartGame = async () => {
    if (!isHost || !firestore) return;

    const gameRef = doc(firestore, 'games', gameId);
    const dataToUpdate = { phase: 'submission' };
    updateDoc(gameRef, dataToUpdate)
      .then(() => {
        toast({
          title: "¡La partida ha comenzado!",
          description: "Es hora de que cada uno envíe sus frases.",
        });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: gameRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        }));
        console.error("Error al iniciar la partida:", error);
        toast({
            title: "Error",
            description: "No se pudo iniciar la partida.",
            variant: "destructive",
          });
      });
  };

  const handleCancelGame = async () => {
    if (!isHost || !firestore) return;
    const gameRef = doc(firestore, 'games', gameId);
    try {
        await deleteDoc(gameRef);
        router.push('/');
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: gameRef.path,
            operation: 'delete',
        }));
        console.error("Error canceling game:", error);
        toast({
            title: "Error",
            description: "No se pudo cancelar la partida.",
            variant: "destructive",
        });
    }
  };

  const handleSubmission = async () => {
    if (!phrase.trim() || !currentPlayer || !firestore) return;
    setIsSubmitting(true);
    
    try {
      const originalPhrases = [phrase];
      const anonymized = await getAnonymizedPhrases(originalPhrases);

      const newPhrase: Phrase = {
        id: `${currentPlayer.id}-${Date.now()}`,
        anonymizedText: anonymized[0],
        authorId: currentPlayer.id,
      };

      const gameRef = doc(firestore, 'games', gameId);
      await runTransaction(firestore, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Game not found");
        
        const currentPhrases = gameDoc.data().phrases || [];
        const updatedPlayers = gameDoc.data().players.map((p: Player) => 
            p.id === currentPlayer.id ? { ...p, hasSubmitted: true } : p
        );

        transaction.update(gameRef, {
            phrases: [...currentPhrases, newPhrase],
            players: updatedPlayers
        });
      });

      toast({
        title: "¡Frase enviada!",
        description: "Tu frase ha sido anonimizada. Esperando al resto de jugadores...",
      });

    } catch (error: any) {
        const gameRef = doc(firestore, 'games', gameId);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: gameRef.path,
            operation: 'update',
        }));
        console.error("Error submitting phrases:", error);
        toast({
            title: "Error",
            description: error.message || "No se pudo enviar tu frase.",
            variant: "destructive"
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGuessChange = (phraseId: string, guessedPlayerId: string) => {
    setGuesses(prev => ({...prev, [phraseId]: guessedPlayerId}));
  }

  const handleGuessingSubmission = async () => {
    if (!currentPlayer || !game || !firestore) {
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
        const gameRef = doc(firestore, 'games', gameId);
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error("Game not found");
            
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

    } catch (error: any) {
        const gameRef = doc(firestore, 'games', gameId);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: gameRef.path,
            operation: 'update',
        }));
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

  const handleTwoTruthsSubmission = async () => {
    if (!currentPlayer || !firestore || statements.some(s => !s.trim())) {
      toast({
        title: "Error",
        description: "Por favor, completa las tres frases.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);

    const newStatement: TwoTruthsOneLieStatement = {
      authorId: currentPlayer.id,
      statements: statements,
      lieIndex: LIE_INDEX
    };

    try {
      const gameRef = doc(firestore, 'games', gameId);
      await runTransaction(firestore, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Game not found");
        
        const currentStatements = gameDoc.data().statements || [];
        const updatedPlayers = gameDoc.data().players.map((p: Player) => 
            p.id === currentPlayer.id ? { ...p, hasSubmitted: true } : p
        );

        transaction.update(gameRef, {
            statements: [...currentStatements, newStatement],
            players: updatedPlayers
        });
      });

      toast({
        title: "¡Frases enviadas!",
        description: "Esperando al resto de jugadores...",
      });

    } catch (error: any) {
      const gameRef = doc(firestore, 'games', gameId);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: gameRef.path,
          operation: 'update',
      }));
      console.error("Error submitting statements:", error);
      toast({
          title: "Error",
          description: error.message || "No se pudieron enviar tus frases.",
          variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleLieGuess = async (authorId: string, guessIndex: number) => {
        if (!currentPlayer || !game || !firestore) return;

        const gameRef = doc(firestore, 'games', gameId);
        const guessKey = `twoTruthsGuesses.${authorId}.${currentPlayer.id}`;

        try {
            await updateDoc(gameRef, {
                [guessKey]: guessIndex
            });
            toast({
                title: "¡Voto registrado!",
                description: "Tu elección ha sido guardada. Esperando al resto...",
            });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: gameRef.path,
                operation: 'update',
            }));
            console.error("Error submitting lie guess:", error);
            toast({
                title: "Error al votar",
                description: "No se pudo registrar tu voto.",
                variant: "destructive"
            });
        }
    };

  const handleCreateNewGame = () => {
    router.push(`/`);
  };

  if (!game && !currentPlayer) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Unirse a la Partida</CardTitle>
                    <CardDescription>Introduce tu nombre para entrar o crear la partida: <strong>{gameId}</strong></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Input
                        type="text"
                        placeholder="Tu nombre"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                    />
                    <Button onClick={handleJoinGame} className="w-full" disabled={!playerName.trim()}>
                        <LogIn className="mr-2"/>
                        Unirse o Crear Partida
                    </Button>
                </CardContent>
            </Card>
        </main>
       </div>
    );
  }
  
  if (!game && currentPlayer) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <Hourglass className="animate-spin" /> 
          <span className="ml-2">Creando partida...</span>
        </div>
    );
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
                    />
                    <Button onClick={handleJoinGame} className="w-full" disabled={!playerName.trim()}>
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
             <p className="text-sm text-primary font-semibold pt-2">Modo de juego: {game.gameMode === 'who-is-who' ? '¿Quién es Quién?' : '2 Verdades, 1 Mentira'}</p>
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
        </CardContent>
        <CardFooter className="flex-col sm:flex-row justify-center gap-4 pt-6">
            <p className="text-muted-foreground text-center flex-1">¡Hola, <strong>{currentPlayer.name}</strong>!</p>
            {isHost ? (
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleStartGame} size="lg" disabled={game.players.length < 2}>
                        <Gamepad2 className="mr-2" />
                        Empezar Partida ({game.players.length})
                    </Button>
                     <Button onClick={handleCancelGame} variant="destructive">
                        <XCircle className="mr-2"/>
                        Cancelar
                    </Button>
                </div>
            ) : (
                <p>Espera a que el anfitrión inicie el juego.</p>
            )}
             {isHost && game.players.length < 2 && (
                <p className="text-sm text-muted-foreground mt-2 text-center w-full">Se necesitan al menos 2 jugadores para empezar.</p>
            )}
        </CardFooter>
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


  const renderWhoIsWhoSubmissionForm = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Envía tu Frase</CardTitle>
        <CardDescription>
          Escribe una frase personal y única. Será anonimizada y el resto
          de jugadores tendrán que adivinar que es tuya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea 
            placeholder="Escribe tu frase aquí..." 
            value={phrase}
            onChange={e => setPhrase(e.target.value)}
            disabled={isSubmitting}
        />
        <Button onClick={handleSubmission} className="w-full" disabled={!phrase.trim() || isSubmitting}>
            {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
            {isSubmitting ? 'Enviando...' : 'Enviar Frase'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderTwoTruthsOneLieSubmissionForm = () => {
    const handleStatementChange = (index: number, value: string) => {
        const newStatements = [...statements] as [string, string, string];
        newStatements[index] = value;
        setStatements(newStatements);
    }
    
    const allFilled = statements.every(s => s.trim() !== '');

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Dos Verdades y una Mentira</CardTitle>
                <CardDescription>Escribe dos afirmaciones verdaderas y una falsa sobre ti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="truth-1" className="text-green-700 dark:text-green-400">Verdad 1</Label>
                        <Textarea
                            id="truth-1"
                            placeholder="Escribe una afirmación verdadera..."
                            value={statements[0]}
                            onChange={(e) => handleStatementChange(0, e.target.value)}
                            disabled={isSubmitting}
                            className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 focus-visible:ring-green-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="truth-2" className="text-green-700 dark:text-green-400">Verdad 2</Label>
                        <Textarea
                            id="truth-2"
                            placeholder="Escribe otra afirmación verdadera..."
                            value={statements[1]}
                            onChange={(e) => handleStatementChange(1, e.target.value)}
                            disabled={isSubmitting}
                            className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 focus-visible:ring-green-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lie" className="text-red-700 dark:text-red-400">La Mentira</Label>
                        <Textarea
                            id="lie"
                            placeholder="Escribe tu mentira aquí..."
                            value={statements[2]}
                            onChange={(e) => handleStatementChange(2, e.target.value)}
                            disabled={isSubmitting}
                            className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 focus-visible:ring-red-500"
                        />
                    </div>
                </div>

                 <Button onClick={handleTwoTruthsSubmission} className="w-full" disabled={!allFilled || isSubmitting}>
                    {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
                    {isSubmitting ? 'Enviando...' : 'Enviar Frases'}
                </Button>
            </CardContent>
        </Card>
    );
  };
  
  const renderSubmission = () => {
    const playerHasSubmitted = game.players.find(p => p.id === currentPlayer.id)?.hasSubmitted;
    
    if (playerHasSubmitted) {
        return renderSubmissionStatus("submission");
    }

    if (game.gameMode === 'who-is-who') {
        return renderWhoIsWhoSubmissionForm();
    }

    if (game.gameMode === 'two-truths-one-lie') {
        return renderTwoTruthsOneLieSubmissionForm();
    }

    return null;
  }
  
  const renderGuessingForm = () => {
    if (!game || !currentPlayer) return null;

    const otherPlayers = game.players.filter(p => p.id !== currentPlayer.id);
    const phrasesToGuess = shuffledPhrases.filter(p => p.authorId !== currentPlayer.id);
    const allPhrasesGuessed = phrasesToGuess.length > 0 && phrasesToGuess.every(phrase => guesses[phrase.id]);

    return (
        <Card className="w-full max-w-5xl mx-auto">
            <CardHeader>
                <CardTitle>¿Quién escribió qué?</CardTitle>
                <CardDescription>Adivina qué jugador escribió cada una de las siguientes frases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {phrasesToGuess.map((phrase) => (
                        <Card key={phrase.id} className="flex flex-col">
                            <CardContent className="p-6 flex-grow">
                                <p className="italic text-lg">"{phrase.anonymizedText}"</p>
                            </CardContent>
                            <CardFooter>
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
                            </CardFooter>
                        </Card>
                    ))}
                </div>
                 <Button onClick={handleGuessingSubmission} className="w-full" disabled={!allPhrasesGuessed || isSubmitting}>
                    {isSubmitting ? <Hourglass className="mr-2 animate-spin"/> : <Lightbulb className="mr-2"/>}
                    {isSubmitting ? 'Enviando Adivinanzas...' : 'Enviar Adivinanzas'}
                </Button>
            </CardContent>
        </Card>
    );
  };

  const renderTwoTruthsGuessing = () => {
    if (!game || !currentPlayer || game.statements === undefined || game.currentStatementIndex === undefined) {
        return <p>Cargando...</p>;
    }

    const currentStatementData = game.statements[game.currentStatementIndex];
    if (!currentStatementData) {
        return <p>Esperando al siguiente jugador...</p>;
    }

    const author = game.players.find(p => p.id === currentStatementData.authorId);
    if (!author) return <p>Error: No se encuentra al autor.</p>;

    const isMyTurnToBeGuessed = author.id === currentPlayer.id;

    // Use a memoized shuffled array for the current round
    const shuffledStatements = useMemo(() => {
        if (!currentStatementData) return [];
        const seed = gameId + currentStatementData.authorId;
        let seededRandom = 0;
        for (let i = 0; i < seed.length; i++) {
            seededRandom += seed.charCodeAt(i);
        }
        const random = () => {
            const x = Math.sin(seededRandom++) * 10000;
            return x - Math.floor(x);
        };
        return [...currentStatementData.statements]
            .map((statement, index) => ({ statement, originalIndex: index }))
            .sort(() => random() - 0.5);
    }, [gameId, currentStatementData]);


    if (isMyTurnToBeGuessed) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>¡Es tu turno!</CardTitle>
                    <CardDescription>El resto de jugadores están intentando adivinar tu mentira.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="font-semibold">Tus frases:</p>
                    <ul className="list-disc list-inside space-y-2">
                        {currentStatementData.statements.map((s, i) => (
                            <li key={i} className={i === currentStatementData.lieIndex ? 'text-red-500 font-bold' : ''}>{s}</li>
                        ))}
                    </ul>
                     <div className="flex items-center justify-center pt-4 text-muted-foreground">
                        <Hourglass className="mr-2 animate-spin" />
                        <span>Esperando votos...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const currentGuessesForAuthor = game.twoTruthsGuesses?.[author.id] || {};
    const myGuess = currentGuessesForAuthor[currentPlayer.id];
    const hasGuessed = myGuess !== undefined;

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Adivina la mentira de {author.name}</CardTitle>
                <CardDescription>Lee las tres afirmaciones y haz clic en la que creas que es falsa. ¡Solo tienes un intento!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shuffledStatements.map(({ statement, originalIndex }, displayIndex) => (
                        <Card
                            key={displayIndex}
                            onClick={() => !hasGuessed && handleLieGuess(author.id, originalIndex)}
                            className={cn(
                                "flex flex-col justify-center p-6 min-h-[150px] text-center transition-all",
                                hasGuessed ? "cursor-not-allowed" : "cursor-pointer hover:shadow-lg hover:-translate-y-1",
                                myGuess === originalIndex && "ring-2 ring-primary ring-offset-2 shadow-lg bg-primary/10",
                                hasGuessed && myGuess !== originalIndex && "opacity-60"
                            )}
                        >
                           <p className="text-lg">{statement}</p>
                        </Card>
                    ))}
                </div>
                 {hasGuessed && (
                    <div className="text-center text-muted-foreground pt-4">
                        <p>¡Voto registrado! Esperando a los demás jugadores.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
  
  const renderGuessing = () => {
    if (game.gameMode === 'who-is-who') {
        const playerHasGuessed = game.players.find(p => p.id === currentPlayer.id)?.hasGuessed;
        return playerHasGuessed ? renderSubmissionStatus("guessing") : renderGuessingForm();
    }
    
    if (game.gameMode === 'two-truths-one-lie') {
        return renderTwoTruthsGuessing();
    }
    
    return null;
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

const renderGameContent = () => {
    switch(game.phase) {
        case 'lobby': return renderLobby();
        case 'submission': return renderSubmission();
        case 'guessing': return renderGuessing();
        case 'results': 
            if (game.gameMode === 'who-is-who') return renderResults();
            if (game.gameMode === 'two-truths-one-lie') return <p>Resultados en construcción</p>; // Placeholder
            return <p>Fase de resultados desconocida</p>;
        default: return <p>Fase del juego desconocida</p>;
    }
}


  return (
     <div className="flex flex-col min-h-screen">
      <Header />
       <main className="flex-1 container mx-auto p-4 md:p-8">
        {renderGameContent()}
       </main>
     </div>
  );
}

export default function GamePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <GamePageContent />
        </Suspense>
    )
}
