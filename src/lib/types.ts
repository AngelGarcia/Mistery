

export type Player = {
  id: string;
  name: string;
  hasSubmitted?: boolean;
  hasGuessed?: boolean;
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

export type TwoTruthsOneLieStatement = {
  authorId: string;
  statements: [string, string, string];
  lieIndex: number;
}

export type GameMode = "who-is-who" | "two-truths-one-lie";

export type GamePhase = "lobby" | "submission" | "guessing" | "results";

export type Game = {
  id: string;
  phase: GamePhase;
  players: Player[];
  hostId?: string; // ID of the player who is the host
  gameMode: GameMode;
  
  // "who-is-who" mode data
  phrases?: Phrase[];
  guesses?: Record<string, Guess[]>; // Player ID -> Guesses

  // "two-truths-one-lie" mode data
  statements?: TwoTruthsOneLieStatement[];
  currentStatementIndex?: number; // Index for the statements array, indicating whose turn it is
  twoTruthsGuesses?: Record<string, Record<string, number>>; // { [authorId]: { [guesserId]: guessIndex } }
};
