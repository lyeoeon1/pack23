// ============================================================
// XAY CAU QUA SONG  —  Path Builder game module
// A character walks left-to-right across the screen.
// Players place colored objects in front of the camera to
// create platforms / bridges over river gaps so the character
// can reach home safely.
// ============================================================

let character = null;
let groundSegments = [];     // { x, y, w, h } — center-based like camera objects
let homeRect = null;
let startRect = null;
let wavePhase = 0;
let roundCount = 0;
let lives = 3;
let respawnTimer = 0;        // frames to wait before respawn
let splashParticles = [];     // local water splash fx
let obstacleX = 0;            // for level 3 moving obstacle
let obstacleDir = 1;

// --------------- helpers ---------------

function makeCharacter(engine, lv) {
  const W = engine.W;
  const H = engine.H;
  const groundY = H * 0.82;
  return {
    x: W * 0.06,
    y: groundY - 20,
    vx: lv.walkSpeed,
    vy: 0,
    emoji: lv.emoji,
    width: 40,
    height: 40,
    onGround: true,
    r: 20,  // used by Physics.hitTestRect expects entity.r — we do our own collision
  };
}

function buildGround(engine, lv) {
  const W = engine.W;
  const H = engine.H;
  const groundY = H * 0.82;
  const groundH = H - groundY;
  const segments = [];
  for (const seg of lv.groundDef) {
    const left = seg[0] * W;
    const right = seg[1] * W;
    const w = right - left;
    segments.push({
      x: left + w / 2,
      y: groundY + groundH / 2,
      w,
      h: groundH,
    });
  }
  return segments;
}

function buildHome(engine) {
  const W = engine.W;
  const H = engine.H;
  const groundY = H * 0.82;
  return {
    x: W * 0.94,
    y: groundY - 30,
    w: 50,
    h: 50,
  };
}

function buildStart(engine) {
  const H = engine.H;
  const groundY = H * 0.82;
  return {
    x: engine.W * 0.06,
    y: groundY - 30,
    w: 30,
    h: 50,
  };
}

function respawnCharacter(engine, lv) {
  const W = engine.W;
  const H = engine.H;
  const groundY = H * 0.82;
  character.x = W * 0.06;
  character.y = groundY - 20;
  character.vx = lv.walkSpeed;
  character.vy = 0;
  character.onGround = true;
}

// Check if a point (character bottom) is supported by a rect (ground or platform)
function isStandingOn(cx, cy, cw, ch, rect) {
  const charBottom = cy + ch / 2;
  const charLeft = cx - cw / 2;
  const charRight = cx + cw / 2;
  const platTop = rect.y - rect.h / 2;
  const platLeft = rect.x - rect.w / 2;
  const platRight = rect.x + rect.w / 2;

  // Character's feet must be near the top of the platform
  // and horizontally overlapping
  const verticalClose = charBottom >= platTop - 6 && charBottom <= platTop + 16;
  const horizontalOverlap = charRight > platLeft + 4 && charLeft < platRight - 4;
  return verticalClose && horizontalOverlap;
}

// Check if character is falling through a platform (for landing)
function canLandOn(cx, cy, vy, cw, ch, rect) {
  const charBottom = cy + ch / 2;
  const charLeft = cx - cw / 2;
  const charRight = cx + cw / 2;
  const platTop = rect.y - rect.h / 2;
  const platLeft = rect.x - rect.w / 2;
  const platRight = rect.x + rect.w / 2;

  // Must be falling (vy >= 0), feet near or below platform top
  const landing = vy >= 0 && charBottom >= platTop - 2 && charBottom <= platTop + 20;
  const horizontalOverlap = charRight > platLeft + 4 && charLeft < platRight - 4;
  return landing && horizontalOverlap;
}

function getGapRegions(engine, lv) {
  // Returns the gap x-ranges (between ground segments)
  const W = engine.W;
  const gaps = [];
  const sorted = [...lv.groundDef].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapLeft = sorted[i][1] * W;
    const gapRight = sorted[i + 1][0] * W;
    if (gapRight > gapLeft) {
      gaps.push({ left: gapLeft, right: gapRight });
    }
  }
  return gaps;
}

// --------------- export ---------------

