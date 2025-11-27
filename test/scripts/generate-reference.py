#!/usr/bin/env python3
"""
Generate reference JSON files from PGN files using python-chess.
These reference files are used to test the JavaScript implementation
matches python-chess behavior exactly.
"""

import chess
import chess.pgn
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


def node_to_dict(node: chess.pgn.GameNode, board: chess.Board) -> Dict[str, Any]:
    """Convert a GameNode to a dictionary representation."""
    result: Dict[str, Any] = {}
    
    # Move info (null for root)
    if node.move is not None:
        result["move"] = {
            "uci": node.move.uci(),
            "san": board.san(node.move),
            "from": node.move.from_square,
            "to": node.move.to_square,
            "promotion": node.move.promotion,
            "drop": node.move.drop,
        }
        # Apply the move to get the position after
        board.push(node.move)
    else:
        result["move"] = None
    
    # FEN after this move
    result["fen"] = board.fen()
    
    # Annotations
    result["comment"] = node.comment if node.comment else None
    result["starting_comment"] = node.starting_comment if hasattr(node, 'starting_comment') and node.starting_comment else None
    result["nags"] = sorted(list(node.nags)) if node.nags else []
    
    # Clock and eval (if present in comments)
    result["clock"] = node.clock() if hasattr(node, 'clock') and callable(getattr(node, 'clock', None)) else None
    result["eval"] = None  # python-chess doesn't parse eval by default
    
    # Arrows and shapes
    result["arrows"] = []
    result["shapes"] = []
    if hasattr(node, 'arrows') and callable(getattr(node, 'arrows', None)):
        for arrow in node.arrows():
            result["arrows"].append({
                "color": arrow.color,
                "tail": arrow.tail,
                "head": arrow.head,
            })
    
    # Tree structure info
    result["is_end"] = node.is_end()
    result["is_mainline"] = node.is_mainline()
    result["is_main_variation"] = node.is_main_variation() if hasattr(node, 'is_main_variation') else True
    
    # Process variations (children)
    result["variations"] = []
    for i, variation in enumerate(node.variations):
        # For each variation, we need a fresh copy of the board
        var_board = board.copy()
        if node.move is not None:
            # Pop the move we just made to get the position before this node's move
            var_board = board.copy()
            # Actually we need the board state BEFORE this node's move for variations
            # So let's undo the push we did above
        child_dict = node_to_dict(variation, board.copy())
        child_dict["variation_index"] = i
        result["variations"].append(child_dict)
    
    return result


def game_to_dict(game: chess.pgn.Game) -> Dict[str, Any]:
    """Convert a full Game to a dictionary representation."""
    result: Dict[str, Any] = {}
    
    # Headers
    result["headers"] = dict(game.headers)
    
    # Get the starting position
    if "FEN" in game.headers:
        board = chess.Board(game.headers["FEN"])
    else:
        board = chess.Board()
    
    result["starting_fen"] = board.fen()
    
    # Process the game tree starting from root
    # The root node has no move, so we process its variations directly
    result["comment"] = game.comment if game.comment else None
    result["starting_comment"] = game.starting_comment if hasattr(game, 'starting_comment') and game.starting_comment else None
    result["nags"] = sorted(list(game.nags)) if game.nags else []
    result["is_end"] = game.is_end()
    
    # Process all variations from root
    result["variations"] = []
    for i, variation in enumerate(game.variations):
        child_dict = node_to_dict(variation, board.copy())
        child_dict["variation_index"] = i
        result["variations"].append(child_dict)
    
    # Collect mainline for easy comparison
    result["mainline"] = []
    board = chess.Board(result["starting_fen"])
    for node in game.mainline():
        result["mainline"].append({
            "uci": node.move.uci(),
            "san": board.san(node.move),
            "fen_after": None,  # Will be filled after push
        })
        board.push(node.move)
        result["mainline"][-1]["fen_after"] = board.fen()
    
    # Count total nodes for verification
    result["total_nodes"] = count_nodes(game)
    
    return result


def count_nodes(node: chess.pgn.GameNode) -> int:
    """Count total number of nodes in the tree."""
    count = 1  # Count this node
    for variation in node.variations:
        count += count_nodes(variation)
    return count


def process_pgn_file(pgn_path: Path, output_dir: Path) -> None:
    """Process a single PGN file and generate reference JSON."""
    print(f"Processing: {pgn_path.name}")
    
    games = []
    with open(pgn_path) as pgn_file:
        while True:
            game = chess.pgn.read_game(pgn_file)
            if game is None:
                break
            games.append(game_to_dict(game))
    
    # Output file
    output_path = output_dir / f"{pgn_path.stem}.json"
    with open(output_path, 'w') as f:
        json.dump({
            "source_file": pgn_path.name,
            "games_count": len(games),
            "games": games,
        }, f, indent=2)
    
    print(f"  -> Generated {output_path.name} ({len(games)} games)")


def main():
    # Find the project root (where pgns/ directory is)
    script_dir = Path(__file__).parent
    test_dir = script_dir.parent
    project_root = test_dir.parent
    
    pgns_dir = project_root / "pgns"
    output_dir = test_dir / "reference-trees"
    
    if not pgns_dir.exists():
        print(f"Error: PGN directory not found: {pgns_dir}")
        sys.exit(1)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process all PGN files
    pgn_files = sorted(pgns_dir.glob("*.pgn"))
    if not pgn_files:
        print(f"No PGN files found in {pgns_dir}")
        sys.exit(1)
    
    print(f"Found {len(pgn_files)} PGN files")
    print(f"Output directory: {output_dir}")
    print()
    
    for pgn_path in pgn_files:
        try:
            process_pgn_file(pgn_path, output_dir)
        except Exception as e:
            print(f"  Error processing {pgn_path.name}: {e}")
            import traceback
            traceback.print_exc()
    
    print()
    print("Done!")


if __name__ == "__main__":
    main()

