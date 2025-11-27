/**
 * Chess types matching python-chess exactly.
 * 
 * In python-chess:
 * - Colors are booleans (WHITE = True, BLACK = False)
 * - Piece types are integers 1-6
 * - Squares are integers 0-63
 */

// =============================================================================
// Colors (matching python-chess)
// =============================================================================

/** Color type - true for white, false for black (matches python-chess) */
export type Color = boolean;

/** White = true (matches python-chess chess.WHITE) */
export const WHITE: Color = true;

/** Black = false (matches python-chess chess.BLACK) */
export const BLACK: Color = false;

/** Color names for display */
export const COLOR_NAMES: readonly string[] = ['black', 'white'] as const;

// =============================================================================
// Piece Types (matching python-chess integers)
// =============================================================================

/** Piece type - integer 1-6 (matches python-chess) */
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6;

export const PAWN: PieceType = 1;
export const KNIGHT: PieceType = 2;
export const BISHOP: PieceType = 3;
export const ROOK: PieceType = 4;
export const QUEEN: PieceType = 5;
export const KING: PieceType = 6;

/** Piece type names (index 0 unused, 1-6 are piece types) */
export const PIECE_NAMES: readonly (string | null)[] = [
  null, 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'
] as const;

/** Piece symbols (lowercase) */
export const PIECE_SYMBOLS: readonly (string | null)[] = [
  null, 'p', 'n', 'b', 'r', 'q', 'k'
] as const;

// =============================================================================
// Squares (matching python-chess integers 0-63)
// =============================================================================

/** Square type - integer 0-63 (matches python-chess) */
export type Square = number;

// Square constants (A1=0, B1=1, ..., H8=63)
export const A1: Square = 0;
export const B1: Square = 1;
export const C1: Square = 2;
export const D1: Square = 3;
export const E1: Square = 4;
export const F1: Square = 5;
export const G1: Square = 6;
export const H1: Square = 7;
export const A2: Square = 8;
export const B2: Square = 9;
export const C2: Square = 10;
export const D2: Square = 11;
export const E2: Square = 12;
export const F2: Square = 13;
export const G2: Square = 14;
export const H2: Square = 15;
export const A3: Square = 16;
export const B3: Square = 17;
export const C3: Square = 18;
export const D3: Square = 19;
export const E3: Square = 20;
export const F3: Square = 21;
export const G3: Square = 22;
export const H3: Square = 23;
export const A4: Square = 24;
export const B4: Square = 25;
export const C4: Square = 26;
export const D4: Square = 27;
export const E4: Square = 28;
export const F4: Square = 29;
export const G4: Square = 30;
export const H4: Square = 31;
export const A5: Square = 32;
export const B5: Square = 33;
export const C5: Square = 34;
export const D5: Square = 35;
export const E5: Square = 36;
export const F5: Square = 37;
export const G5: Square = 38;
export const H5: Square = 39;
export const A6: Square = 40;
export const B6: Square = 41;
export const C6: Square = 42;
export const D6: Square = 43;
export const E6: Square = 44;
export const F6: Square = 45;
export const G6: Square = 46;
export const H6: Square = 47;
export const A7: Square = 48;
export const B7: Square = 49;
export const C7: Square = 50;
export const D7: Square = 51;
export const E7: Square = 52;
export const F7: Square = 53;
export const G7: Square = 54;
export const H7: Square = 55;
export const A8: Square = 56;
export const B8: Square = 57;
export const C8: Square = 58;
export const D8: Square = 59;
export const E8: Square = 60;
export const F8: Square = 61;
export const G8: Square = 62;
export const H8: Square = 63;

/** All squares in order */
export const SQUARES: readonly Square[] = Array.from({ length: 64 }, (_, i) => i);

/** Square names a1-h8 */
export const SQUARE_NAMES: readonly string[] = [
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
] as const;

