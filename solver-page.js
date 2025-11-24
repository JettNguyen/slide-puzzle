// Solver page where you can set up puzzles and solve them
import { Puzzle } from './puzzle.js';
import { PuzzleSolver } from './solver.js';

// A board you can click and drag to set up your puzzle
class EditableBoard {
    constructor(boardElement, initialState = null) {
        this.boardElement = boardElement;
        this.size = 4;
        this.board = initialState || this.createSolvedBoard();
        this.selectedTile = null;
        this.draggedElement = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        
        this.setupBoard();
    }

    // Make a solved board
    createSolvedBoard() {
        const board = [];
        for (let i = 1; i < this.size * this.size; i++) {
            board.push(i);
        }
        board.push(0); // Empty space
        return board;
    }

    // Set up the board and click handlers
    setupBoard() {
        // Ensure touch-action is set on the board element
        this.boardElement.style.touchAction = 'none';
        this.boardElement.style.webkitUserSelect = 'none';
        this.boardElement.style.userSelect = 'none';
        
        this.attachListeners();
        this.setupResizeHandler();
        this.render();
    }

    // Handle window resize events
    setupResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.render();
            }, 250);
        });
    }

    render() {
        this.boardElement.innerHTML = '';
        
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                const value = this.board[index];
                
                const tile = document.createElement('div');
                tile.className = value === 0 ? 'tile empty-tile' : (value % 2 === 0 ? 'tile even' : 'tile odd');
                tile.textContent = value === 0 ? '' : value;
                tile.dataset.index = index;
                tile.dataset.value = value;
                
                const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
                const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
                const boardPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-padding')) || 0;
                
                // Calculate centering offset within the board
                const contentWidth = this.boardElement.clientWidth - (2 * boardPadding);
                const contentHeight = this.boardElement.clientHeight - (2 * boardPadding);
                const expectedWidth = 4 * tileSize + 3 * gap;
                const expectedHeight = 4 * tileSize + 3 * gap;
                const horizontalOffset = Math.max(0, (contentWidth - expectedWidth) / 2);
                const verticalOffset = Math.max(0, (contentHeight - expectedHeight) / 2);
                
                const x = boardPadding + horizontalOffset + j * (tileSize + gap);
                const y = boardPadding + verticalOffset + i * (tileSize + gap);
                
                tile.style.position = 'absolute';
                tile.style.left = '0';
                tile.style.top = '0';
                tile.style.transform = `translate(${x}px, ${y}px)`;
                // Let CSS handle width, height, and font-size via variables
                
                this.boardElement.appendChild(tile);
                
                this.boardElement.appendChild(tile);
            }
        }
    }

    attachListeners() {
        // Mouse down handler
        this.boardElement.addEventListener('mousedown', (e) => {
            const tile = e.target.closest('.tile');
            if (!tile) return;
            
            this.draggedElement = tile;
            this.draggedIndex = parseInt(tile.dataset.index);
            this.isDragging = false;
            this.startX = e.clientX;
            this.startY = e.clientY;
            
            // Store initial transform
            this.initialTransform = tile.style.transform || '';
            
            tile.style.cursor = 'grabbing';
            tile.style.zIndex = '1000';
            
            e.preventDefault();
        });

        // Touch start handler
        this.boardElement.addEventListener('touchstart', (e) => {
            console.log('Touch start detected', e.target);
            const tile = e.target.closest('.tile');
            if (!tile) {
                console.log('No tile found');
                return;
            }
            
            console.log('Tile found, starting drag', tile.dataset.value);
            // Only prevent default if we have a valid tile
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            
            this.draggedElement = tile;
            this.draggedIndex = parseInt(tile.dataset.index);
            this.isDragging = false;
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            
            // Store initial transform
            this.initialTransform = tile.style.transform || '';
            
            tile.style.zIndex = '1000';
            tile.style.opacity = '0.8';
        }, { passive: false });

        // Common drag handler for both mouse and touch
        const handleDragMove = (clientX, clientY) => {
            if (!this.draggedElement) return;
            
            const deltaX = clientX - this.startX;
            const deltaY = clientY - this.startY;
            
            // Start dragging if moved more than 5px
            if (!this.isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
                this.isDragging = true;
                this.draggedElement.style.opacity = '0.8';
                this.draggedElement.style.transition = 'none';
                this.lastHoveredTile = null;
            }
            
            if (this.isDragging) {
                // Extract current position from transform
                const match = this.initialTransform.match(/translate\((.+?)px,\s*(.+?)px\)/);
                let baseX = 0;
                let baseY = 0;
                
                if (match) {
                    baseX = parseFloat(match[1]);
                    baseY = parseFloat(match[2]);
                }
                
                const currentX = baseX + deltaX;
                const currentY = baseY + deltaY;
                
                // Apply transform to follow mouse/touch
                this.draggedElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
                
                // Check what's under the dragged tile
                this.draggedElement.style.pointerEvents = 'none';
                const elementUnderMouse = document.elementFromPoint(clientX, clientY);
                this.draggedElement.style.pointerEvents = '';
                
                const targetTile = elementUnderMouse?.closest('.tile');
                
                // Clear previous highlights
                const tiles = this.boardElement.querySelectorAll('.tile');
                tiles.forEach(t => {
                    if (t !== this.draggedElement && t !== targetTile) {
                        t.style.outline = '';
                    }
                });
                
                // Real-time swap preview
                if (targetTile && targetTile !== this.draggedElement && this.boardElement.contains(targetTile)) {
                    targetTile.style.outline = '3px solid rgba(255, 215, 0, 0.6)';
                    
                    // If hovering over a new tile, perform live swap
                    if (this.lastHoveredTile !== targetTile) {
                        this.lastHoveredTile = targetTile;
                        
                        const targetIndex = parseInt(targetTile.dataset.index);
                        
                        // Swap in the data array
                        const temp = this.board[this.draggedIndex];
                        this.board[this.draggedIndex] = this.board[targetIndex];
                        this.board[targetIndex] = temp;
                        
                        // Update the dragged index to follow the swap
                        this.draggedIndex = targetIndex;
                        
                        // Animate the target tile to the old position
                        const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
                        const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
                        const boardPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-padding')) || 0;
                        
                        // Calculate centering offset within the board
                        const contentWidth = this.boardElement.clientWidth - (2 * boardPadding);
                        const contentHeight = this.boardElement.clientHeight - (2 * boardPadding);
                        const expectedWidth = 4 * tileSize + 3 * gap;
                        const expectedHeight = 4 * tileSize + 3 * gap;
                        const horizontalOffset = Math.max(0, (contentWidth - expectedWidth) / 2);
                        const verticalOffset = Math.max(0, (contentHeight - expectedHeight) / 2);
                        
                        // Calculate positions from indices
                        const oldRow = Math.floor(targetIndex / this.size);
                        const oldCol = targetIndex % this.size;
                        const newRow = Math.floor(parseInt(targetTile.dataset.index) / this.size);
                        const newCol = parseInt(targetTile.dataset.index) % this.size;
                        
                        // Re-render all tiles except the dragged one
                        const tiles = Array.from(this.boardElement.querySelectorAll('.tile'));
                        tiles.forEach(tile => {
                            if (tile === this.draggedElement) return;
                            
                            const index = this.board.findIndex(val => val === parseInt(tile.dataset.value));
                            if (index === -1) return;
                            
                            const row = Math.floor(index / this.size);
                            const col = index % this.size;
                            const x = boardPadding + horizontalOffset + col * (tileSize + gap);
                            const y = boardPadding + verticalOffset + row * (tileSize + gap);
                            
                            tile.dataset.index = index;
                            tile.style.transition = 'transform 0.2s ease-out';
                            tile.style.transform = `translate(${x}px, ${y}px)`;
                        });
                    }
                } else {
                    this.lastHoveredTile = null;
                }
            }
        };

        // Mouse move handler
        document.addEventListener('mousemove', (e) => {
            handleDragMove(e.clientX, e.clientY);
        });

        // Touch move handler
        document.addEventListener('touchmove', (e) => {
            if (!this.draggedElement) return;
            console.log('Touch move');
            e.preventDefault();
            e.stopPropagation();
            
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleDragMove(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        const handleMouseUp = (e) => {
            if (!this.draggedElement) return;
            
            // Clear styles
            if (this.draggedElement) {
                this.draggedElement.style.cursor = 'pointer';
                this.draggedElement.style.opacity = '1';
                this.draggedElement.style.zIndex = '';
                this.draggedElement.style.transition = '';
            }
            
            // Clear all outlines
            const tiles = this.boardElement.querySelectorAll('.tile');
            tiles.forEach(t => {
                t.style.outline = '';
                t.style.transition = '';
            });
            
            // Re-render to finalize positions
            this.render();
            
            this.draggedElement = null;
            this.draggedIndex = null;
            this.isDragging = false;
            this.lastHoveredTile = null;
        };
        
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', (e) => {
            if (!this.draggedElement) return;
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp(e);
        }, { passive: false });
        document.addEventListener('touchcancel', (e) => {
            if (!this.draggedElement) return;
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp(e);
        }, { passive: false });

        // Also keep click support just in case
        this.boardElement.addEventListener('click', (e) => {
            const tile = e.target.closest('.tile');
            if (!tile) return;

            const index = parseInt(tile.dataset.index);
            
            if (this.selectedTile === null) {
                // First selection
                this.selectedTile = index;
                tile.classList.add('selected-tile');
            } else {
                // Second selection - swap values
                const temp = this.board[this.selectedTile];
                this.board[this.selectedTile] = this.board[index];
                this.board[index] = temp;
                
                this.selectedTile = null;
                this.render();
            }
        });
    }

    getBoard() {
        return [...this.board];
    }

    setBoard(board) {
        this.board = [...board];
        this.selectedTile = null;
        this.render();
    }

    randomize() {
        // Start with solved board and perform random valid moves
        // This makes sure the puzzle can be solved
        const board = this.createSolvedBoard();
        const moves = 50 + Math.floor(Math.random() * 100); // 50-150 random moves
        
        let emptyIndex = board.length - 1; // Empty starts at bottom-right
        
        for (let i = 0; i < moves; i++) {
            // Get valid moves for empty space
            const emptyRow = Math.floor(emptyIndex / this.size);
            const emptyCol = emptyIndex % this.size;
            const possibleMoves = [];
            
            // Check all 4 directions
            if (emptyRow > 0) possibleMoves.push(emptyIndex - this.size); // Up
            if (emptyRow < this.size - 1) possibleMoves.push(emptyIndex + this.size); // Down
            if (emptyCol > 0) possibleMoves.push(emptyIndex - 1); // Left
            if (emptyCol < this.size - 1) possibleMoves.push(emptyIndex + 1); // Right
            
            // Pick random valid move
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            
            // Swap empty space with chosen tile
            board[emptyIndex] = board[randomMove];
            board[randomMove] = 0;
            emptyIndex = randomMove;
        }
        
        this.setBoard(board);
    }

    reset() {
        this.setBoard(this.createSolvedBoard());
    }
}

