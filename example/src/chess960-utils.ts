// Browser-safe Chess960 utilities - avoid importing server-side code
// This is a copy of just the chess960 functions we need

const PIECE_SYMBOLS = {
  ROOK: 'R',
  KNIGHT: 'N',
  BISHOP: 'B',
  QUEEN: 'Q',
  KING: 'K',
} as const;

export interface Chess960Position {
  position: number; // 1-960
  fen: string;
  pieces: string[]; // Array of 8 pieces representing back rank
}

/**
 * Generate a random Chess960 position number (1-960)
 */
export function generateRandomPosition(): number {
  return Math.floor(Math.random() * 960) + 1;
}

/**
 * Convert position number (1-960) to back rank piece arrangement
 * Uses Scharnagl's numbering scheme
 */
export function positionToBackRank(n: number): string[] {
  if (n < 1 || n > 960) {
    throw new Error('Position must be between 1 and 960');
  }

  // Convert to 0-indexed
  n = n - 1;

  const pieces = new Array(8).fill('');

  // Step 1: Place bishops on opposite colored squares
  const lightSquares = [1, 3, 5, 7];
  const lightBishopIdx = n % 4;
  pieces[lightSquares[lightBishopIdx]] = PIECE_SYMBOLS.BISHOP;
  n = Math.floor(n / 4);

  // Dark-squared bishop
  const darkSquares = [0, 2, 4, 6];
  const darkBishopIdx = n % 4;
  pieces[darkSquares[darkBishopIdx]] = PIECE_SYMBOLS.BISHOP;
  n = Math.floor(n / 4);

  // Step 2: Place queen
  const emptySquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  const queenIdx = n % 6;
  pieces[emptySquares[queenIdx]] = PIECE_SYMBOLS.QUEEN;
  n = Math.floor(n / 6);

  // Step 3: Place knights
  const remainingSquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  const knightPlacements = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [1, 3], [1, 4],
    [2, 3], [2, 4],
    [3, 4]
  ];
  const knightPlacement = knightPlacements[n];
  pieces[remainingSquares[knightPlacement[0]]] = PIECE_SYMBOLS.KNIGHT;
  pieces[remainingSquares[knightPlacement[1]]] = PIECE_SYMBOLS.KNIGHT;

  // Step 4: Place rooks and king
  const lastSquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  pieces[lastSquares[0]] = PIECE_SYMBOLS.ROOK;
  pieces[lastSquares[1]] = PIECE_SYMBOLS.KING;
  pieces[lastSquares[2]] = PIECE_SYMBOLS.ROOK;

  return pieces;
}

/**
 * Convert back rank pieces to FEN notation for starting position
 */
export function backRankToFEN(pieces: string[]): string {
  const backRank = pieces.join('');
  const whiteBackRank = backRank.toLowerCase();
  const blackBackRank = backRank.toUpperCase();
  
  // chess.js interprets: first rank in FEN (rank8) = board[0], last rank (rank1) = board[7]
  // For correct display: board[0] should be black (rank 8), board[7] should be white (rank 1)
  // Testing shows chess.js wants: lowercase at rank 8 (first), uppercase at rank 1 (last)
  return `${whiteBackRank}/pppppppp/8/8/8/8/PPPPPPPP/${blackBackRank} w KQkq - 0 1`;
}

/**
 * Get Chess960 position by number
 */
export function getChess960Position(n: number): Chess960Position {
  const pieces = positionToBackRank(n);
  const fen = backRankToFEN(pieces);
  return {
    position: n,
    fen,
    pieces,
  };
}

/**
 * Get a random Chess960 position
 */
export function getRandomChess960Position(): Chess960Position {
  const position = generateRandomPosition();
  return getChess960Position(position);
}