export default {

  // ===== meta =====
  meta: {
    name: 'XAY CAU QUA SONG',
    icon: '\u{1F309}',
    description: 'Xay cau de giup ban nho qua song',
    tip: `
      <b>Cach choi:</b><br>
      \u{1F431} Ban nho tu dong di tu trai sang phai<br>
      \u{1F30A} Phia truoc co song (khe trong) can vuot qua<br>
      \u{1F9F1} Dat vat mau truoc camera de tao <b>cau / san</b><br>
      \u{1F3E0} Giup ban nho ve <b>nha</b> an toan!<br>
      \u{2764}\u{FE0F} Co 3 mang — roi xuong song mat 1 mang
    `,
  },

  // ===== levels =====
  levels: [
    {
      title: 'Man 1 — De (3-5 tuoi)',
      target: 3,
      duration: 90,
      emoji: '\u{1F431}',    // cat
      walkSpeed: 1.5,
      gravity: 0.3,
      lives: 3,
      bg: '#070b14',
      gridAlpha: 0.06,
      // Ground segments as fractions of screen width [start, end]
      groundDef: [[0, 0.35], [0.65, 1.0]],
      hasObstacle: false,
    },
    {
      title: 'Man 2 — Trung binh (5-7 tuoi)',
      target: 5,
      duration: 90,
      emoji: '\u{1F436}',    // dog
      walkSpeed: 2.0,
      gravity: 0.3,
      lives: 3,
      bg: '#070b14',
      gridAlpha: 0.05,
      groundDef: [[0, 0.25], [0.40, 0.60], [0.75, 1.0]],
      hasObstacle: false,
    },
    {
      title: 'Man 3 — Kho (6-8 tuoi)',
      target: 7,
      duration: 120,
      emoji: '\u{1F430}',    // rabbit
      walkSpeed: 2.5,
      gravity: 0.3,
      lives: 3,
      bg: '#070b14',
      gridAlpha: 0.04,
      groundDef: [[0, 0.18], [0.30, 0.42], [0.55, 0.68], [0.82, 1.0]],
      hasObstacle: true,
      obstacleGap: 2,  // which gap index has the moving obstacle
    },
  ],

  // ===== lifecycle =====

  setup(engine) {
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    lives = lv.lives;
    roundCount = 0;
    respawnTimer = 0;
    wavePhase = 0;
    splashParticles = [];
    obstacleX = 0;
    obstacleDir = 1;
    character = makeCharacter(engine, lv);
    groundSegments = buildGround(engine, lv);
    homeRect = buildHome(engine);
    startRect = buildStart(engine);
  },

  onStartLevel(engine) {
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    lives = lv.lives;
    roundCount = 0;
    respawnTimer = 0;
    wavePhase = 0;
    splashParticles = [];
    obstacleX = 0;
    obstacleDir = 1;
    character = makeCharacter(engine, lv);
    groundSegments = buildGround(engine, lv);
    homeRect = buildHome(engine);
    startRect = buildStart(engine);
  },

  onLevelChanged(engine) {
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    lives = lv.lives;
    roundCount = 0;
    respawnTimer = 0;
    wavePhase = 0;
    splashParticles = [];
    obstacleX = 0;
    obstacleDir = 1;
    character = makeCharacter(engine, lv);
    groundSegments = buildGround(engine, lv);
    homeRect = buildHome(engine);
    startRect = buildStart(engine);
  },

  // ===== physics tick =====

  update(engine) {
    if (!engine.state.running || engine.state.ended) return;
    if (!character) return;

    const lv = engine.getLevel();
    const { W, H } = engine;
    const objects = engine.camera.getObjects();
    const groundY = H * 0.82;

    // wave animation phase
    wavePhase += 0.04;

    // update local splash particles
    for (const sp of splashParticles) {
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.15;
      sp.life--;
    }
    splashParticles = splashParticles.filter(sp => sp.life > 0);

    // --- moving obstacle for level 3 ---
    if (lv.hasObstacle) {
      const gaps = getGapRegions(engine, lv);
      const gi = Math.min(lv.obstacleGap, gaps.length - 1);
      if (gi >= 0 && gaps[gi]) {
        const gap = gaps[gi];
        const margin = 30;
        if (obstacleX === 0) obstacleX = (gap.left + gap.right) / 2;
        obstacleX += obstacleDir * 1.8;
        if (obstacleX > gap.right - margin) obstacleDir = -1;
        if (obstacleX < gap.left + margin) obstacleDir = 1;
      }
    }

    // --- respawn cooldown ---
    if (respawnTimer > 0) {
      respawnTimer--;
      if (respawnTimer === 0) {
        respawnCharacter(engine, lv);
      }
      return;
    }

    // --- apply gravity ---
    character.vy += lv.gravity;
    character.y += character.vy;

    // --- check ground collision ---
    character.onGround = false;
    let bestSurfaceY = null;

    // Check static ground segments
    for (const seg of groundSegments) {
      if (canLandOn(character.x, character.y, character.vy, character.width, character.height, seg)) {
        const surfY = seg.y - seg.h / 2 - character.height / 2;
        if (bestSurfaceY === null || surfY < bestSurfaceY) {
          bestSurfaceY = surfY;
        }
      }
    }

    // Check camera-detected platforms (objects used as bridges)
    for (const obj of objects) {
      if (canLandOn(character.x, character.y, character.vy, character.width, character.height, obj)) {
        const surfY = obj.y - obj.h / 2 - character.height / 2;
        if (bestSurfaceY === null || surfY < bestSurfaceY) {
          bestSurfaceY = surfY;
        }
      }
    }

    // Land on surface
    if (bestSurfaceY !== null) {
      character.y = bestSurfaceY;
      character.vy = 0;
      character.onGround = true;
    }

    // --- move right when on ground ---
    if (character.onGround) {
      character.x += character.vx;
    } else {
      // Still move right while airborne but slower
      character.x += character.vx * 0.3;
    }

    // --- check obstacle collision (level 3) ---
    if (lv.hasObstacle && obstacleX > 0) {
      const obstW = 35;
      const obstH = 35;
      const obstY = groundY - 55;
      const dx = Math.abs(character.x - obstacleX);
      const dy = Math.abs(character.y - obstY);
      if (dx < (character.width / 2 + obstW / 2) - 4 && dy < (character.height / 2 + obstH / 2) - 4) {
        // Hit by obstacle — treat like falling
        handleFall(engine, lv);
        return;
      }
    }

    // --- check if reached home ---
    const charRight = character.x + character.width / 2;
    if (charRight >= homeRect.x - homeRect.w / 2) {
      // Reached home!
      roundCount++;
      engine.addScore(1);
      engine.audio.playScore();
      engine.addParticles(homeRect.x, homeRect.y, '#f59e0b', 20);
      engine.addParticles(homeRect.x, homeRect.y - 20, '#10b981', 16);
      engine.addFloatingText(
        homeRect.x, homeRect.y - 50,
        '+1 VE NHA!', '#10b981', 54,
      );
      engine.showCenterMessage(
        `<span style="font-size:2em">\u{1F3E0}</span><br>Ve nha an toan! (${roundCount}/${lv.target})`,
        800,
      );
      // Reset character for next crossing
      respawnCharacter(engine, lv);
    }

    // --- check if fallen below screen ---
    if (character.y > H + 40) {
      handleFall(engine, lv);
    }

    function handleFall(engine, lv) {
      lives--;
      engine.audio.playWrong();

      // Water splash particles at last known x
      const splashX = character.x;
      const splashY = groundY;
      for (let i = 0; i < 14; i++) {
        splashParticles.push({
          x: splashX + (Math.random() - 0.5) * 30,
          y: splashY,
          vx: (Math.random() - 0.5) * 6,
          vy: -2 - Math.random() * 6,
          life: 30 + Math.random() * 20,
          color: `hsl(${200 + Math.random() * 20}, 80%, ${55 + Math.random() * 20}%)`,
        });
      }
      engine.addParticles(splashX, splashY, '#3b82f6', 12);
      engine.addFloatingText(
        splashX, splashY - 30,
        'ROI XUONG SONG!', '#ef4444', 48,
      );

      if (lives <= 0) {
        // Game over — force time up
        engine.state.running = false;
        engine.state.ended = true;
        engine.audio.playLose();
        engine.showCenterMessage(
          `<span style="font-size:2em">\u{1F4A7}</span><br>Het mang roi!`,
          1500,
        );
        if (engine.currentGame && engine.currentGame.onLose) {
          // already called from checkWinLose path, but we end directly here
        }
      } else {
        engine.showCenterMessage(
          `<span style="font-size:1.6em">\u{1F4A6}</span><br>Roi xuong song! Con ${lives} mang`,
          700,
        );
        respawnTimer = 50; // ~0.8s pause before respawn
      }
    }
  },

  // ===== render frame =====

  draw(engine) {
    if (!character) return;
    const lv = engine.getLevel();
    const { W, H } = engine;
    const ctx = engine.renderer.ctx;
    const objects = engine.camera.getObjects();
    const groundY = H * 0.82;
    const gaps = getGapRegions(engine, lv);

    // --- background ---
    engine.renderer.clear(lv.bg);
    engine.renderer.drawGrid(lv.gridAlpha, 70);

    // --- draw water in gaps ---
    for (const gap of gaps) {
      ctx.save();
      // Deep water fill
      const waterGrad = ctx.createLinearGradient(0, groundY, 0, H);
      waterGrad.addColorStop(0, 'rgba(20, 80, 160, 0.6)');
      waterGrad.addColorStop(0.4, 'rgba(15, 50, 120, 0.7)');
      waterGrad.addColorStop(1, 'rgba(5, 20, 60, 0.8)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(gap.left, groundY, gap.right - gap.left, H - groundY);

      // Animated waves on top
      ctx.beginPath();
      ctx.moveTo(gap.left, groundY);
      for (let wx = gap.left; wx <= gap.right; wx += 4) {
        const waveY = groundY + Math.sin(wavePhase + wx * 0.03) * 4
                              + Math.sin(wavePhase * 1.3 + wx * 0.05) * 2;
        ctx.lineTo(wx, waveY);
      }
      ctx.lineTo(gap.right, groundY + 12);
      ctx.lineTo(gap.left, groundY + 12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(60, 160, 240, 0.35)';
      ctx.fill();

      // Wave highlights
      ctx.beginPath();
      for (let wx = gap.left + 10; wx < gap.right - 10; wx += 28) {
        const waveY = groundY + Math.sin(wavePhase * 0.8 + wx * 0.04) * 3;
        ctx.moveTo(wx, waveY + 2);
        ctx.lineTo(wx + 12, waveY);
      }
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // --- draw ground segments ---
    for (const seg of groundSegments) {
      const segLeft = seg.x - seg.w / 2;
      const segTop = seg.y - seg.h / 2;
      ctx.save();

      // Main ground fill
      const groundGrad = ctx.createLinearGradient(0, segTop, 0, segTop + seg.h);
      groundGrad.addColorStop(0, '#2d5a27');
      groundGrad.addColorStop(0.15, '#1e4620');
      groundGrad.addColorStop(1, '#0f2b12');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(segLeft, segTop, seg.w, seg.h);

      // Grass edge on top
      ctx.beginPath();
      ctx.moveTo(segLeft, segTop);
      for (let gx = segLeft; gx <= segLeft + seg.w; gx += 6) {
        const grassH = 3 + Math.sin(gx * 0.15 + wavePhase * 0.5) * 2;
        ctx.lineTo(gx, segTop - grassH);
        ctx.lineTo(gx + 3, segTop);
      }
      ctx.closePath();
      ctx.fillStyle = '#3a8a30';
      ctx.fill();

      // Top edge highlight
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(segLeft, segTop);
      ctx.lineTo(segLeft + seg.w, segTop);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // A few dirt dots for texture
      ctx.fillStyle = 'rgba(90, 60, 30, 0.3)';
      for (let i = 0; i < seg.w / 40; i++) {
        const dx = segLeft + 10 + ((i * 37 + 13) % (seg.w - 20));
        const dy = segTop + 15 + ((i * 23 + 7) % Math.max(1, seg.h - 20));
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // --- draw camera-detected platforms ---
    const colorKey = engine.camera.settings.color;
    const frozen = engine.camera.frozen;
    for (let i = 0; i < objects.length; i++) {
      engine.renderer.drawPlatform(objects[i], i, colorKey, frozen);
      // Draw a small bridge label
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = "bold 11px 'Orbitron',system-ui";
      ctx.textAlign = 'center';
      ctx.fillText(
        `${frozen ? 'KHOA' : 'CAU'} ${i + 1}`,
        objects[i].x,
        objects[i].y + 4,
      );
      ctx.restore();
    }

    // --- draw moving obstacle (level 3) ---
    if (lv.hasObstacle && obstacleX > 0) {
      const obstY = groundY - 55;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ef4444';
      engine.renderer.drawEmoji('\u{1FAA8}', obstacleX, obstY, 32);  // rock emoji
      ctx.shadowBlur = 0;
      // Danger indicator
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(obstacleX, obstY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- draw start marker ---
    ctx.save();
    engine.renderer.drawEmoji('\u{1F6A9}', startRect.x, startRect.y - 10, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = "bold 11px 'Orbitron',system-ui";
    ctx.textAlign = 'center';
    ctx.fillText('XUAT PHAT', startRect.x, startRect.y - 36);
    ctx.restore();

    // --- draw home ---
    ctx.save();
    engine.renderer.drawEmoji('\u{1F3E0}', homeRect.x, homeRect.y - 10, 36);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = "bold 12px 'Orbitron',system-ui";
    ctx.textAlign = 'center';
    ctx.fillText('NHA', homeRect.x, homeRect.y - 40);
    // Glow around home
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fbbf24';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(homeRect.x, homeRect.y - 10, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // --- draw direction arrow ---
    if (character.onGround && respawnTimer === 0) {
      const arrowStartX = character.x + 25;
      const arrowEndX = character.x + 55;
      const arrowY = character.y - 5;
      engine.renderer.drawArrow(arrowStartX, arrowY, arrowEndX, arrowY);
    }

    // --- draw character ---
    if (respawnTimer === 0) {
      ctx.save();
      // Slight bob when walking on ground
      const bob = character.onGround ? Math.sin(performance.now() * 0.008) * 3 : 0;
      engine.renderer.drawEmoji(character.emoji, character.x, character.y + bob, 38);
      ctx.restore();
    } else {
      // Blinking respawn indicator
      if (Math.floor(respawnTimer / 6) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        engine.renderer.drawEmoji(character.emoji, engine.W * 0.06, groundY - 20, 38);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // --- draw local splash particles ---
    ctx.save();
    for (const sp of splashParticles) {
      ctx.globalAlpha = Math.max(0, sp.life / 50);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // --- draw lives (hearts) at top-left ---
    ctx.save();
    ctx.font = '26px serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < lv.lives; i++) {
      const heart = i < lives ? '\u{2764}\u{FE0F}' : '\u{1F5A4}';
      ctx.fillText(heart, 16 + i * 34, 36);
    }
    ctx.restore();

    // --- draw round progress ---
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = "bold 15px 'Orbitron',system-ui";
    ctx.textAlign = 'left';
    ctx.fillText(`Lan qua: ${roundCount} / ${lv.target}`, 16, 66);
    ctx.restore();

    // --- draw remaining time ---
    const remaining = engine.getRemaining();
    ctx.save();
    ctx.fillStyle = remaining <= 10 ? '#ef4444' : 'rgba(255,255,255,0.6)';
    ctx.font = "bold 14px 'Orbitron',system-ui";
    ctx.textAlign = 'right';
    ctx.fillText(`${remaining}s`, W - 16, 36);
    ctx.restore();
  },

  // ===== win / lose =====

  onWin(engine) {
    // Celebration burst around home
    if (homeRect) {
      for (let i = 0; i < 6; i++) {
        engine.addParticles(
          homeRect.x + (Math.random() - 0.5) * 60,
          homeRect.y - 20,
          i % 2 === 0 ? '#f59e0b' : '#10b981', 18,
        );
      }
    }
    engine.addFloatingText(
      engine.W / 2, engine.H / 2 - 40,
      'TUYET VOI!', '#fbbf24', 80,
    );
  },

  onLose(_engine) {
    // Engine already shows HET GIO or we showed Het mang
  },

  cleanup() {
    character = null;
    groundSegments = [];
    homeRect = null;
    startRect = null;
    splashParticles = [];
    roundCount = 0;
    lives = 3;
    respawnTimer = 0;
    wavePhase = 0;
    obstacleX = 0;
    obstacleDir = 1;
  },
};
