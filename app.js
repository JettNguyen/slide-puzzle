// Main game page.
import { Puzzle } from './puzzle.js';
import { BoardView } from './board.js';
import { applySavedColors, setupColorModal } from './theme.js';
import { openModal, closeModal, setupModal, isModalOpen } from './modal.js';
import { solveAsync, SOLVED } from './solver.js';

// Arrow key -> where the sliding tile sits relative to the blank.
const KEY_OFFSETS = {
    ArrowUp: [1, 0],
    ArrowDown: [-1, 0],
    ArrowLeft: [0, 1],
    ArrowRight: [0, -1]
};

class Game {
    constructor() {
        applySavedColors();

        this.puzzle = new Puzzle(4);
        this.puzzle.shuffle();
        this.view = new BoardView(this.puzzle, document.getElementById('puzzle-board'));
        this.moveCountEl = document.getElementById('move-count');
        this.winModal = document.getElementById('win-modal');
        this.startTime = null;
        this.optimalTask = null;
        this.optimalMoves = null;

        this.puzzle.on('move', () => {
            if (!this.startTime) this.startTime = Date.now();
        });
        this.puzzle.on('stateChange', (state) => {
            this.moveCountEl.textContent = state.moveCount;
            if (state.isSolved && state.moveCount > 0) this.showWin(state.moveCount);
        });

        document.getElementById('shuffle-btn').addEventListener('click', () => this.newPuzzle());
        document.getElementById('play-again-btn').addEventListener('click', () => {
            closeModal(this.winModal);
            this.newPuzzle();
        });
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        setupModal(this.winModal);
        setupColorModal();
        this.setupTutorial();
        this.findOptimal();
    }

    newPuzzle() {
        this.puzzle.shuffle();
        this.startTime = null;
        this.findOptimal();
    }

    // Work out the shortest solution in the background so the win screen can
    // compare against it. Quietly gives up if it takes too long.
    findOptimal() {
        this.optimalTask?.cancel();
        this.optimalMoves = null;
        const task = solveAsync(this.puzzle.getBoardArray(), SOLVED, { timeLimit: 20000 });
        this.optimalTask = task;
        task.promise
            .then(moves => { if (this.optimalTask === task) this.optimalMoves = moves.length; })
            .catch(() => {});
    }

    onKeyDown(e) {
        const offset = KEY_OFFSETS[e.key];
        if (!offset || isModalOpen()) return;
        const row = this.puzzle.emptyPos.row + offset[0];
        const col = this.puzzle.emptyPos.col + offset[1];
        if (!this.puzzle.isValidPosition(row, col)) return;
        e.preventDefault();
        this.puzzle.moveTile(row, col);
    }

    showWin(moves) {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        document.getElementById('player-moves').textContent = moves;
        document.getElementById('time-taken').textContent = formatTime(elapsed);

        const optimalRow = document.getElementById('optimal-row');
        const message = document.getElementById('win-message');
        if (this.optimalMoves !== null) {
            document.getElementById('optimal-moves').textContent = this.optimalMoves;
            optimalRow.hidden = false;
            if (moves === this.optimalMoves) message.textContent = 'That is the fewest moves possible.';
            else if (moves <= this.optimalMoves * 1.5) message.textContent = 'Close to the shortest solution.';
            else message.textContent = '';
        } else {
            optimalRow.hidden = true;
            message.textContent = '';
        }
        message.hidden = message.textContent === '';
        openModal(this.winModal);
    }

    setupTutorial() {
        const modal = document.getElementById('tutorial-modal');
        setupModal(modal, () => {
            try { localStorage.setItem('tutorial-seen', 'true'); } catch { /* ignore */ }
        });
        document.getElementById('tutorial-trigger').addEventListener('click', () => openModal(modal));

        let seen = false;
        try { seen = localStorage.getItem('tutorial-seen') === 'true'; } catch { /* ignore */ }
        if (!seen) setTimeout(() => openModal(modal), 500);
    }
}

function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => new Game());
