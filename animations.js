// Makes tiles move smoothly and handles dragging
export class AnimationController {
    constructor(puzzle, boardElement) {
        this.puzzle = puzzle;
        this.boardElement = boardElement;
        this.tileElements = new Map();
        this.isDragging = false;
        this.draggedTiles = [];
        this.startPos = null;
        this.currentTile = null;
        
        this.setupBoard();
    }

    // Get everything ready
    setupBoard() {
        this.createAllTiles();
        this.setupDragHandlers();
        this.setupResizeHandler();
    }

    // Handle window resize events
    setupResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateFromState();
            }, 250);
        });
    }

    // Make all the tiles
    createAllTiles() {
        this.boardElement.innerHTML = '';
        this.tileElements.clear();

        const state = this.puzzle.getState();
        
        for (let row = 0; row < this.puzzle.size; row++) {
            for (let col = 0; col < this.puzzle.size; col++) {
                const value = state.board[row][col];
                
                if (value !== 0) { // Skip the empty space
                    const tile = this.createTile(value, row, col);
                    this.boardElement.appendChild(tile);
                    this.tileElements.set(`${row},${col}`, tile);
                }
            }
        }
    }

    // Make one tile
    createTile(value, row, col) {
        const tile = document.createElement('div');
        tile.className = value % 2 === 0 ? 'tile even' : 'tile odd';
        tile.textContent = value;
        tile.dataset.value = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        this.positionTile(tile, row, col);
        
        return tile;
    }

    // Position a tile at the correct spot on the board
    positionTile(tile, row, col) {
        const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
        const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
        const boardPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-padding')) || 0;
        
        // The content area starts after the CSS padding
        const contentWidth = this.boardElement.clientWidth - (2 * boardPadding);
        const contentHeight = this.boardElement.clientHeight - (2 * boardPadding);
        const expectedWidth = 4 * tileSize + 3 * gap;
        const expectedHeight = 4 * tileSize + 3 * gap;
        
        // Calculate centering offset within the content area
        const horizontalOffset = Math.max(0, (contentWidth - expectedWidth) / 2);
        const verticalOffset = Math.max(0, (contentHeight - expectedHeight) / 2);
        
        // Position relative to content area (accounting for CSS padding)
        const x = boardPadding + horizontalOffset + col * (tileSize + gap);
        const y = boardPadding + verticalOffset + row * (tileSize + gap);
        
        tile.style.position = 'absolute';
        tile.style.left = '0';
        tile.style.top = '0';
        tile.style.transform = `translate(${x}px, ${y}px)`;
        tile.dataset.row = row;
        tile.dataset.col = col;
    }

    // Set up mouse and touch event handlers
    setupDragHandlers() {
        // Prevent default touch behaviors on the board
        this.boardElement.style.touchAction = 'none';
        
        this.boardElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.boardElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.boardElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.boardElement.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Touch screen support with passive: false to allow preventDefault
        this.boardElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.boardElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.boardElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.boardElement.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    }

    // Handle mouse press on a tile
    handleMouseDown(e) {
        const tile = e.target.closest('.tile');
        if (!tile) return;

        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);

        if (!this.puzzle.canMoveTile(row, col)) return;

        this.startDrag(tile, row, col, e.clientX, e.clientY);
    }

    // Handle touch start on a tile
    handleTouchStart(e) {
        // Prevent default to stop scrolling and other touch behaviors
        e.preventDefault();
        e.stopPropagation();
        
        const tile = e.target.closest('.tile');
        if (!tile) return;

        const touch = e.touches[0];
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);

        if (!this.puzzle.canMoveTile(row, col)) return;

        this.startDrag(tile, row, col, touch.clientX, touch.clientY);
    }

    // Start dragging a tile
    startDrag(tile, row, col, clientX, clientY) {
        this.isDragging = true;
        this.currentTile = { tile, row, col };
        this.startPos = { x: clientX, y: clientY };
        
        // Find all tiles that would move together
        const movableTiles = this.puzzle.getMovableTiles(row, col);
        this.draggedTiles = movableTiles.map(t => {
            const tileElement = Array.from(this.boardElement.querySelectorAll('.tile'))
                .find(el => parseInt(el.dataset.row) === t.row && parseInt(el.dataset.col) === t.col);
            return { element: tileElement, ...t };
        });

        // Show which tiles are selected
        this.draggedTiles.forEach(t => {
            t.element.classList.add('multi-selected');
        });
    }

    // Handle mouse movement while dragging
    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.updateDrag(e.clientX, e.clientY);
    }

    // Handle touch movement while dragging
    handleTouchMove(e) {
        if (!this.isDragging) return;
        // Prevent scrolling while dragging
        e.preventDefault();
        e.stopPropagation();
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.updateDrag(touch.clientX, touch.clientY);
        }
    }

    // Update tile positions while dragging
    updateDrag(clientX, clientY) {
        const deltaX = clientX - this.startPos.x;
        const deltaY = clientY - this.startPos.y;

        const direction = this.puzzle.getMoveDirection(
            this.currentTile.row,
            this.currentTile.col
        );

        // Move the tiles in the correct direction only
        this.draggedTiles.forEach(t => {
            const baseTransform = this.getBaseTransform(
                parseInt(t.element.dataset.row),
                parseInt(t.element.dataset.col)
            );

            if (direction === 'left' || direction === 'right') {
                const constrainedDelta = direction === 'right' ? Math.max(0, deltaX) : Math.min(0, deltaX);
                t.element.style.transform = `translate(${baseTransform.x + constrainedDelta}px, ${baseTransform.y}px)`;
            } else if (direction === 'up' || direction === 'down') {
                const constrainedDelta = direction === 'down' ? Math.max(0, deltaY) : Math.min(0, deltaY);
                t.element.style.transform = `translate(${baseTransform.x}px, ${baseTransform.y + constrainedDelta}px)`;
            }
        });
    }

    // Calculate where a tile should be positioned
    getBaseTransform(row, col) {
        const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
        const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
        const boardPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-padding')) || 0;
        
        // The content area starts after the CSS padding
        const contentWidth = this.boardElement.clientWidth - (2 * boardPadding);
        const contentHeight = this.boardElement.clientHeight - (2 * boardPadding);
        const expectedWidth = 4 * tileSize + 3 * gap;
        const expectedHeight = 4 * tileSize + 3 * gap;
        
        // Calculate centering offset within the content area
        const horizontalOffset = Math.max(0, (contentWidth - expectedWidth) / 2);
        const verticalOffset = Math.max(0, (contentHeight - expectedHeight) / 2);

        return {
            x: boardPadding + horizontalOffset + col * (tileSize + gap),
            y: boardPadding + verticalOffset + row * (tileSize + gap)
        };
    }

    // Handle mouse release
    handleMouseUp(e) {
        if (!this.isDragging) return;
        this.endDrag();
    }

    // Handle touch end
    handleTouchEnd(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        this.endDrag();
    }

    // Finish dragging and decide whether to move tiles
    endDrag() {
        if (!this.isDragging) return;

        // Check if user dragged far enough to make a move
        const tile = this.currentTile.tile;
        const currentTransform = tile.style.transform;
        const match = currentTransform.match(/translate\((.+?)px,\s*(.+?)px\)/);
        
        if (match) {
            const currentX = parseFloat(match[1]);
            const currentY = parseFloat(match[2]);
            const baseTransform = this.getBaseTransform(
                this.currentTile.row,
                this.currentTile.col
            );
            
            const deltaX = Math.abs(currentX - baseTransform.x);
            const deltaY = Math.abs(currentY - baseTransform.y);
            const threshold = 30; // How far to drag to make a move

            if (deltaX > threshold || deltaY > threshold) {
                // Move the tiles - this will trigger animateMove later
                this.puzzle.moveTile(this.currentTile.row, this.currentTile.col);
            } else {
                // Snap back to original positions
                this.draggedTiles.forEach(t => {
                    this.positionTile(
                        t.element,
                        parseInt(t.element.dataset.row),
                        parseInt(t.element.dataset.col)
                    );
                });
            }
        }

        // Clean up the drag state
        this.draggedTiles.forEach(t => {
            if (t.element) {
                t.element.classList.remove('multi-selected');
            }
        });

        this.isDragging = false;
        this.draggedTiles = [];
        this.currentTile = null;
        this.startPos = null;
    }

    // Smoothly move tiles to their new positions
    animateMove(tiles, newEmptyPos) {
        const state = this.puzzle.getState();
        
        tiles.forEach(tile => {
            const tileElement = Array.from(this.boardElement.querySelectorAll('.tile'))
                .find(el => parseInt(el.dataset.value) === tile.value);
            
            if (tileElement) {
                tileElement.classList.add('animating');
                
                // Find where this tile ended up on the board
                let newRow = -1;
                let newCol = -1;
                
                for (let r = 0; r < this.puzzle.size; r++) {
                    for (let c = 0; c < this.puzzle.size; c++) {
                        if (state.board[r][c] === tile.value) {
                            newRow = r;
                            newCol = c;
                            break;
                        }
                    }
                    if (newRow !== -1) break;
                }

                if (newRow !== -1 && newCol !== -1) {
                    this.positionTile(tileElement, newRow, newCol);
                }

                // Remove animation class when done
                setTimeout(() => {
                    tileElement.classList.remove('animating');
                }, 250);
            }
        });
    }

    // Update all tile positions from the current puzzle state
    updateFromState() {
        const state = this.puzzle.getState();
        
        for (let row = 0; row < this.puzzle.size; row++) {
            for (let col = 0; col < this.puzzle.size; col++) {
                const value = state.board[row][col];
                
                if (value !== 0) {
                    const tileElement = Array.from(this.boardElement.querySelectorAll('.tile'))
                        .find(el => parseInt(el.dataset.value) === value);
                    
                    if (tileElement) {
                        this.positionTile(tileElement, row, col);
                    }
                }
            }
        }
    }

    // Start over with a fresh board (when making new puzzles)
    rebuild() {
        this.createAllTiles();
    }

    // Handle simple clicks (non-dragging)
    handleClick(tile) {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        
        if (this.puzzle.canMoveTile(row, col)) {
            this.puzzle.moveTile(row, col);
        }
    }
}