class SolutionVisualizer {
    constructor(boardElement, parent = null) {
        this.boardElement = boardElement;
        this.parent = parent;
        this.size = 4;
        this.currentState = null;
        this.isAnimating = false;
        this.setupResizeHandler();
    }

    // Handle window resize events
    setupResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.currentState) {
                    this.render();
                }
            }, 250);
        });
    }

    displayState(board) {
        this.currentState = board;
        this.render();
        
        // Make sure all tiles can animate smoothly
        const tiles = this.boardElement.querySelectorAll('.tile');
        tiles.forEach(tile => {
            if (!tile.style.transition) {
                tile.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
        });
    }
    
    async animateStep(fromState, toState, move) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // First show the from state without clearing transitions
        this.currentState = fromState;
        this.render();
        
        // Wait a moment so the starting state shows up
        await new Promise(resolve => setTimeout(resolve, 100 / (this.parent?.speedMultiplier || 1)));
        
        // Find and highlight the moving tile
        const movingTileValue = move.value;
        const tiles = this.boardElement.querySelectorAll('.tile');
        let movingTileElement = null;
        
        tiles.forEach(tile => {
            if (parseInt(tile.textContent) === movingTileValue) {
                movingTileElement = tile;
                tile.style.boxShadow = '0 0 20px var(--accent-red), 0 0 40px var(--accent-red)';
                tile.style.zIndex = '1000';
                // Add subtle scale without disrupting position
                const currentTransform = tile.style.transform || '';
                if (!currentTransform.includes('scale')) {
                    tile.style.transform = currentTransform + ' scale(1.05)';
                }
            }
        });
        
        // Highlight delay
        await new Promise(resolve => setTimeout(resolve, 200 / (this.parent?.speedMultiplier || 1)));
        
        // Now smoothly transition to the new state
        this.currentState = toState;
        this.render();
        
        // Wait for the move to finish
        await new Promise(resolve => setTimeout(resolve, 350 / (this.parent?.speedMultiplier || 1)));
        
        // Clean up the moving tile effects
        if (movingTileElement) {
            movingTileElement.style.boxShadow = '';
            movingTileElement.style.zIndex = '';
            // Remove scale while preserving position
            const transform = movingTileElement.style.transform;
            movingTileElement.style.transform = transform.replace(/scale\([^)]*\)\s*/g, '');
        }
        
        this.isAnimating = false;
    }

    render() {
        if (!this.currentState) return;
        
        // Get all tile positions from current state
        const positions = new Map();
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                const value = this.currentState[index];
                if (value !== 0) {
                    positions.set(value, { row: i, col: j });
                }
            }
        }
        
        // Get existing tiles
        const existingTiles = Array.from(this.boardElement.querySelectorAll('.tile'));
        const tileMap = new Map();
        
        existingTiles.forEach(tile => {
            const value = parseInt(tile.textContent);
            tileMap.set(value, tile);
        });
        
        // Update existing tiles and create new ones if needed
        const usedTiles = new Set();
        
        for (const [value, pos] of positions) {
            let tile = tileMap.get(value);
            
            if (!tile) {
                // Create new tile
                tile = document.createElement('div');
                tile.className = value % 2 === 0 ? 'tile even' : 'tile odd';
                tile.textContent = value;
                tile.style.position = 'absolute';
                tile.style.left = '0';
                tile.style.top = '0';
                tile.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                this.boardElement.appendChild(tile);
            }
            
            usedTiles.add(value);
            
            const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
            const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
            const boardPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-padding')) || 0;
            
            const contentWidth = this.boardElement.clientWidth - (2 * boardPadding);
            const contentHeight = this.boardElement.clientHeight - (2 * boardPadding);
            const expectedWidth = 4 * tileSize + 3 * gap;
            const expectedHeight = 4 * tileSize + 3 * gap;
            const horizontalOffset = Math.max(0, (contentWidth - expectedWidth) / 2);
            const verticalOffset = Math.max(0, (contentHeight - expectedHeight) / 2);
            
            const x = boardPadding + horizontalOffset + pos.col * (tileSize + gap);
            const y = boardPadding + verticalOffset + pos.row * (tileSize + gap);
            
            // Update position smoothly
            tile.style.transform = `translate(${x}px, ${y}px)`;
        }
        
        // Remove tiles that are no longer needed
        existingTiles.forEach(tile => {
            const value = parseInt(tile.textContent);
            if (!usedTiles.has(value)) {
                tile.remove();
            }
        });
    }
}

