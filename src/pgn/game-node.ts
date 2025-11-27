/**
 * GameNode class matching python-chess chess.pgn.GameNode
 * 
 * This is the base class for game tree nodes.
 * The root node (Game class) has no move, while ChildNode has a move.
 */

import { Board, Move, STARTING_FEN } from '../chess';

// Forward declaration for circular dependency
export type ChildNode = GameNode & { move: Move; parent: GameNode };

/**
 * Arrow annotation [%cal ...]
 */
export interface Arrow {
  /** Color: 'R', 'G', 'B', 'Y' */
  color: string;
  /** Tail square (0-63) */
  tail: number;
  /** Head square (0-63) */
  head: number;
}

/**
 * Shape/highlight annotation [%csl ...]
 */
export interface Shape {
  /** Color: 'R', 'G', 'B', 'Y' */
  color: string;
  /** Square (0-63) */
  square: number;
}

/**
 * Base class for all game tree nodes.
 * Matches python-chess chess.pgn.GameNode.
 */
export class GameNode {
  /** Parent node, null for root. */
  parent: GameNode | null = null;
  
  /** The move that led to this node. null for root. */
  move: Move | null = null;
  
  /** Child nodes (variations). First is the main line. */
  variations: GameNode[] = [];
  
  /** Comment after the move. */
  comment: string = '';
  
  /** Comment before the move (starting comment). */
  startingComment: string = '';
  
  /** Numeric Annotation Glyphs (NAGs). */
  nags: Set<number> = new Set();
  
  /** Clock time annotation (in seconds). */
  clock: number | null = null;
  
  /** Eval annotation. */
  eval: number | null = null;
  
  /** Arrow annotations [%cal ...] */
  arrows: Arrow[] = [];
  
  /** Shape/highlight annotations [%csl ...] */
  shapes: Shape[] = [];

  // Board cache
  private _board: Board | null = null;
  private _boardValid: boolean = false;

  constructor() {}

  // ==========================================================================
  // Board State
  // ==========================================================================

  /**
   * Get the board position AFTER this move.
   * Matches python-chess node.board()
   */
  board(): Board {
    if (this._boardValid && this._board) {
      return this._board.copy();
    }

    // Build board by replaying moves from root
    let board: Board;
    
    if (this.parent === null) {
      // Root node - use starting position
      board = new Board(this.getStartingFen());
    } else {
      // Get parent's board and apply this move
      board = this.parent.board();
      if (this.move) {
        board.push(this.move);
      }
    }

    this._board = board.copy();
    this._boardValid = true;
    
    return board;
  }

  /**
   * Get the starting FEN for this game tree.
   * Override in Game class to use headers["FEN"].
   */
  protected getStartingFen(): string {
    if (this.parent) {
      return this.parent.getStartingFen();
    }
    return STARTING_FEN;
  }

  /**
   * Get the FEN string for the position after this move.
   */
  fen(): string {
    return this.board().fen();
  }

  /**
   * Get the SAN notation of this move.
   */
  san(): string | null {
    if (!this.move || !this.parent) return null;
    const parentBoard = this.parent.board();
    return parentBoard.san(this.move);
  }

  /**
   * Get the UCI notation of this move.
   */
  uci(): string | null {
    return this.move?.uci() ?? null;
  }

  // ==========================================================================
  // Tree Navigation (matching python-chess)
  // ==========================================================================

  /**
   * Check if this is the last node in its line.
   * Matches python-chess node.is_end()
   */
  isEnd(): boolean {
    return this.variations.length === 0;
  }

  /**
   * Check if this node is in the mainline of the game.
   * Matches python-chess node.is_mainline()
   */
  isMainline(): boolean {
    let node: GameNode | null = this;
    while (node.parent !== null) {
      if (node.parent.variations[0] !== node) {
        return false;
      }
      node = node.parent;
    }
    return true;
  }

  /**
   * Check if this node is the main variation (first child of parent).
   * Matches python-chess node.is_main_variation()
   */
  isMainVariation(): boolean {
    if (this.parent === null) return true;
    return this.parent.variations[0] === this;
  }

  /**
   * Get the root node of the game tree.
   * Matches python-chess node.root()
   */
  root(): GameNode {
    let node: GameNode = this;
    while (node.parent !== null) {
      node = node.parent;
    }
    return node;
  }

  /**
   * Follow the mainline to the end and return the last node.
   * Matches python-chess node.end()
   */
  end(): GameNode {
    let node: GameNode = this;
    while (node.variations.length > 0) {
      node = node.variations[0];
    }
    return node;
  }

  /**
   * Get the next node in the mainline (first variation).
   * Returns null if this is the end.
   */
  next(): GameNode | null {
    return this.variations[0] ?? null;
  }

  /**
   * Iterate mainline moves from this node.
   * Matches python-chess node.mainline_moves()
   */
  *mainlineMoves(): IterableIterator<Move> {
    for (const node of this.mainline()) {
      if (node.move) {
        yield node.move;
      }
    }
  }

  /**
   * Iterate mainline nodes from this node.
   * Matches python-chess node.mainline()
   */
  *mainline(): IterableIterator<GameNode> {
    let node: GameNode | null = this.variations[0] ?? null;
    while (node !== null) {
      yield node;
      node = node.variations[0] ?? null;
    }
  }

