/* ------------------------------------------------------------------
 *  Arrow Puzzle — main game
 *  ------------------------------------------------------------------ */

(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const levelValue = document.getElementById("level-value");
  const livesValue = document.getElementById("lives-value");
  const arrowsValue = document.getElementById("arrows-value");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayHint = document.getElementById("overlay-hint");
  const primaryBtn = document.getElementById("primary-btn");
  const secondaryBtn = document.getElementById("secondary-btn");
  const hintBtn = document.getElementById("hint-btn");
  const resetBtn = document.getElementById("reset-btn");
  const menuBtn = document.getElementById("menu-btn");

  // ---------- State ----------
  const state = {
    level: 1,
    lives: 3,
    grid: [],          // 2D array of arrow codes
    size: 0,           // grid dimension
    cellSize: 0,       // pixels per cell
    padding: 0,        // board padding
    animating: false,  // true while an arrow is sliding off
    particles: [],     // active particles
    hintCell: null,    // {r, c} currently highlighted as a hint
    hintTimer: 0,      // frames left for the hint glow
    menu: true,        // start in menu overlay
    moveCount: 0,      // moves in this level
    maxLevel: 12,      // cap to keep the game tight
  };

  // ---------- Sizing ----------
  function resizeCanvas() {
    // Match the canvas internal resolution to its CSS size for sharp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    recomputeLayout();
    render();
  }

  function recomputeLayout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const size = Math.min(w, h);
    const padding = Math.max(16, Math.floor(size * 0.04));
    const usable = size - padding * 2;
    state.size = state.grid.length || 1;
    state.cellSize = usable / state.size;
    state.padding = padding;
  }

  // ---------- Game flow ----------
  function startLevel(levelNum) {
    state.level = levelNum;
    const def = buildLevel(levelNum);
    state.grid = def.grid.map((row) => row.slice());
    state.lives = 3;
    state.moveCount = 0;
    state.hintCell = null;
    state.hintTimer = 0;
    state.animating = false;
    state.particles = [];
    hideOverlay();
    recomputeLayout();
    updateStats();
    render();
  }

  function nextLevel() {
    const target = state.level + 1;
    if (target > state.maxLevel) {
      showOverlay({
        title: "You did it! 🎉",
        text: "You cleared every level. Take a breath — and try a new run from Level 1.",
        primaryLabel: "Play Again",
        onPrimary: () => startLevel(1),
        secondaryLabel: "Stay Here",
        onSecondary: () => startLevel(state.maxLevel),
        hint: "Procedural levels reset each time, so the puzzle is always fresh.",
      });
      return;
    }
    startLevel(target);
  }

  function restartLevel() {
    startLevel(state.level);
  }

  function goToMenu() {
    state.menu = true;
    showOverlay({
      title: "Arrow Puzzle",
      text:
        "Tap an arrow to send it on its way.<br/>" +
        "If the path to the edge is clear, it escapes. If not, you lose a life.<br/><br/>" +
        "Clear every arrow to win. Use 💡 Hint if you get stuck.",
      primaryLabel: "Play",
      onPrimary: () => startLevel(1),
      hint: "Tip: arrows on an edge, pointing off the board, are always free.",
    });
  }

  // ---------- Path check ----------
  // Returns true if the arrow at (r, c) has a clear path off the board.
  function canEscape(r, c) {
    const dir = state.grid[r][c];
    if (dir === ARROW.EMPTY) return false;
    const delta = ARROW_DELTAS[dir];
    let nr = r + delta.dr;
    let nc = c + delta.dc;
    while (nr >= 0 && nr < state.size && nc >= 0 && nc < state.size) {
      if (state.grid[nr][nc] !== ARROW.EMPTY) return false;
      nr += delta.dr;
      nc += delta.dc;
    }
    return true; // walked off the board without hitting anything
  }

  // Returns the first cell (in any scan order) whose arrow can escape.
  function findHint() {
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        if (state.grid[r][c] !== ARROW.EMPTY && canEscape(r, c)) {
          return { r, c };
        }
      }
    }
    return null;
  }

  // ---------- Input ----------
  function cellFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left - state.padding;
    const y = evt.clientY - rect.top - state.padding;
    if (x < 0 || y < 0) return null;
    const c = Math.floor(x / state.cellSize);
    const r = Math.floor(y / state.cellSize);
    if (r < 0 || c < 0 || r >= state.size || c >= state.size) return null;
    return { r, c };
  }

  function handlePointer(evt) {
    if (state.menu || state.animating) return;
    const cell = cellFromEvent(evt);
    if (!cell) return;
    const { r, c } = cell;
    if (state.grid[r][c] === ARROW.EMPTY) return;

    state.hintCell = null;
    state.hintTimer = 0;

    if (canEscape(r, c)) {
      animateEscape(r, c);
    } else {
      onBlockedTap(r, c);
    }
  }

  function onBlockedTap(r, c) {
    state.lives = Math.max(0, state.lives - 1);
    state.moveCount++;
    flashCell(r, c, "#e9586a");
    updateStats();
    if (state.lives <= 0) {
      showOverlay({
        title: "Out of lives",
        text: "Don't worry — that puzzle is still solvable. Take another look.",
        primaryLabel: "Retry",
        onPrimary: restartLevel,
        secondaryLabel: "Menu",
        onSecondary: goToMenu,
        hint: "Look for an edge arrow whose path is fully empty.",
      });
    }
  }

  // ---------- Animations ----------
  function animateEscape(r, c) {
    const dir = state.grid[r][c];
    const delta = ARROW_DELTAS[dir];
    state.animating = true;
    state.moveCount++;

    const startX = state.padding + c * state.cellSize + state.cellSize / 2;
    const startY = state.padding + r * state.cellSize + state.cellSize / 2;
    // Travel far enough to clearly leave the board
    const travel = canvas.clientWidth * 1.2;
    const endX = startX + delta.dc * travel;
    const endY = startY + delta.dr * travel;

    // Remove from the logical grid immediately so it can no longer block others
    state.grid[r][c] = ARROW.EMPTY;
    updateStats();

    const duration = 380;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 2); // ease-out
      const x = startX + (endX - startX) * eased;
      const y = startY + (endY - startY) * eased;

      // Repaint the whole board (with the escaped cell now empty), then
      // draw the moving arrow on top.
      render();
      drawArrowAt(x, y, dir, state.cellSize * (1 - 0.4 * t), 1 - t);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        state.animating = false;
        spawnEscapeParticles(startX, startY);
        requestPaint(); // keep painting while particles exist
        if (isBoardCleared()) {
          onLevelComplete();
        }
      }
    }
    requestAnimationFrame(step);
  }

  function flashCell(r, c, color) {
    state.flash = { r, c, color, t: 0, dur: 360 };
  }

  // Flashes the action buttons (used when no safe arrow exists for a hint).
  function flashButton(btn) {
    btn.classList.remove("shake");
    // Force reflow so the animation can re-trigger
    void btn.offsetWidth;
    btn.classList.add("shake");
  }

  function spawnEscapeParticles(x, y) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const speed = 1.6 + Math.random() * 2.2;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 3 + Math.random() * 3,
        color: ["#6aa8ff", "#79d3c1", "#ffd479", "#f7a8a8"][i % 4],
      });
    }
  }

  function isBoardCleared() {
    for (let r = 0; r < state.size; r++)
      for (let c = 0; c < state.size; c++)
        if (state.grid[r][c] !== ARROW.EMPTY) return false;
    return true;
  }

  function onLevelComplete() {
    const isLast = state.level >= state.maxLevel;
    showOverlay({
      title: isLast ? "Master of Arrows 🏆" : `Level ${state.level} cleared`,
      text: isLast
        ? "You cleared every level. Want to play the set again?"
        : "Nice flow. Ready for the next one?",
      primaryLabel: isLast ? "Play Again" : "Next Level",
      onPrimary: isLast ? () => startLevel(1) : nextLevel,
      secondaryLabel: "Replay",
      onSecondary: restartLevel,
      hint: `Cleared in ${state.moveCount} moves with ${state.lives} ♥ left.`,
    });
  }

  // ---------- Rendering ----------
  function render() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    drawBoardBackground();

    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const code = state.grid[r][c];
        if (code === ARROW.EMPTY) continue;
        const cx = state.padding + c * state.cellSize + state.cellSize / 2;
        const cy = state.padding + r * state.cellSize + state.cellSize / 2;
        const isHint = state.hintCell && state.hintCell.r === r && state.hintCell.c === c;
        drawArrowAt(cx, cy, code, state.cellSize * 0.78, 1, isHint);
      }
    }

    drawFlash();
    drawParticles();
  }

  function drawBoardBackground() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Soft gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#f7fafd");
    grad.addColorStop(1, "#eef3f9");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(120, 150, 190, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= state.size; i++) {
      const p = state.padding + i * state.cellSize;
      ctx.moveTo(p, state.padding);
      ctx.lineTo(p, state.padding + state.size * state.cellSize);
      ctx.moveTo(state.padding, p);
      ctx.lineTo(state.padding + state.size * state.cellSize, p);
    }
    ctx.stroke();

    // Edge accents that match the calm visual language
    ctx.strokeStyle = "rgba(106, 168, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      state.padding - 1,
      state.padding - 1,
      state.size * state.cellSize + 2,
      state.size * state.cellSize + 2
    );
  }

  function drawArrowAt(cx, cy, dir, size, alpha = 1, hint = false) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;

    const half = size / 2;
    const tipX = 0;
    const tipY = 0;

    // Triangle/arrow body
    ctx.beginPath();
    if (dir === ARROW.UP) {
      ctx.moveTo(0, -half);
      ctx.lineTo(half * 0.85, half * 0.4);
      ctx.lineTo(half * 0.32, half * 0.4);
      ctx.lineTo(half * 0.32, half * 0.85);
      ctx.lineTo(-half * 0.32, half * 0.85);
      ctx.lineTo(-half * 0.32, half * 0.4);
      ctx.lineTo(-half * 0.85, half * 0.4);
    } else if (dir === ARROW.DOWN) {
      ctx.moveTo(0, half);
      ctx.lineTo(half * 0.85, -half * 0.4);
      ctx.lineTo(half * 0.32, -half * 0.4);
      ctx.lineTo(half * 0.32, -half * 0.85);
      ctx.lineTo(-half * 0.32, -half * 0.85);
      ctx.lineTo(-half * 0.32, -half * 0.4);
      ctx.lineTo(-half * 0.85, -half * 0.4);
    } else if (dir === ARROW.RIGHT) {
      ctx.moveTo(half, 0);
      ctx.lineTo(-half * 0.4, half * 0.85);
      ctx.lineTo(-half * 0.4, half * 0.32);
      ctx.lineTo(-half * 0.85, half * 0.32);
      ctx.lineTo(-half * 0.85, -half * 0.32);
      ctx.lineTo(-half * 0.4, -half * 0.32);
      ctx.lineTo(-half * 0.4, -half * 0.85);
    } else if (dir === ARROW.LEFT) {
      ctx.moveTo(-half, 0);
      ctx.lineTo(half * 0.4, half * 0.85);
      ctx.lineTo(half * 0.4, half * 0.32);
      ctx.lineTo(half * 0.85, half * 0.32);
      ctx.lineTo(half * 0.85, -half * 0.32);
      ctx.lineTo(half * 0.4, -half * 0.32);
      ctx.lineTo(half * 0.4, -half * 0.85);
    }
    ctx.closePath();

    const baseGrad = ctx.createLinearGradient(0, -half, 0, half);
    baseGrad.addColorStop(0, "#7fb6ff");
    baseGrad.addColorStop(1, "#4a8de3");
    ctx.fillStyle = baseGrad;
    ctx.shadowColor = "rgba(74, 141, 227, 0.35)";
    ctx.shadowBlur = hint ? 18 : 10;
    ctx.shadowOffsetY = 3;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();

    // Hint ring
    if (hint) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
      ctx.beginPath();
      ctx.arc(0, 0, half * 1.05 + pulse * 6, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(121, 211, 193, ${0.55 + pulse * 0.35})`;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFlash() {
    if (!state.flash) return;
    const { r, c, color } = state.flash;
    state.flash.t += 16;
    const p = state.flash.t / state.flash.dur;
    if (p >= 1) {
      state.flash = null;
      return;
    }
    const x = state.padding + c * state.cellSize;
    const y = state.padding + r * state.cellSize;
    const alpha = 0.6 * (1 - p);
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    const inset = state.cellSize * 0.1 * p;
    ctx.fillRect(
      x + inset,
      y + inset,
      state.cellSize - inset * 2,
      state.cellSize - inset * 2
    );
    ctx.restore();
  }

  function drawParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.98;
      p.life -= 0.025;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- Main loop ----------
  // We use a single rAF loop. When the scene is static, we set rafPending=false
  // to avoid burning CPU; any state change flips it back on.
  let rafPending = false;
  let lastFrame = 0;

  function requestPaint() {
    if (rafPending) return;
    rafPending = true;
    lastFrame = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    rafPending = false;
    const dt = now - lastFrame;
    lastFrame = now;

    if (state.hintTimer > 0) {
      state.hintTimer -= dt;
      if (state.hintTimer <= 0) {
        state.hintCell = null;
        state.hintTimer = 0;
      }
    }

    render();

    // Keep painting while anything is animating, glowing, or flashing.
    if (
      state.particles.length ||
      state.flash ||
      state.hintCell ||
      state.animating
    ) {
      rafPending = true;
      requestAnimationFrame(tick);
    }
  }

  // ---------- Stats / overlay ----------
  function updateStats() {
    levelValue.textContent = state.level;
    livesValue.textContent = state.lives > 0 ? "♥".repeat(state.lives) : "—";
    let count = 0;
    for (let r = 0; r < state.size; r++)
      for (let c = 0; c < state.size; c++) if (state.grid[r][c] !== ARROW.EMPTY) count++;
    arrowsValue.textContent = count;
  }

  function showOverlay({ title, text, primaryLabel, onPrimary, secondaryLabel, onSecondary, hint }) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    overlayHint.textContent = hint || "";
    primaryBtn.textContent = primaryLabel || "OK";
    primaryBtn.onclick = () => {
      primaryBtn.onclick = null;
      onPrimary && onPrimary();
    };
    if (secondaryLabel && onSecondary) {
      secondaryBtn.textContent = secondaryLabel;
      secondaryBtn.classList.remove("hidden");
      secondaryBtn.onclick = () => {
        secondaryBtn.onclick = null;
        onSecondary && onSecondary();
      };
    } else {
      secondaryBtn.classList.add("hidden");
      secondaryBtn.onclick = null;
    }
    overlay.classList.remove("hidden");
    state.menu = true;
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
    state.menu = false;
  }

  // ---------- Event wiring ----------
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    handlePointer(e);
  });

  hintBtn.addEventListener("click", () => {
    if (state.menu || state.animating) return;
    const hint = findHint();
    if (hint) {
      state.hintCell = hint;
      state.hintTimer = 4500; // 4.5s glow
      requestPaint();
    } else {
      // No safe arrow — give the user a tiny shake so the press doesn't feel dead.
      flashButton(hintBtn);
    }
  });

  resetBtn.addEventListener("click", () => {
    if (state.menu) return;
    restartLevel();
  });

  menuBtn.addEventListener("click", () => {
    goToMenu();
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  // ---------- Boot ----------
  function boot() {
    resizeCanvas();
    goToMenu();
    requestPaint();
  }

  boot();
})();
