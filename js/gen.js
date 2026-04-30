/**
 * Checks if a square at a given index has the same color as any of its direct neighbors.
 * @param {number} index The index of the square in the data array.
 * @param {number} size The width/height of the grid.
 * @param {number[]} data The flat array representing the grid data.
 * @returns {boolean} True if there is a conflict, false otherwise.
 */
function hasConflict(index, size, data) {
    const color = data[index];
    const row = Math.floor(index / size);
    const col = index % size;

    // Check top neighbor
    if (row > 0 && data[index - size] === color) return true;
    // Check bottom neighbor
    if (row < size - 1 && data[index + size] === color) return true;
    // Check left neighbor
    if (col > 0 && data[index - 1] === color) return true;
    // Check right neighbor
    if (col < size - 1 && data[index + 1] === color) return true;

    return false;
}

/**
 * Generates the game board information.
 * It creates a grid of colored squares ensuring no two adjacent squares have the same color.
 * @param {number} size The width and height of the square grid.
 * @param {string} [seed] An optional seed for the random number generator for reproducible boards.
 * @returns {{size: number, data: number[], move: number}}
 */
export function generateInfo(size, seed) {
    const randomS = seed ? new SeededRandom(seed) : new SeededRandom(Math.floor(Math.random() * 10000000).toString());
    const gridSize = size * size;

    let tData;
    let generationAttempts = 0;
    const MAX_GENERATION_ATTEMPTS = 10; // Try up to 10 different shuffles

    while (generationAttempts < MAX_GENERATION_ATTEMPTS) {
        // 1. Generate initial data: `size` squares for each of the `size` colors.
        tData = Array.from({ length: gridSize }, (_, i) => Math.floor(i / size));

        // 2. Shuffle the data randomly using Fisher-Yates algorithm.
        for (let i = tData.length - 1; i > 0; i--) {
            const j = Math.floor(randomS.next() * (i + 1));
            [tData[i], tData[j]] = [tData[j], tData[i]];
        }

        // 3. Repair the grid: Find squares with color conflicts and swap them.
        // We iterate a few times to allow fixes to propagate. `size` is a reasonable number of passes.
        for (let pass = 0; pass < size; pass++) {
            let conflictsFound = 0;
            for (let i = 0; i < gridSize; i++) {
                if (hasConflict(i, size, tData)) {
                    conflictsFound++;
                    // This square has a conflict. Try to find another square to swap with.
                    // We search for a swap that resolves the conflict at `i` without creating a new one.
                    for (let j = i + 1; j < gridSize; j++) {
                        // Create a temporary swapped board to test the outcome
                        const tempSwappedData = [...tData];
                        [tempSwappedData[i], tempSwappedData[j]] = [tempSwappedData[j], tempSwappedData[i]];

                        // If the swap is valid (resolves conflict at i and doesn't create one at j), perform it.
                        if (!hasConflict(i, size, tempSwappedData) && !hasConflict(j, size, tempSwappedData)) {
                            tData = tempSwappedData; // Commit the swap
                            break; // Move to the next square
                        }
                    }
                }
            }
            if (conflictsFound === 0) break; // Board is valid, no need for more passes
        }

        // 4. Final check: Verify if the board is completely valid.
        let isBoardValid = true;
        for (let i = 0; i < gridSize; i++) {
            if (hasConflict(i, size, tData)) {
                isBoardValid = false;
                break;
            }
        }

        if (isBoardValid) {
            break; // Found a valid board, exit the generation loop.
        }

        generationAttempts++;
    }

    if (generationAttempts >= MAX_GENERATION_ATTEMPTS) {
        console.warn(`Could not generate a perfectly valid board for size ${size}. The result may have adjacent squares with the same color.`);
    }

    const move = Math.floor(randomS.next() * gridSize);
    return { size: parseInt(size), data: tData, move: move };
}

/**
 * A simple Linear Congruential Generator (LCG) for seeded random numbers.
 */
class SeededRandom {
    constructor(seed) {
        this.seed = this.stringToNumber(seed);
    }

    stringToNumber(str) {
        let num = 0;
        for (let i = 0; i < str.length; i++) {
            num = (num * 31 + str.charCodeAt(i)) >>> 0;
        }
        return num;
    }

    next() {
        // This is the mulberry32 algorithm.
        let t = this.seed = (this.seed + 0x6D2B79F5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}