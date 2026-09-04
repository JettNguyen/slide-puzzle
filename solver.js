// 15-puzzle solver.
//
// Iterative-deepening A* with Manhattan distance + linear conflict. Both parts of
// the heuristic are updated incrementally as the search swaps tiles in place, so
// the inner loop does very little work per node. Memory use is constant.
//
// Boards are flat arrays of 16 numbers in row-major order, 0 for the blank.

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const SOLVED = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);

const FOUND = -1;

// Neighbours of each cell, flattened: NEIGHBOR[i * 4 + k] for k < NEIGHBOR_COUNT[i].
const NEIGHBOR = new Int8Array(CELLS * 4);
const NEIGHBOR_COUNT = new Int8Array(CELLS);
for (let i = 0; i < CELLS; i++) {
    const r = i >> 2, c = i & 3;
    let n = 0;
    if (r > 0) NEIGHBOR[i * 4 + n++] = i - 4;
    if (r < 3) NEIGHBOR[i * 4 + n++] = i + 4;
    if (c > 0) NEIGHBOR[i * 4 + n++] = i - 1;
    if (c < 3) NEIGHBOR[i * 4 + n++] = i + 1;
    NEIGHBOR_COUNT[i] = n;
}

// Parity invariant: (inversions + blank row) mod 2 never changes when sliding tiles.
function parity(board) {
    let inversions = 0;
    let blankRow = 0;
    for (let i = 0; i < CELLS; i++) {
        const a = board[i];
        if (a === 0) { blankRow = i >> 2; continue; }
        for (let j = i + 1; j < CELLS; j++) {
            const b = board[j];
            if (b !== 0 && b < a) inversions++;
        }
    }
    return (inversions + blankRow) & 1;
}

export function isValidBoard(board) {
    if (!Array.isArray(board) || board.length !== CELLS) return false;
    const seen = new Set(board);
    for (let i = 0; i < CELLS; i++) if (!seen.has(i)) return false;
    return true;
}

// Can `target` be reached from `start` by sliding tiles?
export function sameParity(start, target) {
    return parity(start) === parity(target);
}

// Can this board be slid into the standard solved arrangement?
export function isSolvable(board) {
    return sameParity(board, SOLVED);
}

// Solve synchronously. Returns a list of moves; throws if the puzzle is unreachable
// or the time limit runs out. `onProgress` is called every ~200ms with
// { nodes, bound, elapsed }.
export function solve(initial, target, { onProgress, timeLimit = 60000 } = {}) {
    if (!isValidBoard(initial) || !isValidBoard(target)) {
        throw new Error('Boards must each contain the numbers 0 to 15 exactly once.');
    }
    if (!sameParity(initial, target)) {
        throw new Error('The target arrangement cannot be reached from the starting one.');
    }

    const board = Uint8Array.from(initial);
    const goalRow = new Int8Array(CELLS);
    const goalCol = new Int8Array(CELLS);
    for (let i = 0; i < CELLS; i++) {
        goalRow[target[i]] = i >> 2;
        goalCol[target[i]] = i & 3;
    }

    const manhattan = (v, i) => Math.abs((i >> 2) - goalRow[v]) + Math.abs((i & 3) - goalCol[v]);

    // Linear conflict for one row or column: the fewest tiles that would have to
    // leave the line so the tiles that belong in it are in the right order.
    const seq = new Int8Array(SIZE);
    const lis = new Int8Array(SIZE);
    function lineConflicts(isRow, k) {
        let count = 0;
        for (let j = 0; j < SIZE; j++) {
            const v = board[isRow ? k * SIZE + j : j * SIZE + k];
            if (v === 0) continue;
            if (isRow ? goalRow[v] === k : goalCol[v] === k) {
                seq[count++] = isRow ? goalCol[v] : goalRow[v];
            }
        }
        if (count < 2) return 0;
        let best = 1;
        for (let a = 0; a < count; a++) {
            lis[a] = 1;
            for (let b = 0; b < a; b++) {
                if (seq[b] < seq[a] && lis[b] + 1 > lis[a]) lis[a] = lis[b] + 1;
            }
            if (lis[a] > best) best = lis[a];
        }
        return count - best;
    }

    let h = 0;
    for (let i = 0; i < CELLS; i++) if (board[i] !== 0) h += manhattan(board[i], i);
    const rowLC = new Int8Array(SIZE);
    const colLC = new Int8Array(SIZE);
    let lc = 0;
    for (let k = 0; k < SIZE; k++) {
        rowLC[k] = lineConflicts(true, k);
        colLC[k] = lineConflicts(false, k);
        lc += rowLC[k] + colLC[k];
    }

    const path = [];
    const startTime = Date.now();
    let lastReport = startTime;
    let nodes = 0;
    let bound = h + 2 * lc;

    function checkProgress() {
        const now = Date.now();
        if (now - startTime > timeLimit) {
            throw new Error(`Gave up after ${Math.round(timeLimit / 1000)} seconds. This arrangement is unusually far from the target.`);
        }
        if (onProgress && now - lastReport >= 200) {
            lastReport = now;
            onProgress({ nodes, bound, elapsed: now - startTime });
        }
    }

    function search(g, blank, lastBlank) {
        const f = g + h + 2 * lc;
        if (f > bound) return f;
        if (h === 0) return FOUND;
        if ((++nodes & 0xffff) === 0) checkProgress();

        let min = Infinity;
        const count = NEIGHBOR_COUNT[blank];
        for (let k = 0; k < count; k++) {
            const n = NEIGHBOR[blank * 4 + k];
            if (n === lastBlank) continue;

            const v = board[n];
            const dh = manhattan(v, blank) - manhattan(v, n);
            board[blank] = v;
            board[n] = 0;

            // A horizontal slide changes which tiles sit in two columns; a vertical
            // one changes two rows. The line the tile moved along keeps its order.
            let dlc, a, b, oldA, oldB;
            if ((blank >> 2) === (n >> 2)) {
                a = blank & 3; b = n & 3;
                oldA = colLC[a]; oldB = colLC[b];
                colLC[a] = lineConflicts(false, a);
                colLC[b] = lineConflicts(false, b);
                dlc = colLC[a] + colLC[b] - oldA - oldB;
            } else {
                a = blank >> 2; b = n >> 2;
                oldA = rowLC[a]; oldB = rowLC[b];
                rowLC[a] = lineConflicts(true, a);
                rowLC[b] = lineConflicts(true, b);
                dlc = rowLC[a] + rowLC[b] - oldA - oldB;
            }

            h += dh;
            lc += dlc;
            path.push(n);

            const t = search(g + 1, n, blank);
            if (t === FOUND) return FOUND;
            if (t < min) min = t;

            path.pop();
            h -= dh;
            lc -= dlc;
            if ((blank >> 2) === (n >> 2)) { colLC[a] = oldA; colLC[b] = oldB; }
            else { rowLC[a] = oldA; rowLC[b] = oldB; }
            board[n] = v;
            board[blank] = 0;
        }
        return min;
    }

    const blank = initial.indexOf(0);
    for (;;) {
        const t = search(0, blank, -1);
        if (t === FOUND) break;
        if (t === Infinity) throw new Error('No solution exists.');
        bound = t;
        checkProgress();
    }

    return movesFromPath(initial, path);
}

