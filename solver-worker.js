// Runs the solver off the main thread. See solveAsync() in solver.js.
import { solve } from './solver.js';

self.onmessage = (e) => {
    const { initial, target, timeLimit } = e.data;
    try {
        const moves = solve(initial, target, {
            timeLimit,
            onProgress: (p) => self.postMessage({ type: 'progress', ...p })
        });
        self.postMessage({ type: 'done', moves });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};
