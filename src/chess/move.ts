/**
 * Move class matching python-chess chess.Move
 */

import { Square, PieceType, parseSquare, squareName, QUEEN, KNIGHT, ROOK, BISHOP } from './types';

/**
 * Represents a chess move.
 * Matches python-chess chess.Move class.
 */
export class Move {
  /** Source square (0-63) */
  readonly fromSquare: Square;
  
  /** Target square (0-63) */
  readonly toSquare: Square;
  
  /** Promotion piece type (2-5 for knight/bishop/rook/queen), or null */
  readonly promotion: PieceType | null;
  
  /** Drop piece type (for crazyhouse), or null */
  readonly drop: PieceType | null;

  constructor(
    fromSquare: Square,
    toSquare: Square,
    promotion: PieceType | null = null,
    drop: PieceType | null = null
  ) {
    this.fromSquare = fromSquare;
    this.toSquare = toSquare;
    this.promotion = promotion;
    this.drop = drop;
  }

  /**
   * Get UCI string representation (e.g., "e2e4", "e7e8q").
   * Matches python-chess move.uci()
   */
  uci(): string {
    if (this.drop !== null) {
      // Crazyhouse drop
      const pieceSymbol = ['', 'P', 'N', 'B', 'R', 'Q', 'K'][this.drop];
      return `${pieceSymbol}@${squareName(this.toSquare)}`;
    }
    
    let result = squareName(this.fromSquare) + squareName(this.toSquare);
    
    if (this.promotion !== null) {
      result += ['', '', 'n', 'b', 'r', 'q'][this.promotion];
    }
    
    return result;
  }

  /**
   * Create a Move from UCI string.
   * Matches python-chess chess.Move.from_uci()
   */
  static fromUci(uci: string): Move {
    if (uci.length < 4) {
      throw new Error(`Invalid UCI move: ${uci}`);
    }

    // Handle null move
    if (uci === '0000') {
      return Move.null();
    }

    // Handle drop (e.g., "Q@e4")
    if (uci.includes('@')) {
      const pieceSymbol = uci[0].toUpperCase();
      const toName = uci.slice(2, 4);
      const toSquare = parseSquare(toName);
      if (toSquare === null) {
        throw new Error(`Invalid UCI move: ${uci}`);
      }
      const pieceType = ['', 'P', 'N', 'B', 'R', 'Q', 'K'].indexOf(pieceSymbol) as PieceType;
      return new Move(0, toSquare, null, pieceType);
    }

    const fromName = uci.slice(0, 2);
    const toName = uci.slice(2, 4);
    const promotionChar = uci.length > 4 ? uci[4].toLowerCase() : null;

    const fromSquare = parseSquare(fromName);
    const toSquare = parseSquare(toName);

    if (fromSquare === null || toSquare === null) {
      throw new Error(`Invalid UCI move: ${uci}`);
    }

    let promotion: PieceType | null = null;
    if (promotionChar !== null) {
      const promotionMap: Record<string, PieceType> = {
        'n': KNIGHT,
        'b': BISHOP,
        'r': ROOK,
        'q': QUEEN,
      };
      promotion = promotionMap[promotionChar] ?? null;
      if (promotion === null) {
        throw new Error(`Invalid promotion piece: ${promotionChar}`);
      }
    }

    return new Move(fromSquare, toSquare, promotion, null);
  }

  /**
   * Create a null move.
   * Matches python-chess chess.Move.null()
   */
  static null(): Move {
    return new Move(0, 0, null, null);
  }

  /**
   * Check if this is a null move.
   */
  isNull(): boolean {
    return this.fromSquare === 0 && this.toSquare === 0 && this.promotion === null && this.drop === null;
  }

  /**
   * Check equality with another move.
   */
  equals(other: Move): boolean {
    return (
      this.fromSquare === other.fromSquare &&
      this.toSquare === other.toSquare &&
      this.promotion === other.promotion &&
      this.drop === other.drop
    );
  }

  /**
   * String representation.
   */
  toString(): string {
    return `Move.fromUci("${this.uci()}")`;
  }

  /**
   * Create a copy of this move.
   */
  copy(): Move {
    return new Move(this.fromSquare, this.toSquare, this.promotion, this.drop);
  }
}

