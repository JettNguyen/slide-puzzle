// Solver page: set up a start and target board, then step through the shortest
// sequence of moves between them.
import { readLayout, placeTile, onResize } from './board-layout.js';
import { solveAsync, sameParity, describeMoves, applyMoves, SOLVED, SIZE, CELLS } from './solver.js';
import { applySavedColors, setupColorModal } from './theme.js';
import { openModal, closeModal, setupModal } from './modal.js';

const TAP_SLOP = 5;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// A board whose tiles can be rearranged freely: drag a tile onto another to
// swap them, or tap two tiles in turn.
class EditableBoard {
    constructor(el) {
        this.el = el;
        this.board = [...SOLVED];
        this.tiles = new Map(); // value -> element (0 is the blank)
        this.drag = null;
        this.selected = null;

        this.build();
        el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        el.addEventListener('pointermove', (e) => this.onPointerMove(e));
        el.addEventListener('pointerup', (e) => this.onPointerUp(e));
        el.addEventListener('pointercancel', (e) => this.onPointerUp(e));
        onResize(() => this.sync());
    }

    build() {
        this.el.innerHTML = '';
        this.tiles.clear();
        for (let value = 0; value < CELLS; value++) {
            const tile = document.createElement('div');
            tile.className = value === 0 ? 'tile empty-tile' : (value % 2 === 0 ? 'tile even' : 'tile odd');
            tile.textContent = value === 0 ? '' : value;
            tile.dataset.value = value;
            this.el.appendChild(tile);
            this.tiles.set(value, tile);
        }
        this.sync();
    }

    sync() {
        this.layout = readLayout(this.el);
        this.board.forEach((value, index) => {
            const tile = this.tiles.get(value);
            tile.dataset.index = index;
            placeTile(tile, this.layout, index >> 2, index & 3);
        });
    }

    swap(i, j) {
        [this.board[i], this.board[j]] = [this.board[j], this.board[i]];
    }

    onPointerDown(e) {
        if (this.drag || e.button > 0) return;
        const tile = e.target.closest('.tile');
        if (!tile) return;
        this.layout = readLayout(this.el);
        const index = Number(tile.dataset.index);
        this.drag = {
            pointerId: e.pointerId,
            tile,
            value: Number(tile.dataset.value),
            homeRow: index >> 2,
            homeCol: index & 3,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
            over: null
        };
        this.el.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    onPointerMove(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved) {
            if (Math.abs(dx) <= TAP_SLOP && Math.abs(dy) <= TAP_SLOP) return;
            d.moved = true;
            d.tile.classList.add('dragging');
            this.clearSelection();
        }
        placeTile(d.tile, this.layout, d.homeRow, d.homeCol, dx, dy);

        // Highlight the tile under the pointer; it gets swapped on release. The
        // dragged tile is hidden from hit-testing so we can see what's beneath it.
        d.tile.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
        d.tile.style.pointerEvents = '';
        const over = under && under !== d.tile && this.el.contains(under) ? under : null;
        if (over !== d.over) {
            d.over?.classList.remove('drop-target');
            over?.classList.add('drop-target');
            d.over = over;
        }
    }

    onPointerUp(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        this.drag = null;
        d.tile.classList.remove('dragging');
        d.over?.classList.remove('drop-target');
        if (!d.moved) {
            this.tap(d.tile);
            return;
        }
        if (d.over) this.swap(this.board.indexOf(d.value), Number(d.over.dataset.index));
        this.sync();
    }

    tap(tile) {
        if (this.selected === tile) {
            this.clearSelection();
        } else if (this.selected) {
            this.swap(Number(this.selected.dataset.index), Number(tile.dataset.index));
            this.clearSelection();
            this.sync();
        } else {
            this.selected = tile;
            tile.classList.add('selected');
        }
    }

    clearSelection() {
        this.selected?.classList.remove('selected');
        this.selected = null;
    }

    getBoard() {
        return [...this.board];
    }

    setBoard(board) {
        this.board = [...board];
        this.clearSelection();
        this.sync();
    }

    // A random reachable position: walk the blank around from the solved state.
    randomize() {
        const board = [...SOLVED];
        let blank = CELLS - 1;
        let previous = -1;
        const steps = 80 + Math.floor(Math.random() * 80);
        for (let i = 0; i < steps; i++) {
            const row = blank >> 2, col = blank & 3;
            const options = [];
            if (row > 0) options.push(blank - SIZE);
            if (row < SIZE - 1) options.push(blank + SIZE);
            if (col > 0) options.push(blank - 1);
            if (col < SIZE - 1) options.push(blank + 1);
            const choices = options.filter(o => o !== previous);
            const next = choices[Math.floor(Math.random() * choices.length)];
            board[blank] = board[next];
            board[next] = 0;
            previous = blank;
            blank = next;
        }
        this.setBoard(board);
    }
}

