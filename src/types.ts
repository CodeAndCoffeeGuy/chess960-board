/**
 * Type definitions for Chess960Board component
 */

export type Square = string;
export type Color = 'white' | 'black';
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface BoardTheme {
  light: string;
  dark: string;
}

export interface PieceSet {
  path: string;
}

export interface Arrow {
  startSquare: Square;
  endSquare: Square;
  color?: string;
}

export interface Chess960BoardProps {
  /** FEN string representing the current position */
  fen?: string;
  /** Board orientation - 'white' shows white at bottom, 'black' shows black at bottom */
  orientation?: Color;
  /** Board width in pixels (board is always square) */
  width?: number;
  /** Callback when a move is attempted (from, to squares) */
  onMove?: (from: Square, to: Square, promotion?: PieceType) => void;
  /** If true, board is read-only and moves are disabled */
  readOnly?: boolean;
  /** If true, shows file (a-h) and rank (1-8) labels */
  showCoordinates?: boolean;
  /** Custom board theme colors */
  theme?: BoardTheme;
  /** Custom piece set configuration */
  pieceSet?: PieceSet;
  /** Base URL for piece images (default: '/pieces') */
  piecesBaseUrl?: string;
  /** Last move squares to highlight (from, to) */
  lastMove?: [Square, Square] | null;
  /** Square that is currently selected */
  selectedSquare?: Square | null;
  /** Legal moves from selected square (array of target squares) */
  legalMoves?: Square[];
  /** Current player color (for turn validation) */
  currentPlayerColor?: Color;
  /** Arrows to display on the board */
  arrows?: Arrow[];
  /** Callback when arrows change (for arrow drawing) */
  onArrowsChange?: (arrows: Arrow[]) => void;
  /** Enable premove support (allow moves when not player's turn) */
  enablePremove?: boolean;
  /** Callback for promotion piece selection */
  onPromotionSelect?: (piece: PieceType) => void;
  /** Animation duration in milliseconds (0 to disable animations) */
  animationDuration?: number;
  /** Show all legal destination squares when a piece is selected (default: true) */
  showDestinations?: boolean;
  /** Snap arrow end to nearest valid move square when drawing (default: true) */
  snapToValidMoves?: boolean;
  /** Enable castling by clicking the rook (default: true) */
  rookCastle?: boolean;
  /** Touch ignore radius in squares (default: 0, set to 1 to ignore touches near square boundaries) */
  touchIgnoreRadius?: number;
  /** Enable keyboard move input (default: false) */
  enableKeyboard?: boolean;
  /** Callback for keyboard input events (for custom handling) */
  onKeyboardInput?: (input: string) => void;
  /** Sound configuration */
  sounds?: {
    /** Base URL for sound files (default: '/sounds') */
    baseUrl?: string;
    /** Enable/disable sounds (default: false) */
    enabled?: boolean;
    /** Custom sound file names */
    files?: {
      move?: string;
      capture?: string;
      check?: string;
      castle?: string;
      promotion?: string;
    };
  };
  /** Input mode: 'drag' (drag & drop), 'click' (click-to-move), or 'both' (default: 'both') */
  moveInputMode?: 'drag' | 'click' | 'both';
  /** Enable blindfold mode (hides pieces, shows only board) */
  blindfold?: boolean;
  /** Enable resize handle for board resizing (default: false) */
  enableResize?: boolean;
  /** Callback when board size changes (for resize handle) */
  onResize?: (width: number) => void;
  /** Erase arrows when clicking on them (default: false) */
  eraseArrowsOnClick?: boolean;
}

