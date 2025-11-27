/**
 * PGN module - matching python-chess chess.pgn API
 */

import { parseGame, parseGames as parseGamesOriginal } from '@mliebelt/pgn-parser';
import { buildGameTree } from './tree-builder';
import { Game } from './game';

// Re-export types
export { GameNode, Arrow, Shape } from './game-node';
export { Game, GameError } from './game';
export { Headers } from './headers';
export { buildGameTree } from './tree-builder';

/**
 * Read a single game from a PGN string.
 * Matches python-chess chess.pgn.read_game()
 * 
 * @param pgn - PGN string containing a single game
 * @returns Game object, or null if the PGN is empty
 * 
 * @example
 * ```typescript
 * const game = readGame(`
 *   [Event "Example"]
 *   1. e4 e5 2. Nf3 *
 * `);
 * 
 * if (game) {
 *   console.log(game.headers.get("Event")); // "Example"
 *   for (const node of game.mainline()) {
 *     console.log(node.san());
 *   }
 * }
 * ```
 */
export function readGame(pgn: string): Game | null {
  const trimmed = pgn.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parseTree = parseGame(trimmed, { startRule: 'game' });
    return buildGameTree(parseTree);
  } catch (error) {
    // If parsing fails, return null like python-chess
    return null;
  }
}

/**
 * Read all games from a PGN string.
 * 
 * @param pgn - PGN string containing one or more games
 * @returns Array of Game objects
 * 
 * @example
 * ```typescript
 * const games = readGames(pgnString);
 * for (const game of games) {
 *   console.log(game.headers.get("White"), "vs", game.headers.get("Black"));
 * }
 * ```
 */
export function readGames(pgn: string): Game[] {
  const trimmed = pgn.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parseTrees = parseGamesOriginal(trimmed, { startRule: 'games' });
    return parseTrees.map(pt => buildGameTree(pt));
  } catch {
    return [];
  }
}

/**
 * Iterator for reading games one at a time from a large PGN string.
 * More memory-efficient for large files.
 * 
 * @param pgn - PGN string containing one or more games
 * @yields Game objects
 */
export function* iterGames(pgn: string): IterableIterator<Game> {
  const games = readGames(pgn);
  for (const game of games) {
    yield game;
  }
}

