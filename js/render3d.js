// ============================================================
// CAMELIAS FC — 3D Rendering Layer (Three.js)
// ============================================================

const SCALE3D = 1 / 100;

let _scene, _camera, _renderer;
let _ballGroup = null;
let _playerMeshes = new Map(); // player id → { group, lLeg, rLeg }
let _ready = false;
let _animClock = 0;
let _cameraView = 'third'; // 'third' | 'first'
let _playerFacingAngle = 0;

function wx(gx) { return (gx - FIELD.logicalW / 2) * SCALE3D; }
function wz(gy) { return (gy - FIELD.logicalH / 2) * SCALE3D; }

// ── INIT ──────────────────────────────────────────────────────
function init3D() {
  const container = document.getElementById('game-canvas-container');
  if (!container || typeof THREE === 'undefined') return;

  const w = container.clientWidth  || window.innerWidth;
  const h = container.clientHeight || Math.max(300, window.innerHeight - 130);

  _renderer = new THREE.WebGLRenderer({ antialias: true });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.setSize(w, h);
  _renderer.domElement.style.display = 'block';
  _renderer.domElement.style.width  = '100%';
  _renderer.domElement.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(_renderer.domElement);

  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0x020c03);
  _scene.fog = new THREE.Fog(0x020c03, 22, 38);

  _camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 100);
  _camera.position.set(0, 2.5, 3.5);
  _camera.lookAt(0, 0, 0);

  // Lighting
  _scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(4, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near   =  1;
  sun.shadow.camera.far    = 40;
  sun.shadow.camera.left   = -8;
  sun.shadow.camera.right  =  8;
  sun.shadow.camera.top    =  6;
  sun.shadow.camera.bottom = -6;
  _scene.add(sun);

  [[-7, 5, -4], [7, 5, 4], [-7, 5, 4], [7, 5, -4]].forEach(([x, y, z]) => {
    const fl = new THREE.PointLight(0xaaccff, 0.28, 18);
    fl.position.set(x, y, z);
    _scene.add(fl);
  });

  _buildField3D();
  _buildGoals3D();
  _buildBall3D();

  _ready = true;
}

