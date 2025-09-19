"use client";

import { useState } from "react";
import type { Player, Phrase, Guess } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Send } from "lucide-react";

interface GuessingBoardProps {
  players: Player[];
  phrases: Phrase[];
  onSubmitGuesses: (guesses: Guess[]) => void;
}

export function GuessingBoard({
  players,
  phrases,
  onSubmitGuesses,
}: GuessingBoardProps) {
  const [currentGuesses, setCurrentGuesses] = useState<Record<string, string>>(
    {}
  );

  const handleGuessChange = (phraseId: string, playerId: string) => {
    setCurrentGuesses((prev) => ({ ...prev, [phraseId]: playerId }));
  };

  const handleSubmit = () => {
    const formattedGuesses: Guess[] = Object.entries(currentGuesses).map(
      ([phraseId, guessedPlayerId]) => ({
        phraseId,
        guessedPlayerId,
      })
    );
    onSubmitGuesses(formattedGuesses);
  };

  const allPhrasesGuessed =
    Object.keys(currentGuesses).length === phrases.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {phrases.map((phrase) => (
          <Card key={phrase.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start gap-4 mb-4">
                <Lightbulb className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                <p className="text-lg font-medium text-foreground">
                  "{phrase.anonymizedText}"
                </p>
              </div>

              <Select onValueChange={(value) => handleGuessChange(phrase.id, value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Who said this?" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="text-center mt-8">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!allPhrasesGuessed}
          className="bg-accent hover:bg-accent/90"
        >
          <Send className="mr-2" />
          Reveal Answers
        </Button>
        {!allPhrasesGuessed && (
          <p className="text-sm text-muted-foreground mt-2">
            Make a guess for every phrase to continue.
          </p>
        )}
      </div>
    </div>
  );
}
