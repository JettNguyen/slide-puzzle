# [Slide15](https://jettnguyen.github.io/Slide15/)

A 4x4 sliding number puzzle in plain HTML, CSS and JavaScript, with a solver that finds the shortest solution between any two positions.

## Playing

- Tap a tile in the same row or column as the gap to slide it. Dragging works too, and dragging a tile with others in the way slides the whole row.
- Arrow keys slide tiles on a keyboard.
- **New Puzzle** shuffles the board. When you solve it you'll see your move count and time, along with the fewest moves that would have done it.
- **Colors** lets you pick your own palette. It's saved in the browser.

## Solver

Open **Solver** from the main page.

1. Set up the **Start** board by dragging tiles onto each other to swap them (or tapping two tiles). **Randomize** gives you a scrambled position.
2. Set up the **Target** board the same way. It defaults to the solved board.
3. **Find solution** searches for the shortest path. Step through it with the buttons, play it back at your own speed, or click any move in the list to jump there.

The solver is iterative-deepening A* with Manhattan distance plus linear conflict, running in a Web Worker so the page stays responsive. Typical shuffles solve in well under a second; uniformly random positions can take a few seconds, and it gives up after a minute.

## Running locally

The scripts are ES modules, so the files need to be served rather than opened directly:

```
python3 -m http.server
```

then visit http://localhost:8000.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `app.js` | The game page |
| `solver.html`, `solver-page.js` | The solver page |
| `puzzle.js` | Board state and move rules |
| `board.js` | Interactive board rendering and drag handling |
| `solver.js`, `solver-worker.js` | Search algorithm and its worker wrapper |
| `theme.js`, `modal.js`, `board-layout.js` | Shared colour, dialog and layout helpers |
