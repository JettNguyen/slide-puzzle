// Tile positioning shared by every board on the site. Tiles are absolutely
// positioned and moved with transforms so they can animate between cells.

export function readLayout(boardEl) {
    const style = getComputedStyle(boardEl);
    const tile = parseFloat(style.getPropertyValue('--tile-size'));
    const gap = parseFloat(style.getPropertyValue('--gap'));
    const padding = parseFloat(style.getPropertyValue('--board-padding')) || 0;
    const span = 4 * tile + 3 * gap;
    return {
        tile,
        gap,
        step: tile + gap,
        // Centre the grid if the board box is larger than the grid itself.
        originX: padding + Math.max(0, (boardEl.clientWidth - 2 * padding - span) / 2),
        originY: padding + Math.max(0, (boardEl.clientHeight - 2 * padding - span) / 2)
    };
}

export function cellPosition(layout, row, col) {
    return {
        x: layout.originX + col * layout.step,
        y: layout.originY + row * layout.step
    };
}

export function placeTile(tile, layout, row, col, dx = 0, dy = 0) {
    const { x, y } = cellPosition(layout, row, col);
    tile.style.transform = `translate(${x + dx}px, ${y + dy}px)`;
}

// Debounced window resize hook.
export function onResize(fn, delay = 150) {
    let timer;
    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    });
}