// Read-only board that plays back solution states.
class SolutionBoard {
    constructor(el) {
        this.el = el;
        this.tiles = new Map();
        this.state = null;
        for (let value = 1; value < CELLS; value++) {
            const tile = document.createElement('div');
            tile.className = value % 2 === 0 ? 'tile even' : 'tile odd';
            tile.textContent = value;
            el.appendChild(tile);
            this.tiles.set(value, tile);
        }
        onResize(() => this.sync());
    }

    show(board) {
        this.state = board;
        this.sync();
    }

    sync() {
        if (!this.state) return;
        const layout = readLayout(this.el);
        this.state.forEach((value, index) => {
            if (value !== 0) placeTile(this.tiles.get(value), layout, index >> 2, index & 3);
        });
    }

    async animate(from, to, move, speed) {
        this.show(from);
        await wait(80 / speed);
        const tile = this.tiles.get(move.value);
        tile.classList.add('moving');
        await wait(150 / speed);
        this.show(to);
        await wait(320 / speed);
        tile.classList.remove('moving');
    }
}

class SolverPage {
    constructor() {
        applySavedColors();

        this.initialBoard = new EditableBoard(document.getElementById('initial-board'));
        this.targetBoard = new EditableBoard(document.getElementById('target-board'));
        this.solutionBoard = new SolutionBoard(document.getElementById('solution-board'));
        this.solution = null;
        this.step = 0;
        this.playing = false;
        this.speed = 1;
        this.task = null;

        const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
        on('reset-initial-btn', () => this.initialBoard.setBoard(SOLVED));
        on('randomize-initial-btn', () => this.initialBoard.randomize());
        on('reset-target-btn', () => this.targetBoard.setBoard(SOLVED));
        on('swap-boards-btn', () => {
            const a = this.initialBoard.getBoard();
            this.initialBoard.setBoard(this.targetBoard.getBoard());
            this.targetBoard.setBoard(a);
        });
        on('solve-btn', () => this.solve());
        on('first-step-btn', () => this.goTo(0));
        on('prev-step-btn', () => this.goTo(this.step - 1));
        on('next-step-btn', () => this.goTo(this.step + 1));
        on('last-step-btn', () => this.goTo(this.solution.steps.length));
        on('play-solution-btn', () => (this.playing ? this.pause() : this.play()));
        on('copy-solution-btn', () => this.copySolution());
        on('new-solve-btn', () => this.resetSolver());
        on('cancel-solve-btn', () => this.task?.cancel());

        const speedSlider = document.getElementById('speed-slider');
        const speedDisplay = document.getElementById('speed-display');
        const updateSpeed = () => {
            this.speed = parseFloat(speedSlider.value) || 1;
            speedDisplay.textContent = `${this.speed.toFixed(1)}x`;
        };
        speedSlider.addEventListener('input', updateSpeed);
        updateSpeed();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.task?.cancel();
        });

        setupColorModal();
        setupModal(document.getElementById('notification-modal'));
    }

    notify(title, message) {
        document.getElementById('notification-title').textContent = title;
        document.getElementById('notification-content').textContent = message;
        openModal(document.getElementById('notification-modal'));
    }

    async solve() {
        if (this.task) return;
        const initial = this.initialBoard.getBoard();
        const target = this.targetBoard.getBoard();

        if (initial.every((v, i) => v === target[i])) {
            this.notify('Nothing to solve', 'The two boards are already the same.');
            return;
        }
        if (!sameParity(initial, target)) {
            this.notify('Not reachable',
                'The target can\'t be reached from this start by sliding tiles. Only half of all arrangements are reachable from any given one; swapping any two numbered tiles on either board will fix it.');
            return;
        }

        this.pause();
        const loading = document.getElementById('loading-modal');
        const nodesEl = document.getElementById('solve-nodes');
        const boundEl = document.getElementById('solve-bound');
        const elapsedEl = document.getElementById('solve-elapsed');
        nodesEl.textContent = '0';
        boundEl.textContent = '–';
        elapsedEl.textContent = '0.0s';
        const startTime = Date.now();
        const ticker = setInterval(() => {
            elapsedEl.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        }, 100);

        this.task = solveAsync(initial, target, {
            timeLimit: 60000,
            onProgress: (p) => {
                nodesEl.textContent = p.nodes.toLocaleString();
                boundEl.textContent = p.bound;
            }
        });
        document.getElementById('solve-btn').disabled = true;
        openModal(loading);

        try {
            const moves = await this.task.promise;
            this.showSolution(initial, moves);
        } catch (err) {
            if (!err.cancelled) this.notify('No solution found', err.message);
        } finally {
            clearInterval(ticker);
            closeModal(loading);
            document.getElementById('solve-btn').disabled = false;
            this.task = null;
        }
    }

    showSolution(initial, moves) {
        const steps = describeMoves(moves);
        this.solution = { steps, states: applyMoves(initial, moves) };
        this.step = 0;

        const list = document.getElementById('solution-steps');
        list.innerHTML = '';
        steps.forEach((step, i) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'step-item';
            item.innerHTML = `<span class="step-number">${step.step}</span> ${step.description}`;
            item.addEventListener('click', () => this.goTo(i + 1));
            list.appendChild(item);
        });
        document.getElementById('total-steps').textContent = steps.length;

        const display = document.getElementById('solution-display');
        display.classList.remove('hidden');
        this.solutionBoard.show(this.solution.states[0]);
        this.update();
        display.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Refresh counter, description, list highlighting and button states.
    update() {
        const { steps } = this.solution;
        const total = steps.length;
        document.getElementById('current-step').textContent = this.step;

        const text = document.getElementById('move-text');
        if (this.step === 0) text.textContent = `Start position. ${total} move${total === 1 ? '' : 's'} to go.`;
        else if (this.step === total) text.textContent = 'Target reached.';
        else text.textContent = steps[this.step - 1].description;

        document.querySelectorAll('#solution-steps .step-item').forEach((item, i) => {
            item.classList.toggle('active', i === this.step - 1);
            item.classList.toggle('completed', i < this.step - 1);
            if (i === this.step - 1) item.scrollIntoView({ block: 'nearest' });
        });

        document.getElementById('first-step-btn').disabled = this.step === 0;
        document.getElementById('prev-step-btn').disabled = this.step === 0;
        document.getElementById('next-step-btn').disabled = this.step >= total;
        document.getElementById('last-step-btn').disabled = this.step >= total;
    }

    async goTo(index) {
        if (!this.solution || this.animating) return;
        const target = Math.max(0, Math.min(index, this.solution.steps.length));
        if (target === this.step) return;
        this.pause();
        await this.advance(target);
    }

    // Move to `target`, animating a single forward step and jumping otherwise.
    async advance(target) {
        const { steps, states } = this.solution;
        this.animating = true;
        if (target === this.step + 1) {
            const move = steps[target - 1];
            this.step = target;
            this.update();
            await this.solutionBoard.animate(states[target - 1], states[target], move, this.speed);
        } else {
            this.step = target;
            this.solutionBoard.show(states[target]);
            this.update();
        }
        this.animating = false;
    }

    async play() {
        if (!this.solution || this.playing) return;
        if (this.step >= this.solution.steps.length) {
            this.step = 0;
            this.solutionBoard.show(this.solution.states[0]);
            this.update();
            await wait(400 / this.speed);
        }
        this.playing = true;
        this.setPlayButton(true);
        while (this.playing && this.step < this.solution.steps.length) {
            await this.advance(this.step + 1);
            if (this.playing) await wait(120 / this.speed);
        }
        this.pause();
    }

    pause() {
        this.playing = false;
        this.setPlayButton(false);
    }

    setPlayButton(playing) {
        document.getElementById('play-solution-btn').innerHTML = playing
            ? '<i class="fas fa-pause"></i> Pause'
            : '<i class="fas fa-play"></i> Play';
    }

    copySolution() {
        if (!this.solution) return;
        const text = this.solution.steps.map(s => `${s.step}. ${s.description}`).join('\n');
        const label = document.querySelector('#copy-solution-btn span');
        navigator.clipboard?.writeText(text).then(() => {
            label.textContent = 'Copied';
            setTimeout(() => { label.textContent = 'Copy solution'; }, 1500);
        }).catch(() => this.notify('Copy failed', 'Your browser blocked clipboard access.'));
    }

    resetSolver() {
        this.pause();
        document.getElementById('solution-display').classList.add('hidden');
        this.solution = null;
        this.step = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => new SolverPage());
