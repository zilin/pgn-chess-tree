/**
 * Piece class matching python-chess chess.Piece
 */

import { Color, PieceType, WHITE, PIECE_SYMBOLS, PIECE_NAMES } from './types';

/**
 * Represents a chess piece with color and type.
 * Matches python-chess chess.Piece class.
 */
export class Piece {
  /** Piece type (1-6) */
  readonly pieceType: PieceType;
  
  /** Color (true = white, false = black) */
  readonly color: Color;

  constructor(pieceType: PieceType, color: Color) {
    this.pieceType = pieceType;
    this.color = color;
  }

  /**
   * Get the symbol for this piece.
   * Uppercase for white, lowercase for black.
   * Matches python-chess piece.symbol()
   */
  symbol(): string {
    const symbol = PIECE_SYMBOLS[this.pieceType]!;
    return this.color === WHITE ? symbol.toUpperCase() : symbol;
  }

  /**
   * Get the unicode symbol for this piece.
   */
  unicodeSymbol(): string {
    const symbols = this.color === WHITE
      ? ['', '♙', '♘', '♗', '♖', '♕', '♔']
      : ['', '♟', '♞', '♝', '♜', '♛', '♚'];
    return symbols[this.pieceType];
  }

  /**
   * Create a piece from a symbol character.
   * Matches python-chess chess.Piece.from_symbol()
   */
  static fromSymbol(symbol: string): Piece {
    const lower = symbol.toLowerCase();
    const idx = PIECE_SYMBOLS.indexOf(lower);
    if (idx <= 0 || idx > 6) {
      throw new Error(`Invalid piece symbol: ${symbol}`);
    }
    const pieceType = idx as PieceType;
    const color = symbol === symbol.toUpperCase();
    return new Piece(pieceType, color);
  }

  /**
   * Get piece name (e.g., "knight").
   */
  name(): string {
    return PIECE_NAMES[this.pieceType]!;
  }

  /**
   * Check equality with another piece.
   */
  equals(other: Piece): boolean {
    return this.pieceType === other.pieceType && this.color === other.color;
  }

  /**
   * String representation.
   */
  toString(): string {
    return `Piece.fromSymbol("${this.symbol()}")`;
  }

  /**
   * Hash for use in maps/sets.
   */
  hash(): number {
    return this.pieceType + (this.color ? 6 : 0);
  }
}

