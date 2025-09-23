"use client";

import type { Player, Phrase, Guess } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Trophy,
} from "lucide-react";

interface ResultsDisplayProps {
  players: Player[];
  phrases: Phrase[];
  guesses: Guess[];
  onPlayAgain: () => void;
}

export function ResultsDisplay({
  players,
  phrases,
  guesses,
  onPlayAgain,
}: ResultsDisplayProps) {
  const getPlayerName = (id: string) =>
    players.find((p) => p.id === id)?.name || "Desconocido";

  const scores = players
    .map((player) => {
      const correctGuesses = guesses.filter((guess) => {
        const phrase = phrases.find((p) => p.id === guess.phraseId);
        return (
          phrase &&
          phrase.authorId === guess.guessedPlayerId &&
          guess.guessedPlayerId === player.id
        );
      });
      // This logic is not quite right for a multi-guesser scenario.
      // We are just counting correct guesses for now.
      // A real implementation would need to know WHO made the guess.
      // The current data structure assumes a single guesser.
      // Let's calculate total correct guesses for the whole game.
      const totalScore = guesses.reduce((acc, guess) => {
        const phrase = phrases.find((p) => p.id === guess.phraseId);
        if (phrase && phrase.authorId === guess.guessedPlayerId) {
          return acc + 1;
        }
        return acc;
      }, 0);

      // We'll placeholder player scores for now.
      const playerScore = guesses.filter(g => {
        const phrase = phrases.find(p => p.id === g.phraseId);
        return phrase?.authorId === g.guessedPlayerId;
      }).length;


      return {
        id: player.id,
        name: player.name,
        score: playerScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  const totalCorrectGuesses = guesses.reduce((acc, guess) => {
    const phrase = phrases.find((p) => p.id === guess.phraseId);
    if (phrase && phrase.authorId === guess.guessedPlayerId) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="text-center bg-muted/50 p-6 rounded-lg">
        <Trophy className="w-12 h-12 mx-auto text-accent mb-2" />
        <h2 className="text-3xl font-bold text-primary">Resultados Finales</h2>
        <p className="text-5xl font-bold text-accent">
          {totalCorrectGuesses}{" "}
          <span className="text-3xl text-muted-foreground">
            / {phrases.length} Aciertos
          </span>
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Posición</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-right">Aciertos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((player, index) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell className="text-right">{totalCorrectGuesses}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {phrases.map((phrase) => {
          const guess = guesses.find((g) => g.phraseId === phrase.id);
          const guessedPlayerId = guess?.guessedPlayerId;
          const isCorrect = phrase.authorId === guessedPlayerId;

          return (
            <Card
              key={phrase.id}
              className={`border-2 ${
                isCorrect ? "border-primary/50" : "border-destructive/50"
              }`}
            >
              <CardContent className="p-6 space-y-4">
                <p className="text-lg font-medium text-foreground">
                  "{phrase.anonymizedText}"
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <strong>Autor:</strong>
                    <span className="font-semibold text-primary">
                      {getPlayerName(phrase.authorId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <strong>Adivinanza:</strong>
                    <span
                      className={
                        isCorrect ? "text-primary" : "text-destructive"
                      }
                    >
                      {guessedPlayerId
                        ? getPlayerName(guessedPlayerId)
                        : "No adivinado"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Button size="lg" onClick={onPlayAgain} variant="outline">
          <RefreshCw className="mr-2" />
          Jugar de Nuevo
        </Button>
      </div>
    </div>
  );
}
