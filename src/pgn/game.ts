/**
 * Game class matching python-chess chess.pgn.Game
 * 
 * This is the root node of a game tree, containing the headers and
 * the game tree with all moves and variations.
 */

import { STARTING_FEN } from '../chess';
import { GameNode } from './game-node';
import { Headers } from './headers';

/**
 * Parse error that occurred during game parsing.
 */
export interface GameError {
  message: string;
  moveNumber?: number;
  san?: string;
  fen?: string;
}

/**
 * Root node of a game tree.
 * Matches python-chess chess.pgn.Game.
 * 
 * The Game class extends GameNode and represents the root of the tree.
 * It has no move (move is null), but it can have:
 * - headers (PGN tags)
 * - a starting comment (game comment before the first move)
 * - variations (the moves of the game)
 */
export class Game extends GameNode {
  /** PGN headers/tags. Matches python-chess game.headers */
  headers: Headers;

  /** Errors encountered during parsing */
  errors: GameError[] = [];

  constructor() {
    super();
    this.headers = new Headers();
    // Game is always a root, so parent is always null
    this.parent = null;
    this.move = null;
  }

  /**
   * Get the starting FEN for this game.
   * Uses headers["FEN"] if present, otherwise the standard starting position.
   */
  protected override getStartingFen(): string {
    return this.headers.get('FEN') ?? STARTING_FEN;
  }

  /**
   * Set up a game with default Seven Tag Roster.
   */
  static withDefaults(): Game {
    const game = new Game();
    game.headers.set('Event', '?');
    game.headers.set('Site', '?');
    game.headers.set('Date', '????.??.??');
    game.headers.set('Round', '?');
    game.headers.set('White', '?');
    game.headers.set('Black', '?');
    game.headers.set('Result', '*');
    return game;
  }

  /**
   * Create a game from a FEN position.
   */
  static fromFen(fen: string): Game {
    const game = Game.withDefaults();
    game.headers.set('FEN', fen);
    game.headers.set('SetUp', '1');
    return game;
  }

  /**
   * Create a game from board position at a node.
   */
  static fromBoard(board: import('../chess').Board): Game {
    return Game.fromFen(board.fen());
  }

  /**
   * Export the game back to PGN format.
   */
  toPgn(options?: { columns?: number }): string {
    const lines: string[] = [];
    const columns = options?.columns ?? 80;

    // Export headers
    for (const [key, value] of this.headers) {
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`[${key} "${escapedValue}"]`);
    }
    
    if (this.headers.size > 0) {
      lines.push('');
    }

    // Export moves
    const moveText = this.exportMoves(this, true, 1);
    
    // Wrap text to columns
    if (columns > 0) {
      lines.push(this.wrapText(moveText, columns));
    } else {
      lines.push(moveText);
    }

    // Add result at end
    const result = this.headers.get('Result') ?? '*';
    if (!moveText.endsWith(result)) {
      lines.push(result);
    }

    return lines.join('\n');
  }

  private exportMoves(node: GameNode, isMainline: boolean, moveNumber: number): string {
    const parts: string[] = [];

    // Game comment (for root node)
    if (node === this && node.comment) {
      parts.push(`{${node.comment}}`);
    }

    for (let i = 0; i < node.variations.length; i++) {
      const variation = node.variations[i];
      const isFirst = i === 0;
      const isMain = isMainline && isFirst;

      // Starting comment
      if (variation.startingComment) {
        parts.push(`{${variation.startingComment}}`);
      }

      // Move number
      const board = node.board();
      const isWhite = board.turn;
      
      if (isFirst) {
        if (isWhite) {
          parts.push(`${moveNumber}.`);
        } else if (node === this) {
          parts.push(`${moveNumber}...`);
        }
      } else {
        // Start of a variation
        parts.push('(');
        if (isWhite) {
          parts.push(`${moveNumber}.`);
        } else {
          parts.push(`${moveNumber}...`);
        }
      }

      // The move itself
      if (variation.move) {
        const san = board.san(variation.move);
        parts.push(san);
      }

      // NAGs
      for (const nag of variation.nags) {
        parts.push(`$${nag}`);
      }

      // Comment after move
      if (variation.comment) {
        parts.push(`{${variation.comment}}`);
      }

      // Recursively export the continuation
      const nextMoveNumber = isWhite ? moveNumber : moveNumber + 1;
      const continuation = this.exportMoves(variation, isMain, nextMoveNumber);
      if (continuation) {
        parts.push(continuation);
      }

      // Close variation parenthesis
      if (!isFirst) {
        parts.push(')');
      }
    }

    return parts.join(' ');
  }

  private wrapText(text: string, columns: number): string {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= columns) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Get a string representation of the game.
   */
  toString(): string {
    const event = this.headers.get('Event') ?? '?';
    const white = this.headers.get('White') ?? '?';
    const black = this.headers.get('Black') ?? '?';
    const result = this.headers.get('Result') ?? '*';
    return `<Game "${event}": ${white} vs ${black} (${result})>`;
  }
}

