export type Player = {
  id: string;
  name: string;
};

export type Phrase = {
  id: string;
  anonymizedText: string;
  authorId: string;
};

export type Guess = {
  phraseId: string;
  guessedPlayerId: string;
};

export type GamePhase = "lobby" | "submission" | "guessing" | "results";

export type Game = {
  id: string;
  phase: GamePhase;
  players: Player[];
  phrases?: Phrase[];
  guesses?: Record<string, Guess[]>; // Player ID -> Guesses
};
