// ============================================================
// CAMELIAS FC — Game Engine
// ============================================================

// ── CONSTANTS ────────────────────────────────────────────────
const FIELD = {
  logicalW: 1050,
  logicalH: 680,
  goalW: 120,
  goalDepth: 24,
  cornerR: 60,
  penaltyW: 320,
  penaltyH: 160,
  centerR: 90,
  lineW: 3
};

const PHYS = {
  playerRadius: 18,
  ballRadius: 10,
  friction: 0.982,
  maxBallSpeed: 900,
  playerSpeed: 175,
  kickForce: 600,
  kickRange: 40,
  kickCooldown: 0.45,
  saveRange: 54        // base GK range multiplier base
};

const MATCH = {
  halfDuration: 180,   // seconds per half (3 min each)
  aiTickRate: 0.06,    // AI recalculates every N seconds
  goalResetDelay: 2.2  // seconds before kick-off after goal
};

// Colour palette mirrored from CSS
const CLR = {
  fieldDark:  '#1a5c2a',
  fieldLight: '#1e6830',
  line:       '#ffffff',
  homeShirt:  '#1a4fff',
  awayShirt:  '#cc2200',
  ball:       '#ffffff',
  bgDark:     '#03050f',
  gold:       '#ffd700',
  highlight:  '#4d80ff'
};

// ── STATE ─────────────────────────────────────────────────────
let appState = 'menu';     // menu | select | game | gameover | pause
let selectedCharId = null;
let prevState = null;

// Game runtime (populated in startGame)
let G = null;

// DOM references (populated in init())
let els;

// Input
const keys = {};

const touchState = {
  joystick: { active: false, touchId: null, dx: 0, dy: 0 },
  kick: false,
  specialFired: false,
  ultimateFired: false,
};

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('load', () => {
  els = {
    screens: {
      menu:     document.getElementById('screen-menu'),
      select:   document.getElementById('screen-select'),
      game:     document.getElementById('screen-game'),
      gameover: document.getElementById('screen-gameover'),
      pause:    document.getElementById('screen-pause')
    },
    charGrid:      document.getElementById('char-grid'),
    detailPanel:   document.getElementById('detail-panel'),
    btnPlay:       document.getElementById('btn-play'),
    btnChars:      document.getElementById('btn-chars'),
    btnBack:       document.getElementById('btn-back'),
    btnStart:      document.getElementById('btn-start'),
    btnPlayAgain:  document.getElementById('btn-play-again'),
    btnMainMenu:   document.getElementById('btn-main-menu'),
    btnResume:     document.getElementById('btn-resume'),
    btnQuit:       document.getElementById('btn-quit'),
    scoreHome:     document.getElementById('score-home'),
    scoreAway:     document.getElementById('score-away'),
    timerDisplay:  document.getElementById('timer-display'),
    halfLabel:     document.getElementById('half-label'),
    specialBar:    document.getElementById('special-bar'),
    ultimateBar:   document.getElementById('ultimate-bar'),
    specialName:   document.getElementById('special-name'),
    ultimateName:  document.getElementById('ultimate-name'),
    specialActive: document.getElementById('special-active'),
    ultimateActive:document.getElementById('ultimate-active'),
    pHudNum:       document.getElementById('p-hud-num'),
    pHudName:      document.getElementById('p-hud-name'),
    pHudRole:      document.getElementById('p-hud-role'),
    goalFlash:     document.getElementById('goal-flash'),
    goalFlashText: document.getElementById('goal-flash-text'),
    goalFlashScorer:document.getElementById('goal-flash-scorer'),
    resultText:    document.getElementById('result-text'),
    finalScore:    document.getElementById('final-score'),
    kickoffOverlay:document.getElementById('kickoff-overlay'),
    kickoffText:   document.getElementById('kickoff-text')
  };

  setupEvents();
  setupTouchControls();
  buildCharGrid();
  window.addEventListener('resize', () => { resize3D(); });
  window.addEventListener('orientationchange', () => setTimeout(resize3D, 100));

  showScreen('menu');
});


// ── SCREEN MANAGEMENT ─────────────────────────────────────────
function showScreen(name) {
  Object.values(els.screens).forEach(s => s.classList.remove('active'));
  if (els.screens[name]) els.screens[name].classList.add('active');
  appState = name;
}

// ── EVENTS ────────────────────────────────────────────────────
function setupEvents() {
  els.btnPlay.addEventListener('click', () => showScreen('select'));
  els.btnChars.addEventListener('click', () => showScreen('select'));
  els.btnBack.addEventListener('click', () => { selectedCharId = null; refreshDetail(); showScreen('menu'); });
  els.btnStart.addEventListener('click', () => {
    if (selectedCharId !== null) startGame(selectedCharId);
  });
  els.btnPlayAgain.addEventListener('click', () => {
    showScreen('select');
  });
  els.btnMainMenu.addEventListener('click', () => {
    selectedCharId = null;
    refreshDetail();
    showScreen('menu');
  });
  els.btnResume.addEventListener('click', resumeGame);
  els.btnQuit.addEventListener('click', () => {
    if (G) G = null;
    showScreen('menu');
  });

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
      if (appState === 'game') pauseGame();
      else if (appState === 'pause') resumeGame();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
}

