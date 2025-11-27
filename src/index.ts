/**
 * pgn-chess
 * 
 * Python-chess compatible game tree API for PGN parsing.
 * Built on top of @mliebelt/pgn-parser.
 * 
 * @example
 * ```typescript
 * import { readGame, readGames } from 'pgn-chess';
 * 
 * // Read a single game
 * const game = readGame(pgnString);
 * 
 * // Access headers (like python-chess)
 * console.log(game.headers.get("White"));
 * 
 * // Iterate mainline moves
 * for (const node of game.mainline()) {
 *   console.log(node.san());   // "e4", "e5", ...
 *   console.log(node.fen());   // FEN after this move
 *   console.log(node.board()); // Board object
 * }
 * 
 * // Access variations
 * const firstMove = game.variations[0];
 * console.log(firstMove.variations.length); // Number of responses
 * ```
 */

// Main API functions
export { readGame, readGames, iterGames } from './pgn';

// Game tree classes
export { Game, GameError } from './pgn/game';
export { GameNode, Arrow, Shape } from './pgn/game-node';
export { Headers } from './pgn/headers';

// Chess module (matching python-chess)
export * from './chess';

// Re-export the tree builder for advanced usage
export { buildGameTree } from './pgn/tree-builder';