/** File names a-h */
export const FILE_NAMES: readonly string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/** Rank names 1-8 */
export const RANK_NAMES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

// =============================================================================
// Square Utility Functions
// =============================================================================

/** Get the file (column) of a square (0-7) */
export function squareFile(square: Square): number {
  return square & 7;
}

/** Get the rank (row) of a square (0-7) */
export function squareRank(square: Square): number {
  return square >> 3;
}

/** Create a square from file and rank (both 0-7) */
export function squareFromFileRank(file: number, rank: number): Square {
  return rank * 8 + file;
}

/** Get square name (e.g., "e4") */
export function squareName(square: Square): string {
  return SQUARE_NAMES[square];
}

/** Parse square name to square number, or null if invalid */
export function parseSquare(name: string): Square | null {
  const idx = SQUARE_NAMES.indexOf(name.toLowerCase());
  return idx >= 0 ? idx : null;
}

/** Mirror square vertically (for black's perspective) */
export function squareMirror(square: Square): Square {
  return square ^ 56;
}

/** Get the distance between two squares (Chebyshev distance) */
export function squareDistance(sq1: Square, sq2: Square): number {
  const file1 = squareFile(sq1);
  const rank1 = squareRank(sq1);
  const file2 = squareFile(sq2);
  const rank2 = squareRank(sq2);
  return Math.max(Math.abs(file1 - file2), Math.abs(rank1 - rank2));
}

// =============================================================================
// Castling Rights (as bitmask, matching python-chess)
// =============================================================================

export const BB_EMPTY = 0n;
export const BB_ALL = 0xFFFFFFFFFFFFFFFFn;

// Castling constants
export const CASTLING_WHITE_KINGSIDE = 1;
export const CASTLING_WHITE_QUEENSIDE = 2;
export const CASTLING_BLACK_KINGSIDE = 4;
export const CASTLING_BLACK_QUEENSIDE = 8;
export const CASTLING_WHITE = CASTLING_WHITE_KINGSIDE | CASTLING_WHITE_QUEENSIDE;
export const CASTLING_BLACK = CASTLING_BLACK_KINGSIDE | CASTLING_BLACK_QUEENSIDE;
export const CASTLING_ALL = CASTLING_WHITE | CASTLING_BLACK;

// =============================================================================
// NAG (Numeric Annotation Glyphs) - matching python-chess
// =============================================================================

export const NAG_GOOD_MOVE = 1;           // !
export const NAG_MISTAKE = 2;             // ?
export const NAG_BRILLIANT_MOVE = 3;      // !!
export const NAG_BLUNDER = 4;             // ??
export const NAG_SPECULATIVE_MOVE = 5;    // !?
export const NAG_DUBIOUS_MOVE = 6;        // ?!
export const NAG_FORCED_MOVE = 7;         // □
export const NAG_SINGULAR_MOVE = 8;
export const NAG_WORST_MOVE = 9;
export const NAG_DRAWISH_POSITION = 10;   // =
export const NAG_QUIET_POSITION = 11;
export const NAG_ACTIVE_POSITION = 12;
export const NAG_UNCLEAR_POSITION = 13;   // ∞
export const NAG_WHITE_SLIGHT_ADVANTAGE = 14;  // ⩲
export const NAG_BLACK_SLIGHT_ADVANTAGE = 15;  // ⩱
export const NAG_WHITE_MODERATE_ADVANTAGE = 16; // ±
export const NAG_BLACK_MODERATE_ADVANTAGE = 17; // ∓
export const NAG_WHITE_DECISIVE_ADVANTAGE = 18; // +-
export const NAG_BLACK_DECISIVE_ADVANTAGE = 19; // -+
export const NAG_WHITE_ZUGZWANG = 22;     // ⨀
export const NAG_BLACK_ZUGZWANG = 23;
export const NAG_NOVELTY = 146;

// =============================================================================
// Starting Position
// =============================================================================

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const STARTING_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