  /**
   * Check if a move exists as a variation.
   * Matches python-chess node.has_variation()
   */
  hasVariation(move: Move): boolean {
    return this.variations.some(v => v.move?.equals(move));
  }

  /**
   * Get the child node for a specific move.
   * Matches python-chess node.variation()
   */
  variation(move: Move): GameNode | null {
    return this.variations.find(v => v.move?.equals(move)) ?? null;
  }

  // ==========================================================================
  // Tree Modification (matching python-chess)
  // ==========================================================================

  /**
   * Add a new variation with the given move.
   * Matches python-chess node.add_variation()
   */
  addVariation(
    move: Move,
    options?: {
      comment?: string;
      startingComment?: string;
      nags?: Iterable<number>;
    }
  ): GameNode {
    const node = new GameNode();
    node.parent = this;
    node.move = move;
    
    if (options?.comment) node.comment = options.comment;
    if (options?.startingComment) node.startingComment = options.startingComment;
    if (options?.nags) node.nags = new Set(options.nags);
    
    this.variations.push(node);
    return node;
  }

  /**
   * Add a move as the main variation (insert at front).
   * Matches python-chess node.add_main_variation()
   */
  addMainVariation(move: Move): GameNode {
    const node = new GameNode();
    node.parent = this;
    node.move = move;
    this.variations.unshift(node);
    return node;
  }

  /**
   * Add a sequence of moves as a line.
   * Matches python-chess node.add_line()
   */
  addLine(
    moves: Iterable<Move>,
    options?: {
      comment?: string;
      startingComment?: string;
    }
  ): GameNode {
    let node: GameNode = this;
    let first = true;
    
    for (const move of moves) {
      const child = new GameNode();
      child.parent = node;
      child.move = move;
      
      if (first && options?.startingComment) {
        child.startingComment = options.startingComment;
        first = false;
      }
      
      node.variations.push(child);
      node = child;
    }
    
    if (options?.comment) {
      node.comment = options.comment;
    }
    
    return node;
  }

  /**
   * Remove a variation by node reference.
   * Matches python-chess node.remove_variation()
   */
  removeVariation(variation: GameNode): void {
    const idx = this.variations.indexOf(variation);
    if (idx !== -1) {
      this.variations.splice(idx, 1);
      variation.parent = null;
    }
  }

  /**
   * Promote this node to be the main variation of its parent.
   * Matches python-chess node.promote()
   */
  promote(): void {
    if (this.parent === null) return;
    
    const idx = this.parent.variations.indexOf(this);
    if (idx > 0) {
      // Swap with previous
      const prev = this.parent.variations[idx - 1];
      this.parent.variations[idx - 1] = this;
      this.parent.variations[idx] = prev;
    }
  }

  /**
   * Demote this variation (swap with next variation).
   * Matches python-chess node.demote()
   */
  demote(): void {
    if (this.parent === null) return;
    
    const idx = this.parent.variations.indexOf(this);
    if (idx >= 0 && idx < this.parent.variations.length - 1) {
      // Swap with next
      const next = this.parent.variations[idx + 1];
      this.parent.variations[idx + 1] = this;
      this.parent.variations[idx] = next;
    }
  }

  /**
   * Promote this variation all the way to main line.
   * Matches python-chess node.promote_to_main()
   */
  promoteToMain(): void {
    if (this.parent === null) return;
    
    const idx = this.parent.variations.indexOf(this);
    if (idx > 0) {
      this.parent.variations.splice(idx, 1);
      this.parent.variations.unshift(this);
    }
  }

  // ==========================================================================
  // Iteration
  // ==========================================================================

  /**
   * Iterate all nodes in the tree (pre-order DFS).
   */
  *[Symbol.iterator](): IterableIterator<GameNode> {
    yield this;
    for (const variation of this.variations) {
      yield* variation;
    }
  }

  /**
   * Count total nodes in this subtree.
   */
  countNodes(): number {
    let count = 1;
    for (const variation of this.variations) {
      count += variation.countNodes();
    }
    return count;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Accept a visitor for tree traversal.
   */
  accept<T>(visitor: GameNodeVisitor<T>): T {
    return visitor.visitGameNode(this);
  }

  /**
   * Get the ply (half-move) number of this node.
   * Root is 0, first move is 1, etc.
   */
  ply(): number {
    let count = 0;
    let node: GameNode | null = this;
    while (node.parent !== null) {
      count++;
      node = node.parent;
    }
    return count;
  }

  /**
   * Get the full move number at this position.
   */
  moveNumber(): number {
    return Math.floor(this.ply() / 2) + 1;
  }

  /**
   * Invalidate the cached board for this node and all descendants.
   * Call this after modifying the tree structure.
   */
  invalidateBoard(): void {
    this._boardValid = false;
    this._board = null;
    for (const variation of this.variations) {
      variation.invalidateBoard();
    }
  }
}

/**
 * Visitor interface for traversing game trees.
 */
export interface GameNodeVisitor<T> {
  visitGameNode(node: GameNode): T;
}