class SolverPageController {
    constructor() {
        this.initialBoard = null;
        this.targetBoard = null;
        this.solutionVisualizer = null;
        this.solver = new PuzzleSolver(4);
        this.currentSolution = null;
        this.currentStepIndex = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.speedMultiplier = 1.0; // Start with normal speed
        
        this.setup();
    }

    setup() {
        // Set up the puzzle boards
        this.initialBoard = new EditableBoard(document.getElementById('initial-board'));
        this.targetBoard = new EditableBoard(document.getElementById('target-board'));
        this.solutionVisualizer = new SolutionVisualizer(document.getElementById('solution-board'), this);
        
        // Set up the colors
        this.setupTheme();
        
        // Attach event listeners
        this.attachEventListeners();
    }

    setupTheme() {
        // Load saved custom colors
        this.loadCustomColors();
        
        // Set up color customization modal
        this.setupColorCustomization();
    }

    showNotification(title, message) {
        const modal = document.getElementById('notification-modal');
        const titleEl = document.getElementById('notification-title');
        const contentEl = document.getElementById('notification-content');
        
        titleEl.textContent = title;
        contentEl.textContent = message;
        modal.style.display = 'flex'; // Use flex for centering
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        document.getElementById('close-notification').onclick = closeModal;
        document.getElementById('notification-ok').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
    
    // Helper to make colors lighter or darker
    adjustBrightness(hex, percent) {
        // Handle short hex codes
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        
        return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    // Load saved colors into color picker inputs
    loadColorInputs(colors) {
        const mapping = {
            bg: 'bg-color',
            boardBg: 'board-bg-color',
            oddTile: 'odd-color',
            evenTile: 'even-color', 
            text: 'text-color'
        };

        Object.entries(mapping).forEach(([colorKey, inputId]) => {
            if (colors[colorKey]) {
                const input = document.getElementById(inputId);
                if (input) input.value = colors[colorKey];
            }
        });
    }
    
    loadCustomColors() {
        const savedColors = localStorage.getItem('userColors'); // Use same key as main page
        if (savedColors) {
            try {
                const colors = JSON.parse(savedColors);
                this.applyColors(colors);
                this.loadColorInputs(colors);
            } catch (error) {
                console.log('Using default colors');
            }
        }
    }
    
    applyColors(colors) {
        const root = document.documentElement;
        
        if (colors.bg) {
            // Create a gradient that's mostly the user's color with subtle variations
            const lightVariation = this.adjustBrightness(colors.bg, 15);
            const darkVariation = this.adjustBrightness(colors.bg, -10);
            
            root.style.setProperty('--bg-dark', colors.bg);
            root.style.setProperty('--bg-medium', colors.bg);
            root.style.setProperty('--bg-light', lightVariation);
            
            // Create a subtle gradient that's mostly the user's chosen color
            const gradientCSS = `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 60%, ${lightVariation} 85%, ${darkVariation} 100%)`;
            document.body.style.background = gradientCSS;
        }
        
        if (colors.boardBg) {
            // Apply board background color
            const boardLightVariation = this.adjustBrightness(colors.boardBg, 20);
            root.style.setProperty('--board-bg-dark', colors.boardBg);
            root.style.setProperty('--board-bg-light', boardLightVariation);
        }

        if (colors.oddTile) {
            root.style.setProperty('--accent-red', colors.oddTile);
            root.style.setProperty('--accent-red-light', this.adjustBrightness(colors.oddTile, 20));
        }

        if (colors.evenTile) {
            root.style.setProperty('--accent-off-white', colors.evenTile);
            root.style.setProperty('--accent-off-white-dark', this.adjustBrightness(colors.evenTile, -20));
        }

        if (colors.text) {
            root.style.setProperty('--text-primary', colors.text);
            root.style.setProperty('--text-secondary', this.adjustBrightness(colors.text, -20));
        }
    }

    // Helper to make colors lighter or darker
    adjustBrightness(hex, percent) {
        // Handle short hex codes
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        
        return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    // Load saved colors into color picker inputs
    loadColorInputs(colors) {
        const mapping = {
            bg: 'bg-color',
            boardBg: 'board-bg-color',
            oddTile: 'odd-color',
            evenTile: 'even-color', 
            text: 'text-color'
        };

        Object.entries(mapping).forEach(([colorKey, inputId]) => {
            if (colors[colorKey]) {
                const input = document.getElementById(inputId);
                if (input) input.value = colors[colorKey];
            }
        });
    }

    setupColorCustomization() {
        const modal = document.getElementById('color-modal');
        const openBtn = document.getElementById('customize-colors-btn');
        const closeBtn = document.getElementById('close-modal-btn');
        const saveBtn = document.getElementById('save-colors-btn');
        const resetBtn = document.getElementById('reset-colors-btn');
        
        if (!modal || !openBtn) {
            console.error('Color modal elements not found!');
            return;
        }
        
        // Open modal
        openBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            // Load current colors into the picker
            const savedColors = localStorage.getItem('userColors');
            if (savedColors) {
                const colors = JSON.parse(savedColors);
                this.loadColorInputs(colors);
            }
        });
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
        
        // Save colors
        saveBtn.addEventListener('click', () => {
            this.saveCustomColors();
            modal.classList.add('hidden');
        });
        
        // Reset colors
        resetBtn.addEventListener('click', () => {
            this.resetToDefaultColors();
        });
        
        // Live preview
        const colorPickers = modal.querySelectorAll('.color-picker');
        colorPickers.forEach(picker => {
            picker.addEventListener('input', () => {
                this.updateLivePreview();
            });
        });
    }
    
    updateLivePreview() {
        const colors = {
            bgColor: document.getElementById('bg-color').value,
            oddColor: document.getElementById('odd-color').value,
            evenColor: document.getElementById('even-color').value,
            textColor: document.getElementById('text-color').value
        };
        this.applyColors(colors);
    }
    
    saveCustomColors() {
        const colors = {
            bg: document.getElementById('bg-color').value,
            boardBg: document.getElementById('board-bg-color').value,
            oddTile: document.getElementById('odd-color').value,
            evenTile: document.getElementById('even-color').value,
            text: document.getElementById('text-color').value
        };
        localStorage.setItem('userColors', JSON.stringify(colors)); // Use same key as main page
        this.applyColors(colors);
    }
    
    resetToDefaultColors() {
        const defaultColors = this.getDefaultColors();
        localStorage.setItem('userColors', JSON.stringify(defaultColors));
        this.applyColors(defaultColors);
        this.loadColorInputs(defaultColors);
    }
    
    getDefaultColors() {
        return {
            bg: '#1a1a2e',
            boardBg: '#0a1128',
            oddTile: '#dc143c',
            evenTile: '#f8f9fa',
            text: '#f8f9fa'
        };
    }

    attachEventListeners() {
        // Board controls
        document.getElementById('reset-initial-btn').addEventListener('click', () => {
            this.initialBoard.reset();
        });

        document.getElementById('randomize-initial-btn').addEventListener('click', () => {
            this.initialBoard.randomize();
        });

        document.getElementById('reset-target-btn').addEventListener('click', () => {
            this.targetBoard.reset();
        });

        document.getElementById('swap-boards-btn').addEventListener('click', () => {
            const temp = this.initialBoard.getBoard();
            this.initialBoard.setBoard(this.targetBoard.getBoard());
            this.targetBoard.setBoard(temp);
        });

        // Solve button
        document.getElementById('solve-btn').addEventListener('click', () => {
            this.handleSolve();
        });

        // Solution navigation
        document.getElementById('first-step-btn').addEventListener('click', () => this.goToStep(0));
        document.getElementById('prev-step-btn').addEventListener('click', () => this.previousStep());
        document.getElementById('play-solution-btn').addEventListener('click', () => this.togglePlay());
        
        // Speed control
        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) {
            // Set initial speed multiplier from slider value
            this.speedMultiplier = parseFloat(speedSlider.value) || 1.0;
            document.getElementById('speed-display').textContent = `${this.speedMultiplier.toFixed(1)}x`;
            
            speedSlider.addEventListener('input', (e) => {
                this.speedMultiplier = parseFloat(e.target.value) || 1.0;
                document.getElementById('speed-display').textContent = `${this.speedMultiplier.toFixed(1)}x`;
            });
        }
        document.getElementById('next-step-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('last-step-btn').addEventListener('click', () => this.goToLastStep());

        // Export controls
        document.getElementById('copy-solution-btn').addEventListener('click', () => this.copySolution());
        document.getElementById('new-solve-btn').addEventListener('click', () => this.resetSolver());


    }

    validateBoard(board) {
        const values = new Set(board);
        if (values.size !== 16) return false;
        for (let i = 0; i < 16; i++) {
            if (!values.has(i)) return false;
        }
        return true;
    }

    async handleSolve() {
        const initialState = this.initialBoard.getBoard();
        const targetState = this.targetBoard.getBoard();

        // Validate boards
        if (!this.validateBoard(initialState)) {
            this.showNotification('Invalid Board', 'Invalid initial board! Make sure all numbers 0-15 are used exactly once.');
            return;
        }

        if (!this.validateBoard(targetState)) {
            this.showNotification('Invalid Board', 'Invalid target board! Make sure all numbers 0-15 are used exactly once.');
            return;
        }

        // Check solvability
        if (!this.solver.isSolvable(initialState)) {
            this.showNotification('Unsolvable Puzzle', 'The initial board configuration is not solvable!');
            return;
        }

        if (!this.solver.isSolvable(targetState)) {
            this.showNotification('Unsolvable Puzzle', 'The target board configuration is not solvable!');
            return;
        }

        // Show loading modal and disable solve button
        const solveBtn = document.getElementById('solve-btn');
        const originalText = solveBtn.innerHTML;
        solveBtn.disabled = true;
        
        this.showLoadingModal();
        
        try {
            const startTime = Date.now();
            
            const moves = await this.solver.solve(initialState, targetState, (progress) => {
                this.updateLoadingProgress(progress, startTime);
            });
            
            const steps = this.solver.getSolutionSteps(moves);
            
            this.currentSolution = {
                steps,
                states: this.solver.applyMoves(initialState, steps.map(s => ({
                    value: s.tile,
                    from: s.from,
                    to: s.to,
                    direction: s.direction
                })))
            };

            this.hideLoadingModal();
            this.displaySolution();
        } catch (error) {
            this.hideLoadingModal();
            this.showNotification('Solver Error', `Oops! ${error.message}`);
        } finally {
            solveBtn.innerHTML = originalText;
            solveBtn.disabled = false;
        }
    }

    // Show loading modal with animated spinner
    showLoadingModal() {
        const modal = document.getElementById('loading-modal');
        modal.style.display = 'flex';
        
        // Reset progress indicators
        this.updateLoadingProgress({
            percentage: 0,
            nodesExplored: 0,
            currentDepth: 0,
            phase: 'Initializing solver...'
        }, Date.now());
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    }

    // Hide loading modal
    hideLoadingModal() {
        const modal = document.getElementById('loading-modal');
        modal.style.display = 'none';
        
        // Restore background scrolling
        document.body.style.overflow = 'auto';
    }

    // Update loading progress with real-time data
    updateLoadingProgress(progress, startTime) {
        const percentage = Math.min(100, Math.max(0, progress.percentage || 0));
        const nodesExplored = progress.nodesExplored || 0;
        const currentDepth = progress.currentDepth || 0;
        const phase = progress.phase || 'Solving...';
        
        // Update progress bar
        const progressFill = document.getElementById('solve-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Update percentage display
        const percentageElement = document.getElementById('progress-percentage');
        if (percentageElement) {
            percentageElement.textContent = `${percentage.toFixed(1)}%`;
        }
        
        // Update progress details
        const detailsElement = document.getElementById('progress-details');
        if (detailsElement) {
            detailsElement.textContent = phase;
        }
        
        // Update solving stats
        const nodesElement = document.getElementById('nodes-explored');
        if (nodesElement) {
            nodesElement.textContent = nodesExplored.toLocaleString();
        }
        
        const depthElement = document.getElementById('current-depth');
        if (depthElement) {
            depthElement.textContent = currentDepth;
        }
        
        const timeElement = document.getElementById('elapsed-time');
        if (timeElement && startTime) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            timeElement.textContent = `${elapsedSeconds.toFixed(1)}s`;
        }
    }

    showProgressDisplay() {
        const progressContainer = document.getElementById('solving-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            document.getElementById('progress-fill').style.width = '0%';
            document.getElementById('progress-status').textContent = 'Starting...';
        }
    }

    hideProgressDisplay() {
        const progressContainer = document.getElementById('solving-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    updateProgress(progress) {
        const progressFill = document.getElementById('progress-fill');
        const progressStatus = document.getElementById('progress-status');
        
        if (progressFill && progress.progress !== undefined) {
            progressFill.style.width = `${Math.min(progress.progress, 100)}%`;
        }
        
        if (progressStatus && progress.status) {
            progressStatus.textContent = progress.status;
        }
    }

    displaySolution() {
        document.getElementById('solution-display').classList.remove('hidden');
        
        this.currentStepIndex = 0;
        this.updateSolutionDisplay();
        this.renderStepList();
        
        // Update the step counter in the navigation
        const totalStepsEl = document.getElementById('total-steps');
        if (totalStepsEl) {
            totalStepsEl.textContent = this.currentSolution.steps.length;
        }
        
        // Scroll to solution
        document.getElementById('solution-display').scrollIntoView({ behavior: 'smooth' });
    }

    renderStepList() {
        const stepsContainer = document.getElementById('solution-steps');
        stepsContainer.innerHTML = '';

        this.currentSolution.steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step-item';
            stepEl.innerHTML = `<strong>Step ${step.step}:</strong> ${step.description}`;
            stepEl.addEventListener('click', () => this.goToStep(index + 1));
            stepsContainer.appendChild(stepEl);
        });
        
        // Add some CSS to make the steps look nicer
        this.addStepStyles();
    }
    