// Turn a list of blank positions into move records the UI can show.
function movesFromPath(initial, path) {
    const board = initial.slice();
    let blank = board.indexOf(0);
    return path.map(n => {
        const value = board[n];
        const from = { row: n >> 2, col: n & 3 };
        const to = { row: blank >> 2, col: blank & 3 };
        let direction;
        if (n === blank - 4) direction = 'down';
        else if (n === blank + 4) direction = 'up';
        else if (n === blank - 1) direction = 'right';
        else direction = 'left';
        board[blank] = value;
        board[n] = 0;
        blank = n;
        return { value, from, to, direction };
    });
}

const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

// Human-readable step list.
export function describeMoves(moves) {
    return moves.map((move, index) => ({
        step: index + 1,
        ...move,
        description: `Move ${move.value} ${move.direction} ${ARROWS[move.direction]}`
    }));
}

// Every board along the solution, starting with the initial one.
export function applyMoves(initial, moves) {
    const states = [initial.slice()];
    let board = initial.slice();
    for (const move of moves) {
        board = board.slice();
        board[move.to.row * SIZE + move.to.col] = move.value;
        board[move.from.row * SIZE + move.from.col] = 0;
        states.push(board);
    }
    return states;
}

// Solve on a background thread so the page stays responsive. Returns
// { promise, cancel }. Falls back to solving inline if workers are unavailable.
export function solveAsync(initial, target, { onProgress, timeLimit = 60000 } = {}) {
    let worker = null;
    let settled = false;
    let rejectPromise;

    const promise = new Promise((resolve, reject) => {
        rejectPromise = reject;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            if (worker) worker.terminate();
            worker = null;
            fn(value);
        };
        const runInline = () => {
            setTimeout(() => {
                try { finish(resolve, solve(initial, target, { onProgress, timeLimit })); }
                catch (err) { finish(reject, err); }
            }, 30);
        };

        try {
            worker = new Worker(new URL('./solver-worker.js', import.meta.url), { type: 'module' });
        } catch {
            runInline();
            return;
        }

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') onProgress?.(msg);
            else if (msg.type === 'done') finish(resolve, msg.moves);
            else if (msg.type === 'error') finish(reject, new Error(msg.message));
        };
        worker.onerror = () => {
            // Module workers unsupported in this browser: solve on the main thread.
            if (worker) worker.terminate();
            worker = null;
            runInline();
        };
        worker.postMessage({ initial: Array.from(initial), target: Array.from(target), timeLimit });
    });

    return {
        promise,
        cancel() {
            if (settled) return;
            settled = true;
            if (worker) worker.terminate();
            worker = null;
            const err = new Error('cancelled');
            err.cancelled = true;
            rejectPromise(err);
        }
    };
}
