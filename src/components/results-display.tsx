"use client";

import type { Player, Phrase, Guess } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, RefreshCw, User, Trophy } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    players.find((p) => p.id === id)?.name || "Unknown";

  const score = guesses.reduce((acc, guess) => {
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
        <h2 className="text-3xl font-bold text-primary">Your Score</h2>
        <p className="text-5xl font-bold text-accent">
          {score}{" "}
          <span className="text-3xl text-muted-foreground">
            / {phrases.length}
          </span>
        </p>
      </div>

      <Separator />

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
                    <strong>Author:</strong>
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
                    <strong>Your Guess:</strong>
                    <span
                      className={
                        isCorrect ? "text-primary" : "text-destructive"
                      }
                    >
                      {guessedPlayerId ? getPlayerName(guessedPlayerId) : "No guess"}
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
          Play Again
        </Button>
      </div>
    </div>
  );
}