    addStepStyles() {
        if (document.getElementById('step-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'step-styles';
        style.textContent = `
            .step-item {
                transition: all 0.3s ease;
                border-left: 4px solid transparent;
            }
            .step-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-left-color: var(--accent-primary);
            }
            .step-item.active {
                background: rgba(220, 20, 60, 0.2);
                border-left-color: var(--accent-primary);
                font-weight: bold;
            }
            .step-item.completed {
                background: rgba(34, 197, 94, 0.1);
                border-left-color: #22c55e;
                opacity: 0.8;
            }
            .current-move-description {
                background: var(--bg-medium);
                border: 2px solid var(--accent-primary);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                text-align: center;
            }
            .current-move-description h3 {
                margin: 0 0 10px 0;
                color: var(--accent-primary);
            }
            .current-move-description p {
                margin: 5px 0;
                color: var(--text-secondary);
            }
            .solution-tile {
                cursor: default;
            }
            .solution-tile:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            }
            .step-btn {
                height: 36px !important;
                min-height: 36px !important;
                padding: 8px 16px !important;
                font-size: 14px !important;
                border-radius: 6px !important;
                border: 1px solid var(--accent-primary) !important;
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 4px !important;
            }
            .step-btn:hover:not(:disabled) {
                background: var(--accent-primary) !important;
                color: white !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            }
            .step-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                background: var(--bg-dark) !important;
            }
            .play-btn {
                background: var(--accent-primary) !important;
                color: white !important;
                font-weight: bold !important;
            }
            .utility-btn {
                height: 32px !important;
                padding: 6px 12px !important;
                font-size: 13px !important;
                border-radius: 4px !important;
                border: 1px solid var(--accent-secondary) !important;
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            .utility-btn:hover {
                background: var(--accent-secondary) !important;
                color: white !important;
            }
            .puzzle-boards {
                display: flex !important;
                justify-content: center !important;
                align-items: flex-start !important;
                gap: 40px !important;
                margin: 20px auto !important;
                max-width: 1000px !important;
            }
            .board-section {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
            }
            .solution-display {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                margin: 20px auto !important;
                max-width: 800px !important;
            }
            .solution-board {
                margin: 0 auto 20px auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    updateSolutionDisplay() {
        const state = this.currentSolution.states[this.currentStepIndex];
        this.solutionVisualizer.displayState(this.solver.stateToArray(state));
        
        document.getElementById('current-step').textContent = this.currentStepIndex;
        
        // Update step list
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, i) => {
            if (i === this.currentStepIndex - 1) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

        // Update button states
        document.getElementById('first-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('prev-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('next-step-btn').disabled = this.currentStepIndex >= this.currentSolution.steps.length;
        document.getElementById('last-step-btn').disabled = this.currentStepIndex >= this.currentSolution.steps.length;
    }

    goToStep(index) {
        this.goToStepWithAnimation(index);
    }

    async previousStep() {
        if (this.currentStepIndex > 0) {
            await this.goToStepWithAnimation(this.currentStepIndex - 1);
        }
    }

    async nextStep() {
        if (this.currentStepIndex < this.currentSolution.steps.length) {
            await this.goToStepWithAnimation(this.currentStepIndex + 1);
        }
    }

    async goToStepWithAnimation(index) {
        if (!this.currentSolution) return;
        
        const newIndex = Math.max(0, Math.min(index, this.currentSolution.steps.length));
        if (newIndex === this.currentStepIndex) return;
        
        const isMovingForward = newIndex > this.currentStepIndex;
        
        if (isMovingForward && newIndex > 0) {
            // Animate from previous state to current state
            const prevState = this.currentSolution.states[newIndex - 1];
            const currentState = this.currentSolution.states[newIndex];
            const move = this.currentSolution.steps[newIndex - 1];
            
            if (move && move.from && move.to && move.value) {
                await this.solutionVisualizer.animateStep(
                    this.solver.stateToArray(prevState),
                    this.solver.stateToArray(currentState),
                    move
                );
            } else {
                this.solutionVisualizer.displayState(this.solver.stateToArray(currentState));
            }
        } else {
            // Just display the state without animation for backward movement
            this.solutionVisualizer.displayState(this.solver.stateToArray(this.currentSolution.states[newIndex]));
        }
        
        this.currentStepIndex = newIndex;
        this.updateStepTracking();
    }

    goToLastStep() {
        this.goToStep(this.currentSolution.steps.length);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.stopPlaying();
        } else {
            this.startPlaying();
        }
    }

    startPlaying() {
        this.isPlaying = true;
        document.getElementById('play-solution-btn').innerHTML = '⏸ Pause';
        
        this.playWithAnimation();
    }
    
    async playWithAnimation() {
        if (!this.isPlaying || !this.currentSolution) return;

        for (let step = this.currentStepIndex + 1; step <= this.currentSolution.steps.length; step++) {
            if (!this.isPlaying) break;
            
            // Update step counter BEFORE starting the animation
            this.currentStepIndex = step;
            this.updateStepTracking();
            
            const prevState = this.currentSolution.states[step - 1];
            const nextState = this.currentSolution.states[step];
            const move = this.currentSolution.steps[step - 1];
            
            // Use animation if we have move information
            if (move && move.from && move.to && move.value) {
                await this.solutionVisualizer.animateStep(
                    this.solver.stateToArray(prevState),
                    this.solver.stateToArray(nextState),
                    move
                );
            } else {
                // Fallback to regular display
                this.solutionVisualizer.displayState(this.solver.stateToArray(nextState));
                await new Promise(resolve => setTimeout(resolve, 800 / (this.speedMultiplier || 1.0)));
            }
        }

        if (this.isPlaying) {
            this.stopPlaying();
        }
    }    stopPlaying() {
        this.isPlaying = false;
        document.getElementById('play-solution-btn').innerHTML = '▶ Play';
        // No need to clear interval since we're using async/await now
    }

    copySolution() {
        if (!this.currentSolution) return;
        
        const text = this.currentSolution.steps
            .map(s => `${s.step}. ${s.description}`)
            .join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-solution-btn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }

    showProgressDisplay() {
        let progressDiv = document.getElementById('solving-progress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.id = 'solving-progress';
            progressDiv.className = 'solving-progress';
            progressDiv.innerHTML = `
                <div class="progress-content">
                    <h3>🧩 Solving Puzzle...</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-stats">
                        <div id="progress-status">Initializing...</div>
                        <div id="progress-details">Iterations: 0 | Open: 0 | Closed: 0</div>
                    </div>
                </div>
            `;
            
            // Add CSS styles
            const style = document.createElement('style');
            style.textContent = `
                .solving-progress {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--bg-medium);
                    border: 2px solid var(--accent-primary);
                    border-radius: 12px;
                    padding: 30px;
                    z-index: 10000;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    min-width: 400px;
                    text-align: center;
                }
                .progress-content h3 {
                    color: var(--text-primary);
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                }
                .progress-bar {
                    width: 100%;
                    height: 20px;
                    background: var(--bg-dark);
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 15px;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent-primary), var(--accent-primary-light));
                    transition: width 0.3s ease;
                }
                .progress-stats {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .progress-stats div {
                    margin: 5px 0;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(progressDiv);
        }
        progressDiv.style.display = 'block';
    }
    
