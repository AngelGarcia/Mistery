"use client";

import { useState } from "react";
import type { Player, Phrase, Guess } from "@/lib/types";
import { GameSetup } from "./game-setup";
import { GuessingBoard } from "./guessing-board";
import { ResultsDisplay } from "./results-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Swords, Trophy } from "lucide-react";

type GamePhase = "setup" | "guessing" | "results";

export function GameManager() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);

  const addPlayerAndPhrases = (newPlayer: Player, newPhrases: Phrase[]) => {
    setPlayers((prev) => [...prev, newPlayer]);
    setPhrases((prev) => [...prev, ...newPhrases]);
  };

  const startGame = () => {
    setPhrases((prev) => [...prev].sort(() => Math.random() - 0.5));
    setPhase("guessing");
  };

  const submitGuesses = (userGuesses: Guess[]) => {
    setGuesses(userGuesses);
    setPhase("results");
  };

  const resetGame = () => {
    setPlayers([]);
    setPhrases([]);
    setGuesses([]);
    setPhase("setup");
  };

  const renderPhase = () => {
    switch (phase) {
      case "setup":
        return (
          <GameSetup
            players={players}
            onPlayerAdd={addPlayerAndPhrases}
            onStartGame={startGame}
          />
        );
      case "guessing":
        return (
          <GuessingBoard
            players={players}
            phrases={phrases}
            onSubmitGuesses={submitGuesses}
          />
        );
      case "results":
        return (
          <ResultsDisplay
            players={players}
            phrases={phrases}
            guesses={guesses}
            onPlayAgain={resetGame}
          />
        );
      default:
        return null;
    }
  };

  const PhaseWrapper = ({
    icon,
    title,
    description,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl shadow-primary/10">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle className="text-2xl font-headline text-primary">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const phaseConfig = {
    setup: {
      icon: <Users className="h-6 w-6" />,
      title: "Game Setup",
      description: "Add players and their secret phrases to begin.",
    },
    guessing: {
      icon: <Swords className="h-6 w-6" />,
      title: "Who is Who?",
      description: "Guess which phrase belongs to which player.",
    },
    results: {
      icon: <Trophy className="h-6 w-6" />,
      title: "The Reveal!",
      description: "See how well you did and who the mystery authors are.",
    },
  };

  const config = phaseConfig[phase];

  return (
    <PhaseWrapper
      icon={config.icon}
      title={config.title}
      description={config.description}
    >
      {renderPhase()}
    </PhaseWrapper>
  );
}
