// Interactive view of a Puzzle: renders the tiles and handles drag, tap and
// slide gestures with pointer events (mouse, touch and pen alike).
import { readLayout, placeTile, onResize } from './board-layout.js';

const TAP_SLOP = 4;        // px of movement before a press counts as a drag
const COMMIT_FRACTION = 0.35; // how far a tile must be dragged to complete the move

export class BoardView {
    constructor(puzzle, boardEl) {
        this.puzzle = puzzle;
        this.el = boardEl;
        this.tiles = new Map(); // tile value -> element
        this.drag = null;
        this.layout = readLayout(boardEl);

        this.build();

        boardEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        boardEl.addEventListener('pointermove', (e) => this.onPointerMove(e));
        boardEl.addEventListener('pointerup', (e) => this.onPointerUp(e, false));
        boardEl.addEventListener('pointercancel', (e) => this.onPointerUp(e, true));

        puzzle.on('stateChange', () => this.sync());
        onResize(() => {
            this.layout = readLayout(this.el);
            this.sync();
        });
    }

    build() {
        this.el.innerHTML = '';
        this.tiles.clear();
        const { board } = this.puzzle.getState();
        for (let row = 0; row < this.puzzle.size; row++) {
            for (let col = 0; col < this.puzzle.size; col++) {
                const value = board[row][col];
                if (value === 0) continue;
                const tile = document.createElement('div');
                tile.className = value % 2 === 0 ? 'tile even' : 'tile odd';
                tile.textContent = value;
                tile.dataset.value = value;
                this.el.appendChild(tile);
                this.tiles.set(value, tile);
            }
        }
        this.sync();
    }

    // Move every tile to where the puzzle says it is. CSS transitions animate it.
    sync() {
        const { board, emptyPos } = this.puzzle.getState();
        for (let row = 0; row < this.puzzle.size; row++) {
            for (let col = 0; col < this.puzzle.size; col++) {
                const value = board[row][col];
                if (value === 0) continue;
                const tile = this.tiles.get(value);
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.classList.toggle('movable', row === emptyPos.row || col === emptyPos.col);
                placeTile(tile, this.layout, row, col);
            }
        }
    }

    onPointerDown(e) {
        if (this.drag || e.button > 0) return;
        const tile = e.target.closest('.tile');
        if (!tile) return;

        const row = Number(tile.dataset.row);
        const col = Number(tile.dataset.col);
        if (!this.puzzle.canMoveTile(row, col)) return;

        this.layout = readLayout(this.el);
        this.drag = {
            pointerId: e.pointerId,
            row,
            col,
            direction: this.puzzle.getMoveDirection(row, col),
            group: this.puzzle.getMovableTiles(row, col).map(t => this.tiles.get(t.value)),
            startX: e.clientX,
            startY: e.clientY,
            offset: 0,
            moved: false
        };
        this.drag.group.forEach(t => t.classList.add('dragging'));
        this.el.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    onPointerMove(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;

        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) d.moved = true;

        // Tiles only travel along the axis of the move, and only as far as one cell.
        const max = this.layout.step;
        switch (d.direction) {
            case 'right': d.offset = Math.min(max, Math.max(0, dx)); break;
            case 'left': d.offset = Math.max(-max, Math.min(0, dx)); break;
            case 'down': d.offset = Math.min(max, Math.max(0, dy)); break;
            case 'up': d.offset = Math.max(-max, Math.min(0, dy)); break;
        }
        const horizontal = d.direction === 'left' || d.direction === 'right';
        for (const tile of d.group) {
            placeTile(tile, this.layout, Number(tile.dataset.row), Number(tile.dataset.col),
                horizontal ? d.offset : 0, horizontal ? 0 : d.offset);
        }
    }

    onPointerUp(e, cancelled) {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        this.drag = null;
        d.group.forEach(t => t.classList.remove('dragging'));

        // A tap slides the tile; a drag slides it if it went far enough.
        const commit = !cancelled && (!d.moved || Math.abs(d.offset) >= this.layout.step * COMMIT_FRACTION);
        if (commit) this.puzzle.moveTile(d.row, d.col); // stateChange -> sync()
        else this.sync();
    }
}