// ── TOUCH CONTROLS ────────────────────────────────────────────
function setupTouchControls() {
  const zone       = document.getElementById('joystick-zone');
  const knob       = document.getElementById('joystick-knob');
  const btnKick    = document.getElementById('touch-btn-kick');
  const btnSpecial = document.getElementById('touch-btn-special');
  const btnUltimate= document.getElementById('touch-btn-ultimate');
  const btnPause   = document.getElementById('touch-pause-btn');

  if (!zone) return;

  // Joystick – touchstart anywhere in the zone
  zone.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchState.joystick.active  = true;
    touchState.joystick.touchId = t.identifier;
    moveKnob(t.clientX, t.clientY, knob);
  }, { passive: false });

  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.joystick.touchId) moveKnob(t.clientX, t.clientY, knob);
    }
  }, { passive: false });

  const resetJoystick = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.joystick.touchId) {
        touchState.joystick.active  = false;
        touchState.joystick.touchId = null;
        touchState.joystick.dx      = 0;
        touchState.joystick.dy      = 0;
        knob.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
  zone.addEventListener('touchend',    resetJoystick);
  zone.addEventListener('touchcancel', resetJoystick);

  // Kick – held down
  btnKick.addEventListener('touchstart', e => {
    e.preventDefault();
    touchState.kick = true;
    btnKick.classList.add('pressing');
  }, { passive: false });
  const stopKick = () => { touchState.kick = false; btnKick.classList.remove('pressing'); };
  btnKick.addEventListener('touchend',    stopKick);
  btnKick.addEventListener('touchcancel', stopKick);

  // Special – one-shot on press
  btnSpecial.addEventListener('touchstart', e => {
    e.preventDefault();
    touchState.specialFired = true;
  }, { passive: false });

  // Ultimate – one-shot on press
  btnUltimate.addEventListener('touchstart', e => {
    e.preventDefault();
    touchState.ultimateFired = true;
  }, { passive: false });

  // Mobile pause button
  btnPause.addEventListener('touchstart', e => {
    e.preventDefault();
    if (appState === 'game') pauseGame();
    else if (appState === 'pause') resumeGame();
  }, { passive: false });
}

function moveKnob(clientX, clientY, knob) {
  const base = document.getElementById('joystick-base');
  const rect = base.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;

  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist   = Math.sqrt(dx * dx + dy * dy);
  const maxDist = rect.width * 0.38;

  if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
  }

  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  const norm = dist > 0 ? Math.min(1, dist / maxDist) : 0;
  const dead = 0.12;
  touchState.joystick.dx = norm > dead ? dx / maxDist : 0;
  touchState.joystick.dy = norm > dead ? dy / maxDist : 0;
}

// ── CHARACTER SELECT GRID ─────────────────────────────────────
function buildCharGrid() {
  const grid = els.charGrid;
  grid.innerHTML = '';

  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'char-card' + (c.unlocked ? '' : ' locked');
    card.dataset.id = c.id;

    const roleInfo = ROLES[c.role];

    // Avatar circle with canvas drawing
    const avatarCanvas = document.createElement('canvas');
    avatarCanvas.width  = 70;
    avatarCanvas.height = 70;
    avatarCanvas.className = 'char-avatar-canvas';
    drawCharacterAvatar(avatarCanvas.getContext('2d'), c, 35, 35, 30, c.unlocked);

    const numBadge = document.createElement('div');
    numBadge.className = 'char-number';
    numBadge.textContent = c.id;

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'char-avatar';
    avatarWrap.style.width = '70px';
    avatarWrap.style.height = '70px';
    avatarWrap.appendChild(avatarCanvas);
    avatarWrap.appendChild(numBadge);

    const name = document.createElement('div');
    name.className = 'char-name';
    name.textContent = c.unlocked ? c.name : (c.name === '???' ? '???' : '???');

    const role = document.createElement('div');
    role.className = 'char-role-badge';
    role.textContent = c.unlocked ? roleInfo.abbr : '???';
    if (c.unlocked) role.style.color = roleInfo.color;

    card.appendChild(avatarWrap);
    card.appendChild(name);
    card.appendChild(role);

    if (!c.unlocked) {
      const lock = document.createElement('div');
      lock.className = 'lock-overlay';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    card.addEventListener('click', () => {
      if (!c.unlocked) return;
      selectedCharId = c.id;
      grid.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
      els.btnStart.disabled = false;
      refreshDetail(c);
    });

    grid.appendChild(card);
  });
}

function refreshDetail(c) {
  const panel = els.detailPanel;
  if (!c) {
    panel.innerHTML = '<div class="detail-empty">Select a character<br>to see details</div>';
    return;
  }
  const role = ROLES[c.role];
  const ab = c.abilities;

  panel.innerHTML = `
    <div>
      <div class="detail-name">${c.name}</div>
      <div class="detail-role" style="color:${role.color}">${role.label} · #${c.id}</div>
    </div>
    <div class="stats-section">
      <div class="section-title">Stats</div>
      ${statRow('Speed',   c.stats.speed)}
      ${statRow('Shoot',   c.stats.shooting)}
      ${statRow('Defense', c.stats.defense)}
      ${statRow('Pass',    c.stats.passing)}
    </div>
    <div>
      <div class="section-title">Abilities</div>
      <div class="ability-card" style="margin-bottom:0.6rem">
        <div class="ability-type special">Special · [Q/S btn] · charges over time</div>
        <div class="ability-card-name">${ab.special.name}</div>
        <div class="ability-card-desc">${ab.special.description}</div>
      </div>
      <div class="ability-card">
        <div class="ability-type ultimate">Ultimate · [E/U btn] · charges by ${role.ultimateTrigger}s</div>
        <div class="ability-card-name">${ab.ultimate.name}</div>
        <div class="ability-card-desc">${ab.ultimate.description}</div>
      </div>
    </div>
  `;
}