// ── FIELD ─────────────────────────────────────────────────────
function _buildField3D() {
  const fw = FIELD.logicalW * SCALE3D;
  const fh = FIELD.logicalH * SCALE3D;
  const stripes = 14;
  const sw = fw / stripes;

  for (let i = 0; i < stripes; i++) {
    const mat = new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x1a5c2a : 0x1e6830 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, fh), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(-fw / 2 + sw * (i + 0.5), 0, 0);
    m.receiveShadow = true;
    _scene.add(m);
  }

  // Field lines via canvas texture
  const cw = 2048;
  const ch = Math.round(cw * (FIELD.logicalH / FIELD.logicalW));
  const lc = document.createElement('canvas');
  lc.width = cw; lc.height = ch;
  const c = lc.getContext('2d');
  const sx = cw / FIELD.logicalW;
  const sy = ch / FIELD.logicalH;
  const fcx = FIELD.logicalW / 2;
  const fcy = FIELD.logicalH / 2;

  c.strokeStyle = 'rgba(255,255,255,0.92)';
  c.lineWidth = 5;
  c.strokeRect(3, 3, cw - 6, ch - 6);
  c.beginPath(); c.moveTo(fcx * sx, 0); c.lineTo(fcx * sx, ch); c.stroke();
  c.beginPath(); c.arc(fcx * sx, fcy * sy, FIELD.centerR * sx, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(fcx * sx, fcy * sy, 5 * sx, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.92)'; c.fill();
  c.strokeRect(0, (fcy - FIELD.penaltyH / 2) * sy, FIELD.penaltyW * sx, FIELD.penaltyH * sy);
  c.strokeRect((FIELD.logicalW - FIELD.penaltyW) * sx, (fcy - FIELD.penaltyH / 2) * sy, FIELD.penaltyW * sx, FIELD.penaltyH * sy);
  c.strokeRect(0, (fcy - FIELD.goalW * 0.6) * sy, FIELD.penaltyW * 0.35 * sx, FIELD.goalW * 1.2 * sy);
  c.strokeRect((FIELD.logicalW - FIELD.penaltyW * 0.35) * sx, (fcy - FIELD.goalW * 0.6) * sy, FIELD.penaltyW * 0.35 * sx, FIELD.goalW * 1.2 * sy);
  c.beginPath(); c.arc(FIELD.penaltyW * 0.7 * sx, fcy * sy, 5 * sx, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc((FIELD.logicalW - FIELD.penaltyW * 0.7) * sx, fcy * sy, 5 * sx, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.045)';
  c.font = `bold ${52 * sx}px Arial`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('CAMELIAS', fcx * sx, fcy * sy);

  const tex = new THREE.CanvasTexture(lc);
  const overlay = new THREE.Mesh(
    new THREE.PlaneGeometry(fw, fh),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.y = 0.006;
  _scene.add(overlay);

  // Outer stadium ground
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 40),
    new THREE.MeshLambertMaterial({ color: 0x0c1a10 })
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.005;
  outer.receiveShadow = true;
  _scene.add(outer);
}

// ── GOALS ─────────────────────────────────────────────────────
function _buildGoals3D() {
  const fw = FIELD.logicalW * SCALE3D;
  const gw = FIELD.goalW     * SCALE3D;
  const gd = FIELD.goalDepth * SCALE3D;
  const gh = 0.72;
  const pr = 0.036;

  function makeGoal(xCenter, facing) {
    const g = new THREE.Group();
    const wm = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

    const postGeo = new THREE.CylinderGeometry(pr, pr, gh, 8);
    const lp = new THREE.Mesh(postGeo, wm); lp.position.set(0, gh / 2, -gw / 2); lp.castShadow = true; g.add(lp);
    const rp = new THREE.Mesh(postGeo, wm); rp.position.set(0, gh / 2,  gw / 2); rp.castShadow = true; g.add(rp);

    const cb = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, gw + pr * 2, 8), wm);
    cb.rotation.x = Math.PI / 2; cb.position.set(0, gh, 0); cb.castShadow = true; g.add(cb);

    const bGeo = new THREE.CylinderGeometry(pr * 0.8, pr * 0.8, gd, 6);
    bGeo.rotateZ(Math.PI / 2);
    const bbl = new THREE.Mesh(bGeo, wm); bbl.position.set(facing * gd / 2, gh / 2, -gw / 2); g.add(bbl);
    const bbr = new THREE.Mesh(bGeo, wm); bbr.position.set(facing * gd / 2, gh / 2,  gw / 2); g.add(bbr);

    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const addNet = (geo, px, py, pz, rx, ry) => {
      const m = new THREE.Mesh(geo, netMat);
      m.position.set(px, py, pz);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      g.add(m);
    };
    addNet(new THREE.PlaneGeometry(gd, gw), facing * gd / 2, gh / 2, 0, 0, Math.PI / 2);
    addNet(new THREE.PlaneGeometry(gd, gw), facing * gd / 2, gh, 0, -Math.PI / 2, 0);
    addNet(new THREE.PlaneGeometry(gd, gh), facing * gd / 2, gh / 2, -gw / 2);
    addNet(new THREE.PlaneGeometry(gd, gh), facing * gd / 2, gh / 2,  gw / 2);

    g.position.set(xCenter, 0, 0);
    _scene.add(g);
  }

  makeGoal(-fw / 2, -1);
  makeGoal( fw / 2,  1);
}

// ── BALL ──────────────────────────────────────────────────────
function _buildBall3D() {
  _ballGroup = new THREE.Group();
  const r = PHYS.ballRadius * SCALE3D;

  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 16),
    new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 90 })
  );
  ballMesh.castShadow = true;
  _ballGroup.add(ballMesh);

  const patchMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 50 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CircleGeometry(r * 0.27, 5), patchMat);
    p.position.set(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.68);
    _ballGroup.add(p);
  }

  const sd = new THREE.Mesh(
    new THREE.CircleGeometry(r * 1.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 })
  );
  sd.rotation.x = -Math.PI / 2;
  sd.position.y = -r + 0.002;
  _ballGroup.add(sd);

  // Position at centre-field immediately so it's visible before the first game tick
  const br = PHYS.ballRadius * SCALE3D;
  _ballGroup.position.set(0, br, 0);
  _scene.add(_ballGroup);
}