    updateProgress(progress) {
        const statusEl = document.getElementById('progress-status');
        const detailsEl = document.getElementById('progress-details');
        const fillEl = document.querySelector('.progress-fill');
        
        if (statusEl) statusEl.textContent = progress.status || 'Searching...';
        
        if (progress.error) {
            if (fillEl) fillEl.style.background = 'var(--accent-red)';
            return;
        }
        
        if (detailsEl && progress.iterations !== undefined) {
            detailsEl.textContent = `Iterations: ${progress.iterations} | Open: ${progress.openSetSize || 0} | Closed: ${progress.closedSetSize || 0} | Distance: ${progress.bestHeuristic || 0}`;
        }
        
        if (fillEl && progress.progress !== undefined) {
            fillEl.style.width = `${Math.max(5, progress.progress)}%`;
        }
    }
    
    hideProgressDisplay() {
        const progressDiv = document.getElementById('solving-progress');
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 1000); // Keep visible for 1 second to show completion
        }
    }

    resetSolver() {
        document.getElementById('solution-display').classList.add('hidden');
        this.currentSolution = null;
        this.currentStepIndex = 0;
        this.stopPlaying();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateSolutionDisplay() {
        const state = this.currentSolution.states[this.currentStepIndex];
        this.solutionVisualizer.displayState(this.solver.stateToArray(state));
        
        document.getElementById('current-step').textContent = this.currentStepIndex;
        
        // Update step list to show which ones are done
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, i) => {
            item.classList.remove('active', 'completed');
            if (i === this.currentStepIndex - 1) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (i < this.currentStepIndex - 1) {
                item.classList.add('completed');
            }
        });

        // Show current move description
        this.updateMoveDescription();
        
        // Update button states
        document.getElementById('first-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('prev-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('next-step-btn').disabled = this.currentStepIndex === this.currentSolution.steps.length;
        document.getElementById('last-step-btn').disabled = this.currentStepIndex === this.currentSolution.steps.length;
    }
    
    updateMoveDescription() {
        const container = document.querySelector('.solution-controls');
        let descEl = container.querySelector('.current-move-description');
        
        if (!descEl) {
            descEl = document.createElement('div');
            descEl.className = 'current-move-description';
            container.insertBefore(descEl, container.firstChild);
        }
        
        if (this.currentStepIndex === 0) {
            descEl.innerHTML = `
                <h3>Initial State</h3>
                <p>Starting puzzle configuration</p>
                <p>Steps to solve: ${this.currentSolution.steps.length}</p>
            `;
        } else if (this.currentStepIndex === this.currentSolution.states.length - 1) {
            descEl.innerHTML = `
                <h3>🎉 Puzzle Solved!</h3>
                <p>Congratulations! All tiles are in order.</p>
                <p>Total steps: ${this.currentSolution.steps.length}</p>
            `;
        } else {
            const step = this.currentSolution.steps[this.currentStepIndex - 1];
            descEl.innerHTML = `
                <h3>Step ${this.currentStepIndex} of ${this.currentSolution.steps.length}</h3>
                <p>${step.description}</p>
                <p>Progress: ${Math.round((this.currentStepIndex / this.currentSolution.steps.length) * 100)}%</p>
            `;
        }
    }
    
    updateStepTracking() {
        document.getElementById('current-step').textContent = this.currentStepIndex;
        
        // Update step list
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, i) => {
            item.classList.remove('active', 'completed');
            if (i === this.currentStepIndex - 1) {
                item.classList.add('active');
            } else if (i < this.currentStepIndex - 1) {
                item.classList.add('completed');
            }
        });
        
        // Update button states with correct logic
        document.getElementById('first-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('prev-step-btn').disabled = this.currentStepIndex === 0;
        document.getElementById('next-step-btn').disabled = this.currentStepIndex >= this.currentSolution.steps.length;
        document.getElementById('last-step-btn').disabled = this.currentStepIndex >= this.currentSolution.steps.length;
        
        this.updateMoveDescription();
    }

    copySolution() {
        if (!this.currentSolution) return;
        
        const text = this.currentSolution.steps
            .map(s => `${s.step}. ${s.description}`)
            .join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-solution-btn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
}

// Start everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SolverPageController();
});
