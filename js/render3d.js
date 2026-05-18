// ============================================================
// CAMELIAS FC — 3D Rendering Layer (Three.js)
// ============================================================

const SCALE3D = 1 / 100;

let _scene, _camera, _renderer;
let _ballGroup = null;
let _playerMeshes = new Map(); // player id → { group, lLeg, rLeg }
let _ready = false;
let _animClock = 0;

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

  _camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  _camera.position.set(0, 9.5, 6.8);
  _camera.lookAt(0, 0, -0.5);

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

  _scene.add(_ballGroup);
}

// ── PLAYER MESH ───────────────────────────────────────────────
function _buildPlayerMesh3D(p) {
  const group = new THREE.Group();
  const isHome  = p.team === 0;
  const shirtHex = isHome ? 0x1a4fff : 0xcc2200;
  const shortHex = isHome ? 0x0a2a99 : 0x881500;

  let skinHex = 0xd4956a;
  let hairHex = 0x2a1a0a;
  if (p.charData?.skinColor) skinHex = parseInt(p.charData.skinColor.replace('#', ''), 16);
  if (p.charData?.hairColor) hairHex = parseInt(p.charData.hairColor.replace('#', ''), 16);

  const shirtMat = new THREE.MeshPhongMaterial({ color: shirtHex, shininess: 30 });
  const shortMat = new THREE.MeshPhongMaterial({ color: shortHex });
  const skinMat  = new THREE.MeshPhongMaterial({ color: skinHex,  shininess: 15 });
  const hairMat  = new THREE.MeshPhongMaterial({ color: hairHex,  shininess: 25 });

  const add = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    group.add(m);
    return m;
  };

  // Body parts
  add(new THREE.CylinderGeometry(0.09,  0.08,  0.24, 8), shirtMat,  0,    0.37, 0);
  add(new THREE.CylinderGeometry(0.086, 0.083, 0.1,  8), shortMat,  0,    0.23, 0);
  add(new THREE.CylinderGeometry(0.026, 0.022, 0.18, 8), shirtMat, -0.115, 0.38, 0, 0, 0,  0.35);
  add(new THREE.CylinderGeometry(0.026, 0.022, 0.18, 8), shirtMat,  0.115, 0.38, 0, 0, 0, -0.35);

  // Legs — store refs for animation
  const lLeg = add(new THREE.CylinderGeometry(0.036, 0.03, 0.2, 8), skinMat, -0.042, 0.1, 0);
  const rLeg = add(new THREE.CylinderGeometry(0.036, 0.03, 0.2, 8), skinMat,  0.042, 0.1, 0);

  // Shoes
  add(new THREE.BoxGeometry(0.06, 0.035, 0.1), new THREE.MeshPhongMaterial({ color: 0x111111 }), -0.042, 0.015, 0.025);
  add(new THREE.BoxGeometry(0.06, 0.035, 0.1), new THREE.MeshPhongMaterial({ color: 0x111111 }),  0.042, 0.015, 0.025);

  // Head
  add(new THREE.SphereGeometry(0.1, 14, 12), skinMat, 0, 0.595, 0);

  // Hair cap (upper hemisphere)
  const hairGeo = new THREE.SphereGeometry(0.103, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const hairCap = new THREE.Mesh(hairGeo, hairMat);
  hairCap.position.y = 0.595;
  group.add(hairCap);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.017, 6, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(-0.038, 0.608, 0.089); group.add(le);
  const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set( 0.038, 0.608, 0.089); group.add(re);

  // Jersey number sprite
  const nc = document.createElement('canvas');
  nc.width = 64; nc.height = 64;
  const nctx = nc.getContext('2d');
  nctx.fillStyle = '#ffffff';
  nctx.font = 'bold 30px Arial';
  nctx.textAlign = 'center';
  nctx.textBaseline = 'middle';
  nctx.fillText(String(p.id), 32, 32);
  const numMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc), transparent: true, depthWrite: false })
  );
  numMesh.position.set(0, 0.375, 0.092);
  group.add(numMesh);

  // Player indicator ring (blue glow under feet)
  if (p.isPlayer) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.17, 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0x4d80ff, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    group.add(ring);
  }

  // Ground shadow
  const sd = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  sd.rotation.x = -Math.PI / 2;
  sd.position.y = 0.001;
  group.add(sd);

  return { group, lLeg, rLeg };
}

// ── SCENE UPDATE ──────────────────────────────────────────────
function updateScene3D(G, dt) {
  if (!_ready || !G) return;
  _animClock += dt;

  // Ball
  const ball = G.ball;
  const br = PHYS.ballRadius * SCALE3D;
  _ballGroup.position.set(wx(ball.x), br, wz(ball.y));
  const bspd = Math.hypot(ball.vx, ball.vy);
  if (bspd > 30) {
    _ballGroup.rotation.x -= ball.vy * SCALE3D * dt * 3;
    _ballGroup.rotation.z += ball.vx * SCALE3D * dt * 3;
  }

  // Players
  G.allPlayers.forEach(p => {
    if (!_playerMeshes.has(p.id)) {
      const data = _buildPlayerMesh3D(p);
      _playerMeshes.set(p.id, data);
      _scene.add(data.group);
    }

    const { group, lLeg, rLeg } = _playerMeshes.get(p.id);
    const prevX = group.position.x;
    const prevZ = group.position.z;
    const newX  = wx(p.x);
    const newZ  = wz(p.y);
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
}