function statRow(label, val) {
  return `
    <div class="stat-row">
      <div class="stat-label">${label}</div>
      <div class="stat-track"><div class="stat-fill" style="width:${val}%"></div></div>
      <div class="stat-val">${val}</div>
    </div>`;
}

// ── DRAW CHARACTER AVATAR ─────────────────────────────────────
function drawCharacterAvatar(ctx2, c, cx, cy, r, colored) {
  const skin  = colored ? c.skinColor  : '#3a3a55';
  const hair  = colored ? c.hairColor  : '#1a1a2e';
  const shirt = colored ? c.shirtColor : '#222233';

  // Body / shirt
  ctx2.beginPath();
  ctx2.arc(cx, cy + r * 0.6, r * 0.85, Math.PI, 0, false);
  ctx2.fillStyle = shirt;
  ctx2.fill();

  // Head
  ctx2.beginPath();
  ctx2.arc(cx, cy - r * 0.08, r * 0.52, 0, Math.PI * 2);
  ctx2.fillStyle = skin;
  ctx2.fill();

  // Hair cap
  ctx2.beginPath();
  ctx2.arc(cx, cy - r * 0.08, r * 0.52, Math.PI, 0, false);
  ctx2.fillStyle = hair;
  ctx2.fill();

  // Eyes
  if (colored) {
    ctx2.beginPath();
    ctx2.arc(cx - r * 0.16, cy - r * 0.04, r * 0.07, 0, Math.PI * 2);
    ctx2.arc(cx + r * 0.16, cy - r * 0.04, r * 0.07, 0, Math.PI * 2);
    ctx2.fillStyle = '#222';
    ctx2.fill();
  }

  // Outer ring glow
  ctx2.beginPath();
  ctx2.arc(cx, cy, r, 0, Math.PI * 2);
  ctx2.strokeStyle = colored ? '#1a3dc4' : '#1a1a2e';
  ctx2.lineWidth = 2.5;
  ctx2.stroke();
}

// ── START GAME ────────────────────────────────────────────────
function startGame(charId) {
  const charData = CHARACTERS.find(c => c.id === charId);
  if (!charData) return;

  cleanup3D();
  G = buildGameState(charData);

  // Update HUD labels
  els.pHudNum.textContent  = '#' + charData.id;
  els.pHudName.textContent = charData.name;
  els.pHudRole.textContent = ROLES[charData.role].label;
  els.specialName.textContent  = charData.abilities.special.name;
  els.ultimateName.textContent = charData.abilities.ultimate.name;

  showScreen('game');
  // Init 3D after the container is visible so dimensions are correct
  setTimeout(() => {
    init3D();
    resize3D();
    requestAnimationFrame(gameLoop);
    showKickoff('KICK-OFF!');
  }, 50);
}

function pauseGame() {
  if (!G) return;
  G.paused = true;
  showScreen('pause');
}

function resumeGame() {
  if (!G) return;
  G.paused = false;
  G.lastTimestamp = null;
  showScreen('game');
  requestAnimationFrame(gameLoop);
}

