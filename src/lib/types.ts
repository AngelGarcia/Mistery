export type Player = {
  id: string;
  name: string;
};

export type Phrase = {
  id: string;
  anonymizedText: string;
  authorId: string;
};

export type PlayerSubmission = {
  player: Player;
  phrases: string[];
};

export type GameData = {
  players: Player[];
  phrases: Phrase[];
};

export type Guess = {
  phraseId: string;
  guessedPlayerId: string;
};
