/* ------------------------------------------------------------------
 *  Levels
 *  ------------------------------------------------------------------
 *  Each level is a 2D array of arrow codes:
 *    0 = empty
 *    1 = up
 *    2 = right
 *    3 = down
 *    4 = left
 *
 *  A level is always solvable: arrows only get removed (never moved),
 *  so any initial configuration has at least one valid solution — the
 *  challenge is finding it.
 *  ------------------------------------------------------------------ */

const ARROW = {
  EMPTY: 0,
  UP: 1,
  RIGHT: 2,
  DOWN: 3,
  LEFT: 4,
};

const ARROW_DELTAS = {
  [ARROW.UP]: { dr: -1, dc: 0 },
  [ARROW.RIGHT]: { dr: 0, dc: 1 },
  [ARROW.DOWN]: { dr: 1, dc: 0 },
  [ARROW.LEFT]: { dr: 0, dc: -1 },
};

// Hand-crafted tutorial / opening levels
const HANDCRAFTED_LEVELS = [
  // Level 1: All arrows have a free path — pure warm-up
  {
    name: "Warm Up",
    grid: [
      [1, 2, 3, 0, 4],
      [0, 0, 0, 0, 0],
      [0, 1, 2, 3, 0],
      [0, 0, 0, 0, 0],
      [4, 0, 3, 0, 1],
    ],
  },
  // Level 2: Some arrows block others
  {
    name: "Watch the Path",
    grid: [
      [0, 1, 0, 0, 2],
      [0, 0, 0, 0, 0],
      [2, 0, 3, 0, 1],
      [0, 0, 0, 0, 0],
      [0, 4, 0, 3, 0],
    ],
  },
  // Level 3: Order matters
  {
    name: "Think First",
    grid: [
      [0, 0, 2, 0, 0],
      [0, 3, 0, 4, 0],
      [1, 0, 0, 0, 2],
      [0, 4, 0, 3, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  // Level 4: Trickier middle
  {
    name: "Patience",
    grid: [
      [2, 0, 3, 0, 4, 0],
      [0, 4, 0, 1, 0, 2],
      [1, 0, 2, 0, 3, 0],
      [0, 3, 0, 4, 0, 1],
      [4, 0, 1, 0, 2, 0],
      [0, 1, 0, 3, 0, 4],
    ],
  },
];

// Generate a procedurally-built level with tunable difficulty.
function generateProceduralLevel(levelIndex) {
  // Size grows from 5 to 8 as levels progress
  const size = Math.min(5 + Math.floor((levelIndex - 1) / 3), 8);
  // Density from 0.42 up to 0.62 (keeps boards readable)
  const density = Math.min(0.42 + levelIndex * 0.015, 0.62);

  const grid = Array.from({ length: size }, () => Array(size).fill(0));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < density) {
        const dir = 1 + Math.floor(Math.random() * 4);
        grid[r][c] = dir;
      }
    }
  }

  // Ensure at least 4 arrows exist so the level is non-trivial
  let arrowCount = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (grid[r][c] !== 0) arrowCount++;

  let attempts = 0;
  while (arrowCount < 4 && attempts < 50) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (grid[r][c] === 0) {
      grid[r][c] = 1 + Math.floor(Math.random() * 4);
      arrowCount++;
    }
    attempts++;
  }

  return { name: `Level ${levelIndex}`, grid };
}

function buildLevel(levelIndex) {
  if (levelIndex <= HANDCRAFTED_LEVELS.length) {
    return HANDCRAFTED_LEVELS[levelIndex - 1];
  }
  return generateProceduralLevel(levelIndex);
}