// ── BUILD INITIAL GAME STATE ──────────────────────────────────
function buildGameState(charData) {
  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const cx = fw / 2;
  const cy = fh / 2;

  // Deep-clone abilities so they don't mutate the CHARACTERS array
  const abilities = {
    special: { ...charData.abilities.special, charge: 0, active: false, activeTimer: 0, cooldown: 0 },
    ultimate:{ ...charData.abilities.ultimate, charge: 0, active: false, activeTimer: 0, autosavesLeft: 0 }
  };

  // Team formations: 1-2-1 (GK, 2 mid, 1 fwd) simplified
  const homePositions = [
    { x: cx * 0.22, y: cy },                        // GK (always slot 0)
    { x: cx * 0.6,  y: cy - fh * 0.22 },            // def-left
    { x: cx * 0.6,  y: cy + fh * 0.22 },            // def-right
    { x: cx * 0.9,  y: cy },                        // mid-center
    { x: cx * 1.15, y: cy }                         // attacker
  ];
  const awayPositions = [
    { x: fw - cx * 0.22, y: cy },
    { x: fw - cx * 0.6,  y: cy - fh * 0.22 },
    { x: fw - cx * 0.6,  y: cy + fh * 0.22 },
    { x: fw - cx * 0.9,  y: cy },
    { x: fw - cx * 1.15, y: cy }
  ];

  const homeTeam = homePositions.map((p, i) => {
    const isPlayer = (charData.id - 1) % 5 === i; // put player character in a slot
    return {
      id: i,
      team: 0,
      x: p.x, y: p.y,
      vx: 0, vy: 0,
      role: i === 0 ? 'GK' : (i < 3 ? 'DEF' : (i < 4 ? 'MID' : 'ATK')),
      isPlayer,
      hasBall: false,
      kickCooldown: 0,
      aiTimer: Math.random() * MATCH.aiTickRate,
      aiTarget: { x: p.x, y: p.y },
      speed: (charData.stats.speed / 100) * PHYS.playerSpeed * (isPlayer ? 1 : 0.88),
      abilities: isPlayer ? abilities : null,
      charData: isPlayer ? charData : null,
      // GK auto-save state
      autosaves: 0,
      // Effect flags
      speedBoostTimer: 0,
      ironWallTimer: 0,
      // Visual
      flash: 0,
      name: isPlayer ? charData.name : ['Teammate', 'Sidekick', 'Ally', 'Support'][i % 4]
    };
  });

  // Force player into slot 0 if GK, otherwise slot 4 if ATK, etc.
  // Simple override: always slot based on role
  const roleSlot = { GK: 0, DEF: 1, MID: 3, ATK: 4 };
  const pSlot = roleSlot[charData.role] ?? 4;
  homeTeam.forEach(p => p.isPlayer = false);
  homeTeam[pSlot].isPlayer = true;
  homeTeam[pSlot].abilities = abilities;
  homeTeam[pSlot].charData = charData;
  homeTeam[pSlot].speed = (charData.stats.speed / 100) * PHYS.playerSpeed;

  const awayTeam = awayPositions.map((p, i) => ({
    id: i + 10,
    team: 1,
    x: p.x, y: p.y,
    vx: 0, vy: 0,
    role: i === 0 ? 'GK' : (i < 3 ? 'DEF' : (i < 4 ? 'MID' : 'ATK')),
    isPlayer: false,
    hasBall: false,
    kickCooldown: 0,
    aiTimer: Math.random() * MATCH.aiTickRate,
    aiTarget: { x: p.x, y: p.y },
    speed: PHYS.playerSpeed * (0.82 + Math.random() * 0.12),
    abilities: null,
    charData: null,
    speedBoostTimer: 0,
    ironWallTimer: 0,
    autosaves: 0,
    flash: 0,
    name: ['Rivera', 'Santos', 'Costa', 'Perez', 'Gomez'][i]
  }));

  const allPlayers = [...homeTeam, ...awayTeam];

  return {
    paused: false,
    lastTimestamp: null,
    half: 1,
    timeLeft: MATCH.halfDuration,
    score: [0, 0],
    allPlayers,
    homeTeam,
    awayTeam,
    playerObj: homeTeam[pSlot],
    ball: { x: cx, y: cy, vx: 0, vy: 0 },
    homeStart: { x: cx * 0.22, y: cy },
    awayStart: { x: fw - cx * 0.22, y: cy },
    possession: null,    // player with ball
    kickoffTimer: 0,     // freeze timer after goal/half
    goalFlashTimer: 0,
    goalTeam: -1,
    matchOver: false,
    kickoffActive: false,
    visPhase: 0          // alternating field stripe phase
  };
}

// ── GAME LOOP ─────────────────────────────────────────────────
function gameLoop(ts) {
  if (appState !== 'game' || !G) return;
  if (G.paused) return;

  if (!G.lastTimestamp) G.lastTimestamp = ts;
  let dt = Math.min((ts - G.lastTimestamp) / 1000, 0.05);
  G.lastTimestamp = ts;

  update(dt);
  updateScene3D(G, dt);
  render3D();

  requestAnimationFrame(gameLoop);
}

// ── UPDATE ────────────────────────────────────────────────────
function update(dt) {
  if (G.kickoffTimer > 0) {
    G.kickoffTimer -= dt;
    if (G.kickoffTimer <= 0) G.kickoffActive = false;
    return;
  }

  updateTimer(dt);
  updatePlayerInput(dt);
  updateAI(dt);
  updatePhysics(dt);
  updateAbilities(dt);
  checkGoals();
  updateHUD();
}

function updateTimer(dt) {
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) {
    if (G.half === 1) {
      G.half = 2;
      G.timeLeft = MATCH.halfDuration;
      resetPositions();
      showKickoff('2ND HALF');
      G.kickoffTimer = 3;
    } else {
      G.matchOver = true;
      endMatch();
    }
  }
}

// ── PLAYER INPUT ──────────────────────────────────────────────
function updatePlayerInput(dt) {
  const p = G.playerObj;
  if (!p) return;

  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  // Touch joystick
  if (touchState.joystick.active) {
    dx += touchState.joystick.dx;
    dy += touchState.joystick.dy;
  }

  let spd = p.speed;
  if (p.abilities?.special.active && p.abilities.special.effect === 'atk_sprint') spd *= 2;
  if (p.speedBoostTimer > 0) spd *= 1.6;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    p.x += (dx / len) * spd * dt;
    p.y += (dy / len) * spd * dt;
  }

  // Kick (SPACE or touch)
  if ((keys['Space'] || keys['KeyK'] || touchState.kick) && p.kickCooldown <= 0) {
    const ball = G.ball;
    const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
    if (dist < PHYS.kickRange + PHYS.ballRadius + PHYS.playerRadius) {
      kick(p, ball, dx, dy);
      p.kickCooldown = PHYS.kickCooldown;
    }
  }
  if (p.kickCooldown > 0) p.kickCooldown -= dt;

  // Special ability [Q] or touch
  const wantsSpecial = keys['KeyQ'] || touchState.specialFired;
  if (wantsSpecial && !keys['_q_held']) {
    keys['_q_held'] = true;
    touchState.specialFired = false;
    activateSpecial(p);
  }
  if (!keys['KeyQ']) keys['_q_held'] = false;

  // Ultimate ability [E] or touch
  const wantsUltimate = keys['KeyE'] || touchState.ultimateFired;
  if (wantsUltimate && !keys['_e_held']) {
    keys['_e_held'] = true;
    touchState.ultimateFired = false;
    activateUltimate(p);
  }
  if (!keys['KeyE']) keys['_e_held'] = false;

  clampToField(p);
}

