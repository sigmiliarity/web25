/**
 * Checks if the puzzle is solved.
 * A puzzle is solved if all rows are of a single color OR all columns are of a single color.
 * This function is optimized to avoid creating intermediate arrays and to exit as early as possible.
 *
 * @param {number} GRID_SIZE The size of the grid (e.g., 5 for a 5x5 grid).
 * @param {object} gameState The current state of the game, containing the `squares` 2D array.
 * @returns {boolean} True if the puzzle is solved, false otherwise.
 */
export function checkWon(GRID_SIZE, gameState) {
  const squares = gameState.squares;

  // --- Check for a win by rows ---
  let allRowsAreUniform = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    const firstColorInRow = squares[i][0].color;
    for (let j = 1; j < GRID_SIZE; j++) {
      if (squares[i][j].color !== firstColorInRow) {
        // This row is not uniform, so we can't win by rows.
        allRowsAreUniform = false;
        break; // Exit inner loop (stop checking this row)
      }
    }
    if (!allRowsAreUniform) {
      break; // Exit outer loop (stop checking other rows)
    }
  }

  // If all rows were uniform, it's a win.
  if (allRowsAreUniform) {
    return true;
  }

  // --- Check for a win by columns (only if rows failed) ---
  let allColumnsAreUniform = true;
  for (let j = 0; j < GRID_SIZE; j++) {
    const firstColorInCol = squares[0][j].color;
    for (let i = 1; i < GRID_SIZE; i++) {
      if (squares[i][j].color !== firstColorInCol) {
        // This column is not uniform, so we can't win by columns.
        allColumnsAreUniform = false;
        break; // Exit inner loop (stop checking this column)
      }
    }
    if (!allColumnsAreUniform) {
      break; // Exit outer loop (stop checking other columns)
    }
  }

  return allColumnsAreUniform;
}