// ── PLAYER MESH ───────────────────────────────────────────────
function _buildPlayerMesh3D(p) {
  const group = new THREE.Group();
  const isHome   = p.team === 0;
  const shirtCol = isHome ? 0x1a4fff : 0xcc2200;
  const shortCol = isHome ? 0x0a2a99 : 0x881500;
  const shoeCol  = 0x111111;

  let skinCol = 0xd4956a;
  let hairCol = 0x2a1a0a;
  try {
    if (p.charData && p.charData.skinColor)
      skinCol = parseInt(p.charData.skinColor.replace('#', ''), 16);
    if (p.charData && p.charData.hairColor)
      hairCol = parseInt(p.charData.hairColor.replace('#', ''), 16);
  } catch(e) { /* use defaults */ }

  function mkMat(col) {
    return new THREE.MeshPhongMaterial({ color: col, shininess: 20 });
  }
  function mk(geo, col, x, y, z) {
    const m = new THREE.Mesh(geo, mkMat(col));
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // Torso
  mk(new THREE.CylinderGeometry(0.10, 0.09, 0.26, 8), shirtCol, 0, 0.38, 0);

  // Shorts
  mk(new THREE.CylinderGeometry(0.092, 0.09, 0.11, 8), shortCol, 0, 0.23, 0);

  // Left arm
  const lArmMesh = mk(new THREE.CylinderGeometry(0.028, 0.024, 0.18, 8), shirtCol, -0.13, 0.38, 0);
  lArmMesh.rotation.z =  0.4;
  // Right arm
  const rArmMesh = mk(new THREE.CylinderGeometry(0.028, 0.024, 0.18, 8), shirtCol,  0.13, 0.38, 0);
  rArmMesh.rotation.z = -0.4;

  // Left leg
  const lLeg = mk(new THREE.CylinderGeometry(0.038, 0.032, 0.22, 8), skinCol, -0.045, 0.10, 0);
  // Right leg
  const rLeg = mk(new THREE.CylinderGeometry(0.038, 0.032, 0.22, 8), skinCol,  0.045, 0.10, 0);

  // Shoes (simple spheres — avoids BoxGeometry issues)
  mk(new THREE.SphereGeometry(0.045, 8, 6), shoeCol, -0.045, 0.012, 0.02);
  mk(new THREE.SphereGeometry(0.045, 8, 6), shoeCol,  0.045, 0.012, 0.02);

  // Head
  mk(new THREE.SphereGeometry(0.11, 12, 10), skinCol, 0, 0.60, 0);

  // Hair (full sphere slightly larger, same position — hair color on top half illusion)
  const hairMesh = mk(new THREE.SphereGeometry(0.112, 12, 10), hairCol, 0, 0.62, 0);
  // Clip bottom half of hair by offsetting downward so only crown shows
  hairMesh.position.y = 0.655;

  // Eyes
  mk(new THREE.SphereGeometry(0.018, 6, 5), 0x111111, -0.042, 0.615, 0.096);
  mk(new THREE.SphereGeometry(0.018, 6, 5), 0x111111,  0.042, 0.615, 0.096);

  // Player indicator ring
  if (p.isPlayer) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.20, 0.02, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0x4d80ff })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    group.add(ring);
  }

  // Ground shadow disc
  const sd = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  sd.rotation.x = -Math.PI / 2;
  sd.position.y = 0.002;
  group.add(sd);

  return { group, lLeg, rLeg };
}