function kick(player, ball, inputDx, inputDy) {
  let tx = ball.x, ty = ball.y;

  // Direction: if player was moving, kick that way; else kick away from player
  let dx = inputDx, dy = inputDy;
  if (dx === 0 && dy === 0) {
    dx = ball.x - player.x;
    dy = ball.y - player.y;
  }
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= len; dy /= len;

  let force = PHYS.kickForce;
  // Power shot: double force, sets flag
  if (player.abilities?.ultimate.active && player.abilities.ultimate.effect === 'atk_power_shot') {
    force *= 2.2;
    player.abilities.ultimate.powerShot = true;
    player.abilities.ultimate.active = false;
    player.abilities.ultimate.charge = 0;
  }

  ball.vx = dx * force;
  ball.vy = dy * force;

  // Track possession change
  G.possession = player;

  // Check if dribble past enemy (ATK/MID ultimate trigger)
  if (player.isPlayer) {
    checkDribblePast(player);
  }
}

function checkDribblePast(player) {
  const enemies = G.allPlayers.filter(p => p.team !== player.team);
  const role = player.charData?.role;
  if (role !== 'ATK' && role !== 'MID') return;

  let pastEnemy = false;
  enemies.forEach(e => {
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (d < PHYS.playerRadius * 3.5) pastEnemy = true;
  });
  if (pastEnemy) {
    const ab = player.abilities.ultimate;
    if (ab.charge < ab.maxCharge) {
      ab.charge = Math.min(ab.maxCharge, ab.charge + (ab.chargePerTrigger ?? 25));
      player.flash = 0.3;
    }
  }
}

// ── AI ────────────────────────────────────────────────────────
function updateAI(dt) {
  G.allPlayers.forEach(p => {
    if (p.isPlayer) return;
    p.aiTimer -= dt;
    if (p.aiTimer > 0) return;
    p.aiTimer = MATCH.aiTickRate + Math.random() * 0.04;

    calcAITarget(p);
  });

  G.allPlayers.forEach(p => {
    if (p.isPlayer) return;
    moveTowardTarget(p, dt);
    tryAIKick(p);
    if (p.kickCooldown > 0) p.kickCooldown -= dt;
    clampToField(p);
  });
}

function calcAITarget(p) {
  const ball = G.ball;
  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const cx = fw / 2;
  const cy = fh / 2;

  const ownGoalX  = p.team === 0 ? 0       : fw;
  const enemyGoalX = p.team === 0 ? fw      : 0;

  const ballDist = Math.hypot(ball.x - p.x, ball.y - p.y);
  const ballIsOnMySide = p.team === 0 ? ball.x < cx : ball.x > cx;

  switch (p.role) {
    case 'GK': {
      // Stay near own goal, track ball height
      const goalX = ownGoalX === 0 ? FIELD.goalDepth * 2 : fw - FIELD.goalDepth * 2;
      const clampedY = Math.max(cy - FIELD.goalW * 0.55, Math.min(cy + FIELD.goalW * 0.55, ball.y));
      p.aiTarget = { x: goalX, y: clampedY };
      // Rush ball if it's very close to goal
      if (Math.abs(ball.x - ownGoalX) < fw * 0.2 && ballDist < fw * 0.25)
        p.aiTarget = { x: ball.x, y: ball.y };
      break;
    }
    case 'DEF': {
      if (ballIsOnMySide || Math.abs(ball.x - ownGoalX) < fw * 0.45) {
        // Chase ball
        p.aiTarget = { x: ball.x, y: ball.y };
      } else {
        // Hold mid-defensive position
        const defX = p.team === 0 ? cx * 0.55 : fw - cx * 0.55;
        p.aiTarget = { x: defX, y: ball.y * 0.6 + cy * 0.4 };
      }
      break;
    }
    case 'MID': {
      const midX = p.team === 0 ? cx * 0.9 : fw - cx * 0.9;
      if (ballDist < 200) {
        p.aiTarget = { x: ball.x, y: ball.y };
      } else {
        p.aiTarget = { x: midX, y: ball.y * 0.7 + cy * 0.3 };
      }
      break;
    }
    case 'ATK': {
      // Always press toward ball / goal
      if (ballDist < 300) {
        p.aiTarget = { x: ball.x, y: ball.y };
      } else {
        const atkX = p.team === 0 ? cx * 1.2 : fw - cx * 1.2;
        p.aiTarget = { x: atkX, y: cy + (Math.random() - 0.5) * fh * 0.3 };
      }
      break;
    }
  }
}

function moveTowardTarget(p, dt) {
  const dx = p.aiTarget.x - p.x;
  const dy = p.aiTarget.y - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return;
  let spd = p.speed;
  if (p.speedBoostTimer > 0) spd *= 1.5;
  const step = Math.min(spd * dt, dist);
  p.x += (dx / dist) * step;
  p.y += (dy / dist) * step;
}

