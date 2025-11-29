# [15 Slide Puzzle](https://jettnguyen.github.io/Slide15/)

A web-based 4x4 sliding number puzzle with animations, multi-tile movement, and a solver using the A* pathfinding algorithm.

## How to Use

### Playing the Game

1. **Move Tiles**: 
   - Drag a tile toward the empty space
   - Or drag multiple aligned tiles at once
2. **Reset**: Click "Reset" to return to the solved state

### Using the Solver

1. **Open Solver**: Click "Solver Mode" to open the solver panel

2. **Input Board States**:
   - Drag the tiles in any solvable configurations

3. **Find Solution**: Click "Find Solution" to calculate the optimal path
   - The solver will validate solvability
   - Solution steps appear below

5. **Navigate Solution**:
   - Use "Previous" and "Next" buttons to step through
   - Click "Play Solution" to auto-play
   - Click any step in the list to jump to that state

## Board Format

Boards are represented as 16 numbers (0-15) in row-major order:

```
Row 1: positions 0-3
Row 2: positions 4-7
Row 3: positions 8-11
Row 4: positions 12-15
```

Example solved state:
```
 1  2  3  4
 5  6  7  8
 9  10 11 12
 13 14 15 
```