// ── SCENE UPDATE ──────────────────────────────────────────────
function updateScene3D(G, dt) {
  if (!_ready || !G) return;
  _animClock += dt;

  const fw3d = FIELD.logicalW * SCALE3D;
  const fh3d = FIELD.logicalH * SCALE3D;
  function toX(gx) { return (gx / G.fieldW - 0.5) * fw3d; }
  function toZ(gy) { return (gy / G.fieldH - 0.5) * fh3d; }

  // Ball
  const ball = G.ball;
  const br = PHYS.ballRadius * SCALE3D;
  _ballGroup.position.set(toX(ball.x), br, toZ(ball.y));
  const bspd = Math.hypot(ball.vx, ball.vy);
  if (bspd > 30 * G.mapScale) {
    _ballGroup.rotation.x -= ball.vy * SCALE3D / G.mapScale * dt * 3;
    _ballGroup.rotation.z += ball.vx * SCALE3D / G.mapScale * dt * 3;
  }

  // Players
  G.allPlayers.forEach(p => {
    if (!_playerMeshes.has(p.id)) {
      try {
        const data = _buildPlayerMesh3D(p);
        _playerMeshes.set(p.id, data);
        _scene.add(data.group);
      } catch(e) {
        console.error('Player mesh build failed for id', p.id, e);
        return;
      }
    }
    if (!_playerMeshes.has(p.id)) return;

    const { group, lLeg, rLeg } = _playerMeshes.get(p.id);
    const prevX = group.position.x;
    const prevZ = group.position.z;
    const newX  = toX(p.x);
    const newZ  = toZ(p.y);
    group.position.set(newX, 0, newZ);

    // Face movement direction
    const movX = newX - prevX;
    const movZ = newZ - prevZ;
    const movDist = Math.sqrt(movX * movX + movZ * movZ);
    if (movDist > 0.0008) {
      const target = Math.atan2(movX, movZ);
      let diff = target - group.rotation.y;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.rotation.y += diff * 0.25;
    }

    // Walk cycle
    if (movDist > 0.0008) {
      lLeg.rotation.x =  Math.sin(_animClock * 8) * 0.38;
      rLeg.rotation.x = -Math.sin(_animClock * 8) * 0.38;
    } else {
      lLeg.rotation.x *= 0.8;
      rLeg.rotation.x *= 0.8;
    }

    // Flash highlight (ability charge)
    const flashOn = p.flash > 0;
    group.children.forEach(child => {
      const mat = child.material;
      if (!mat || mat.emissive === undefined) return;
      if (flashOn) {
        mat.emissive.setRGB(0.7, 0.6, 0);
        mat.emissiveIntensity = Math.min(1, p.flash);
      } else {
        mat.emissiveIntensity = 0;
      }
    });
  });

  // Camera
  if (G.playerObj) _updateCamera3D(G, toX, toZ, dt);
}

// ── CAMERA VIEW ───────────────────────────────────────────────
function toggleCameraView() {
  _cameraView = _cameraView === 'third' ? 'first' : 'third';
  if (_camera) {
    _camera.fov = _cameraView === 'first' ? 85 : 65;
    _camera.updateProjectionMatrix();
  }
  return _cameraView;
}

function _updateCamera3D(G, toX, toZ, dt) {
  const player = G.playerObj;
  const px = toX(player.x);
  const pz = toZ(player.y);

  const meshData = _playerMeshes.get(player.id);
  if (meshData) {
    _playerFacingAngle = meshData.group.rotation.y;
    // Hide player mesh in first-person so it doesn't clip the view
    meshData.group.visible = _cameraView !== 'first';
  }

  const fsin = Math.sin(_playerFacingAngle);
  const fcos = Math.cos(_playerFacingAngle);

  if (_cameraView === 'first') {
    _camera.position.set(px + fsin * 0.12, 0.60, pz + fcos * 0.12);
    _camera.lookAt(px + fsin * 6, 0.15, pz + fcos * 6);
  } else {
    const dist = 3.5;
    const height = 2.2;
    const targetX = px - fsin * dist;
    const targetZ = pz - fcos * dist;
    const alpha = 1 - Math.exp(-7 * dt);
    _camera.position.x += (targetX - _camera.position.x) * alpha;
    _camera.position.y += (height  - _camera.position.y) * alpha;
    _camera.position.z += (targetZ - _camera.position.z) * alpha;
    _camera.lookAt(px, 0.3, pz);
  }
}

// ── RENDER ────────────────────────────────────────────────────
function render3D() {
  if (!_ready) return;
  _renderer.render(_scene, _camera);
}

function resize3D() {
  if (!_ready) return;
  const container = document.getElementById('game-canvas-container');
  if (!container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();
    _renderer.setSize(w, h);
  }
}

function cleanup3D() {
  _playerMeshes.forEach(({ group }) => { if (_scene) _scene.remove(group); });
  _playerMeshes.clear();
  _cameraView = 'third';
  _playerFacingAngle = 0;
  if (_camera) {
    _camera.fov = 65;
    _camera.updateProjectionMatrix();
  }
}