function tryAIKick(p) {
  if (p.kickCooldown > 0) return;
  const ball = G.ball;
  const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
  if (dist > PHYS.kickRange + PHYS.ballRadius + PHYS.playerRadius) return;

  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const enemyGoalX = p.team === 0 ? fw : 0;
  const enemyGoalY = fh / 2;

  // Kick toward enemy goal with slight randomness
  let dx = enemyGoalX - ball.x + (Math.random() - 0.5) * 80;
  let dy = enemyGoalY - ball.y + (Math.random() - 0.5) * 80;
  const len = Math.sqrt(dx * dx + dy * dy);
  ball.vx = (dx / len) * PHYS.kickForce * (0.7 + Math.random() * 0.4);
  ball.vy = (dy / len) * PHYS.kickForce * (0.7 + Math.random() * 0.4);

  G.possession = p;
  p.kickCooldown = PHYS.kickCooldown * (0.8 + Math.random() * 0.4);

  // DEF ultimate trigger: tackle (ball taken from enemy)
  if (p.role === 'GK') {
    // GK "save" — ultimate handled in checkGoals
  }
}

// ── PHYSICS ───────────────────────────────────────────────────
function updatePhysics(dt) {
  const ball = G.ball;
  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const gy  = fh / 2;

  // Apply friction
  ball.vx *= Math.pow(PHYS.friction, dt * 60);
  ball.vy *= Math.pow(PHYS.friction, dt * 60);

  // Speed cap
  const spd = Math.hypot(ball.vx, ball.vy);
  if (spd > PHYS.maxBallSpeed) {
    ball.vx = (ball.vx / spd) * PHYS.maxBallSpeed;
    ball.vy = (ball.vy / spd) * PHYS.maxBallSpeed;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Wall bounce (top/bottom)
  if (ball.y - PHYS.ballRadius < 0) {
    ball.y = PHYS.ballRadius;
    ball.vy = Math.abs(ball.vy) * 0.7;
  }
  if (ball.y + PHYS.ballRadius > fh) {
    ball.y = fh - PHYS.ballRadius;
    ball.vy = -Math.abs(ball.vy) * 0.7;
  }

  // Goal areas: allow ball through the goal mouth (handled in checkGoals)
  // Left/right walls outside goal
  const goalTop    = gy - FIELD.goalW / 2;
  const goalBottom = gy + FIELD.goalW / 2;
  if (ball.x - PHYS.ballRadius < 0 && (ball.y < goalTop || ball.y > goalBottom)) {
    ball.x = PHYS.ballRadius;
    ball.vx = Math.abs(ball.vx) * 0.7;
  }
  if (ball.x + PHYS.ballRadius > fw && (ball.y < goalTop || ball.y > goalBottom)) {
    ball.x = fw - PHYS.ballRadius;
    ball.vx = -Math.abs(ball.vx) * 0.7;
  }

  // Player-ball collisions
  G.allPlayers.forEach(p => {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const minDist = PHYS.playerRadius + PHYS.ballRadius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist > 0) {
      // Push ball out
      const nx = dx / dist;
      const ny = dy / dist;
      ball.x = p.x + nx * minDist;
      ball.y = p.y + ny * minDist;

      // Reflect velocity
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
        ball.vx *= 0.6;
        ball.vy *= 0.6;
      }

      // DEF steal trigger: if player touches ball while enemy had possession
      if (p.isPlayer && G.possession && G.possession.team !== p.team) {
        const pData = p.charData;
        if (pData?.role === 'DEF') {
          const ab = p.abilities.ultimate;
          ab.charge = Math.min(ab.maxCharge, ab.charge + (ab.chargePerTrigger ?? 34));
          p.flash = 0.4;
        }
        G.possession = p;
      }
    }
  });

  // Player-player collisions (soft push)
  for (let i = 0; i < G.allPlayers.length; i++) {
    for (let j = i + 1; j < G.allPlayers.length; j++) {
      const a = G.allPlayers[i];
      const b = G.allPlayers[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minD = PHYS.playerRadius * 2;
      if (dist < minD && dist > 0) {
        const push = (minD - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        // Don't push the human player when iron wall active
        if (!(a.ironWallTimer > 0)) { a.x -= nx * push; a.y -= ny * push; }
        if (!(b.ironWallTimer > 0)) { b.x += nx * push; b.y += ny * push; }

        // Iron wall: nearby enemies lose the ball
        if (a.ironWallTimer > 0 && b.team !== a.team) {
          if (G.possession === b) { G.possession = null; ball.vx += nx * 200; ball.vy += ny * 200; }
        }
        if (b.ironWallTimer > 0 && a.team !== b.team) {
          if (G.possession === a) { G.possession = null; ball.vx -= nx * 200; ball.vy -= ny * 200; }
        }
      }
    }
  }

  // Clamp all
  G.allPlayers.forEach(p => clampToField(p));

  // Slide tackle effect (player ability)
  const pp = G.playerObj;
  if (pp?.abilities?.special.active && pp.abilities.special.effect === 'def_slide') {
    G.allPlayers.forEach(enemy => {
      if (enemy.team === pp.team) return;
      const d = Math.hypot(enemy.x - pp.x, enemy.y - pp.y);
      if (d < PHYS.playerRadius * 3) {
        // Steal ball
        if (G.possession === enemy) {
          G.possession = pp;
          const dx2 = pp.x - enemy.x, dy2 = pp.y - enemy.y;
          const len = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
          ball.vx = (dx2/len) * 200;
          ball.vy = (dy2/len) * 200;
        }
      }
    });
  }

  // Flash decay
  G.allPlayers.forEach(p => { if (p.flash > 0) p.flash -= dt * 2; });
}

function clampToField(p) {
  const margin = PHYS.playerRadius;
  p.x = Math.max(margin, Math.min(FIELD.logicalW - margin, p.x));
  p.y = Math.max(margin, Math.min(FIELD.logicalH - margin, p.y));
}

// ── CHECK GOALS ───────────────────────────────────────────────
function checkGoals() {
  const ball = G.ball;
  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const gy = fh / 2;
  const goalHalf = FIELD.goalW / 2;

  // GK autosave (ultimate effect)
  const gk = G.allPlayers.find(p => p.isPlayer && p.charData?.role === 'GK');
  if (gk && gk.abilities?.ultimate.active) {
    const d = Math.hypot(ball.x - gk.x, ball.y - gk.y);
    if (d < PHYS.saveRange * 2) {
      // Deflect ball
      const nx = (ball.x - gk.x) || 1;
      const ny = (ball.y - gk.y) || 0;
      const len = Math.sqrt(nx*nx + ny*ny);
      ball.vx = (nx/len) * PHYS.kickForce * 0.8;
      ball.vy = (ny/len) * PHYS.kickForce * 0.8;
      gk.abilities.ultimate.autosavesLeft--;
      if (gk.abilities.ultimate.autosavesLeft <= 0) {
        gk.abilities.ultimate.active = false;
        gk.abilities.ultimate.charge = 0;
      }
    }
  }

  // Left goal (team 1 scores)
  if (ball.x - PHYS.ballRadius < -FIELD.goalDepth && ball.y > gy - goalHalf && ball.y < gy + goalHalf) {
    // Check power shot bypass
    const isPowerShot = G.possession?.abilities?.ultimate?.powerShot;
    // GK save check (non-player GK)
    const homeGK = G.homeTeam[0];
    const saveR = PHYS.saveRange * (homeGK.abilities?.special.active && homeGK.abilities.special.effect === 'gk_save_radius' ? 3 : 1);
    const distGK = Math.hypot(ball.x - homeGK.x, ball.y - homeGK.y);

    if (!isPowerShot && distGK < saveR && homeGK.role === 'GK') {
      // AI GK saved
      ball.vx = Math.abs(ball.vx) * 0.9;
      ball.x = FIELD.goalDepth;
      // GK ultimate charge for player GK
      if (gk) {
        gk.abilities.ultimate.charge = Math.min(100, gk.abilities.ultimate.charge + (gk.abilities.ultimate.chargePerTrigger ?? 33));
      }
    } else {
      scoreGoal(1);
      if (G.possession?.abilities?.ultimate) G.possession.abilities.ultimate.powerShot = false;
    }
    return;
  }

  // Right goal (team 0 scores)
  if (ball.x + PHYS.ballRadius > fw + FIELD.goalDepth && ball.y > gy - goalHalf && ball.y < gy + goalHalf) {
    const isPowerShot = G.possession?.abilities?.ultimate?.powerShot;
    scoreGoal(0);
    if (G.possession?.abilities?.ultimate) G.possession.abilities.ultimate.powerShot = false;
    return;
  }
}

function scoreGoal(team) {
  G.score[team]++;
  G.goalTeam = team;
  G.goalFlashTimer = MATCH.goalResetDelay;
  G.kickoffTimer = MATCH.goalResetDelay;

  // Show flash
  els.goalFlash.classList.add('show');
  els.goalFlashText.textContent = 'GOAL!';
  els.goalFlashText.className = 'goal-flash-text ' + (team === 0 ? 'home' : 'away');
  const scorer = team === 0 ? G.playerObj?.charData?.name ?? 'Home' : 'Rival';
  els.goalFlashScorer.textContent = scorer;

  setTimeout(() => {
    els.goalFlash.classList.remove('show');
    resetPositions();
  }, MATCH.goalResetDelay * 1000);

  // Update score
  els.scoreHome.textContent = G.score[0];
  els.scoreAway.textContent = G.score[1];
}

function resetPositions() {
  const fw = FIELD.logicalW;
  const fh = FIELD.logicalH;
  const cx = fw / 2;
  const cy = fh / 2;

  G.ball.x = cx; G.ball.y = cy;
  G.ball.vx = 0; G.ball.vy = 0;
  G.possession = null;

  const homePos = [
    { x: cx*0.22, y: cy },
    { x: cx*0.6,  y: cy - fh*0.22 },
    { x: cx*0.6,  y: cy + fh*0.22 },
    { x: cx*0.9,  y: cy },
    { x: cx*1.1,  y: cy }
  ];
  const awayPos = [
    { x: fw-cx*0.22, y: cy },
    { x: fw-cx*0.6,  y: cy - fh*0.22 },
    { x: fw-cx*0.6,  y: cy + fh*0.22 },
    { x: fw-cx*0.9,  y: cy },
    { x: fw-cx*1.1,  y: cy }
  ];
  G.homeTeam.forEach((p, i) => { p.x = homePos[i].x; p.y = homePos[i].y; });
  G.awayTeam.forEach((p, i) => { p.x = awayPos[i].x; p.y = awayPos[i].y; });
}

// ── ABILITIES ─────────────────────────────────────────────────
function updateAbilities(dt) {
  const p = G.playerObj;
  if (!p || !p.abilities) return;

  const sp = p.abilities.special;
  const ul = p.abilities.ultimate;

  // Special: charge over time
  if (!sp.active && sp.cooldown <= 0) {
    sp.charge = Math.min(sp.maxCharge, sp.charge + sp.chargeRate * dt);
  }
  if (sp.cooldown > 0) sp.cooldown -= dt;

  // Special active timer
  if (sp.active) {
    sp.activeTimer -= dt;
    if (sp.activeTimer <= 0) {
      sp.active = false;
      sp.activeTimer = 0;
      sp.cooldown = sp.cooldownMax ?? 2;
    }
  }

  // Ultimate active timer
  if (ul.active) {
    ul.activeTimer -= dt;
    if (ul.activeTimer <= 0 && ul.effect !== 'atk_power_shot' && ul.effect !== 'mid_vision_pass') {
      ul.active = false;
      ul.activeTimer = 0;
      ul.charge = 0;
    }
  }

  // Speed boost from MID playmaker
  if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;

  // Iron wall timer
  if (p.ironWallTimer > 0) {
    p.ironWallTimer -= dt;
    if (p.ironWallTimer <= 0) {
      p.ironWallTimer = 0;
    }
  }

  // GK enhance save radius on special
  if (p.charData?.role === 'GK' && sp.active) {
    // Effect handled in checkGoals / physics
  }
}

function activateSpecial(p) {
  if (!p.abilities) return;
  const sp = p.abilities.special;
  if (sp.charge < sp.maxCharge || sp.active || sp.cooldown > 0) return;

  sp.active = true;
  sp.charge = 0;
  sp.activeTimer = sp.duration || 3;

  // Instant effects
  switch (sp.effect) {
    case 'def_slide':
      // Brief speed burst toward ball
      const ball = G.ball;
      const dx = ball.x - p.x, dy = ball.y - p.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      p.x += (dx/len) * 80;
      p.y += (dy/len) * 80;
      clampToField(p);
      break;
    case 'mid_vision_pass':
      // Handled in kick
      break;
  }
}

function activateUltimate(p) {
  if (!p.abilities) return;
  const ul = p.abilities.ultimate;
  if (ul.charge < ul.maxCharge || ul.active) return;

  ul.active = true;
  ul.activeTimer = ul.duration || 4;

  switch (ul.effect) {
    case 'gk_auto_save':
      ul.autosavesLeft = 2;
      break;
    case 'def_iron_wall':
      p.ironWallTimer = ul.duration || 5;
      break;
    case 'mid_playmaker':
      G.homeTeam.forEach(tm => { if (!tm.isPlayer) tm.speedBoostTimer = ul.duration || 6; });
      p.speedBoostTimer = ul.duration || 6;
      break;
    case 'atk_power_shot':
      ul.powerShot = false; // set when kicked
      break;
    case 'atk_sprint':
      break; // effect in input
  }
}

// ── HUD UPDATE ────────────────────────────────────────────────
function updateHUD() {
  // Timer
  const t = Math.max(0, G.timeLeft);
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  els.timerDisplay.textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
  els.halfLabel.textContent = G.half === 1 ? '1ST HALF' : '2ND HALF';

  // Score
  els.scoreHome.textContent = G.score[0];
  els.scoreAway.textContent = G.score[1];

  // Ability bars
  const p = G.playerObj;
  if (!p?.abilities) return;
  const sp = p.abilities.special;
  const ul = p.abilities.ultimate;

  const spPct = (sp.charge / sp.maxCharge) * 100;
  const ulPct = (ul.charge / ul.maxCharge) * 100;

  els.specialBar.style.width  = spPct + '%';
  els.ultimateBar.style.width = ulPct + '%';

  if (spPct >= 100) els.specialBar.classList.add('full');
  else els.specialBar.classList.remove('full');

  if (ulPct >= 100) els.ultimateBar.classList.add('full');
  else els.ultimateBar.classList.remove('full');

  // Active indicators
  if (sp.active) {
    els.specialActive.textContent = 'ACTIVE!';
    els.specialActive.classList.add('visible');
  } else {
    els.specialActive.classList.remove('visible');
  }
  if (ul.active) {
    els.ultimateActive.textContent = 'ACTIVE!';
    els.ultimateActive.classList.add('visible');
  } else {
    els.ultimateActive.classList.remove('visible');
  }
}

// ── MATCH END ─────────────────────────────────────────────────
function endMatch() {
  const [home, away] = G.score;
  let resultText, cls;
  if (home > away)  { resultText = 'VICTORY!'; cls = 'win'; }
  else if (home < away) { resultText = 'DEFEAT'; cls = 'lose'; }
  else              { resultText = 'DRAW'; cls = 'draw'; }

  els.resultText.textContent = resultText;
  els.resultText.className = 'gameover-result ' + cls;
  els.finalScore.textContent = home + ' – ' + away;

  setTimeout(() => showScreen('gameover'), 1200);
}

// ── KICKOFF OVERLAY ───────────────────────────────────────────
function showKickoff(text) {
  const el = els.kickoffOverlay;
  const t  = els.kickoffText;
  t.textContent = text;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

