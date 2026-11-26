// 3D LEGO Monopoly Board, 3D Dice, 3D Buildings & Mini LEGO Karts
export const BOARD_TILES = [
  { id: 0,  type: 'start',    name: '起點發財', icon: '🏁', color: '#22c55e', price: 0,   rent: 0 },
  { id: 1,  type: 'property', name: '積木公園', icon: '🌲', color: '#84cc16', price: 180, rent: 55 },
  { id: 2,  type: 'property', name: '珍奶總部', icon: '🧋', color: '#84cc16', price: 220, rent: 70 },
  { id: 3,  type: 'card',     name: '道具卡站', icon: '🃏', color: '#a855f7', price: 0,   rent: 0 },
  { id: 4,  type: 'property', name: '熱帶海島', icon: '🏖️', color: '#06b6d4', price: 260, rent: 85 },
  { id: 5,  type: 'property', name: '海底隧道', icon: '🐠', color: '#06b6d4', price: 280, rent: 95 },
  { id: 6,  type: 'race_cup', name: '快閃飆車', icon: '🏎️', color: '#f97316', price: 0,   rent: 0 },
  { id: 7,  type: 'property', name: '黃金沙漠', icon: '🏜️', color: '#f59e0b', price: 300, rent: 105 },
  { id: 8,  type: 'property', name: '綠洲油站', icon: '⛽', color: '#f59e0b', price: 320, rent: 115 },
  { id: 9,  type: 'chance',   name: '機會命運', icon: '❓', color: '#ec4899', price: 0,   rent: 0 },
  { id: 10, type: 'property', name: '櫻花大道', icon: '🌸', color: '#f472b6', price: 350, rent: 125 },
  { id: 11, type: 'property', name: '糖果王國', icon: '🍬', color: '#f472b6', price: 380, rent: 140 },
  { id: 12, type: 'parking',  name: '補血加氣', icon: '⚡', color: '#38bdf8', price: 0,   rent: 0 },
  { id: 13, type: 'property', name: '熔岩火山', icon: '🌋', color: '#ef4444', price: 420, rent: 155 },
  { id: 14, type: 'property', name: '恐龍公園', icon: '🦖', color: '#ef4444', price: 460, rent: 175 },
  { id: 15, type: 'card',     name: '道具卡站', icon: '🃏', color: '#a855f7', price: 0,   rent: 0 },
  { id: 16, type: 'property', name: '霓虹夜市', icon: '🌃', color: '#eab308', price: 490, rent: 185 },
  { id: 17, type: 'property', name: '樂高摩天', icon: '🎡', color: '#eab308', price: 520, rent: 200 },
  { id: 18, type: 'tax',      name: '暴龍收費', icon: '🦕', color: '#dc2626', price: 0,   rent: 0 },
  { id: 19, type: 'property', name: '極地冰原', icon: '❄️', color: '#3b82f6', price: 550, rent: 215 },
  { id: 20, type: 'property', name: '彩虹星空', icon: '🌈', color: '#3b82f6', price: 580, rent: 230 },
  { id: 21, type: 'chance',   name: '機會命運', icon: '❓', color: '#ec4899', price: 0,   rent: 0 },
  { id: 22, type: 'property', name: '雲端天國', icon: '☁️', color: '#fbbf24', price: 640, rent: 260 },
  { id: 23, type: 'property', name: '車神聖殿', icon: '👑', color: '#fbbf24', price: 700, rent: 300 },
];

export const PLAYER_PRESETS = [
  { id: 0, name: '閃電金星', color: '#fbbf24', hex: 0xfbbf24, accent: 0x1d4ed8, icon: '🏎️' },
  { id: 1, name: '極光快車', color: '#06b6d4', hex: 0x06b6d4, accent: 0xec4899, icon: '⚡' },
  { id: 2, name: '赤焰 F1',  color: '#ef4444', hex: 0xef4444, accent: 0xfef08a, icon: '🔥' },
  { id: 3, name: '紫電戰神', color: '#a855f7', hex: 0xa855f7, accent: 0x38ef7d, icon: '👾' },
];

// Create a cute 3D LEGO Kart mesh (used on BOTH the Monopoly board & inside 3D Races!)
export function createMiniLegoKart(colorHex, accentHex) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.28, metalness: 0.12 });
  const accMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.3, metalness: 0.15 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffd500, roughness: 0.35 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15, metalness: 0.5 });

  // Chassis & nose
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 2.7), bodyMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  root.add(chassis);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.8), accMat);
  nose.position.set(0, 0.52, -1.55);
  nose.castShadow = true;
  root.add(nose);

  // Rear Spoiler
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.45), accMat);
  wing.position.set(0, 1.32, 1.25);
  for (const sx of [-0.6, 0.6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.2), darkMat);
    strut.position.set(sx, 1.02, 1.2);
    root.add(strut);
  }
  root.add(wing);

  // LEGO Driver torso + helmet
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.5), accMat);
  torso.position.set(0, 1.05, 0.15);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.42, 14), headMat);
  head.position.set(0, 1.56, 0.15);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.37, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), bodyMat);
  helmet.position.set(0, 1.62, 0.15);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.18), visorMat);
  visor.position.set(0, 1.56, -0.15);
  root.add(torso, head, helmet, visor);

  // 4 Wheels
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-1.02, -0.88], [1.02, -0.88], [-1.05, 0.88], [1.05, 0.88]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(wx, 0.42, wz);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);
  }

  // Twin Nitro Flames (toggled during boost)
  const flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  for (const fx of [-0.38, 0.38]) {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 8), flameMat);
    fl.rotation.x = Math.PI / 2;
    fl.position.set(fx, 0.55, 1.95);
    fl.visible = false;
    root.add(fl);
    flames.push(fl);
  }

  return { root, wheels, flames };
}

function makeTileTexture(tile) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  // Card base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Colored top band
  ctx.fillStyle = tile.color;
  ctx.fillRect(0, 0, 256, 72);

  // Border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  // Icon
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tile.icon, 128, 128);

  // Title on top band
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px "Noto Sans TC", sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 4;
  ctx.fillText(tile.name, 128, 38);
  ctx.shadowBlur = 0;

  // Price or subtitle at bottom
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px "Noto Sans TC", sans-serif';
  const sub = tile.type === 'property' ? `$${tile.price}` : tile.type === 'start' ? '+$300' : tile.type === 'race_cup' ? '飆車獎金' : tile.type === 'parking' ? '+$200' : tile.type === 'tax' ? '-$150' : '抽一張';
  ctx.fillText(sub, 128, 212);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MonopolyBoard3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.tileSize = 6.2;
    this.tilePositions = [];
    this.tileMeshes = [];
    this.buildingGroups = new Map();
    this.ownerRings = new Map();

    this._buildEnvironment();
    this._buildTiles();
    this._buildCenterPark();
    this._buildDice();
  }

  _buildEnvironment() {
    // Vibrant LEGO Green Baseplate
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(62, 1.4, 62),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 })
    );
    base.position.y = -0.75;
    base.receiveShadow = true;
    this.group.add(base);

    // Outer Ocean / Sky Ring
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -1.45;
    this.group.add(sea);
  }

  _buildTiles() {
    // 24 tiles around a 7x7 perimeter (indices 0..23 clockwise starting bottom-right)
    const S = this.tileSize;
    const half = 3 * S;
    const coords = [];
    // Bottom row: right -> left (0..6)
    for (let i = 0; i < 6; i++) coords.push([half - i * S, half]);
    // Left col: bottom -> top (6..12)
    for (let i = 0; i < 6; i++) coords.push([-half, half - i * S]);
    // Top row: left -> right (12..18)
    for (let i = 0; i < 6; i++) coords.push([-half + i * S, -half]);
    // Right col: top -> bottom (18..24)
    for (let i = 0; i < 6; i++) coords.push([half, -half + i * S]);

    BOARD_TILES.forEach((tile, i) => {
      const [x, z] = coords[i];
      const pos = new THREE.Vector3(x, 0, z);
      this.tilePositions.push(pos);

      const topTex = makeTileTexture(tile);
      const sideMat = new THREE.MeshStandardMaterial({ color: tile.color, roughness: 0.4 });
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5 });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(S - 0.25, 0.7, S - 0.25),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
      );
      mesh.position.set(x, 0.35, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.group.add(mesh);
      this.tileMeshes.push(mesh);

      // Owner indicator glow border (hidden until purchased)
      const ring = new THREE.Mesh(
        new THREE.BoxGeometry(S - 0.05, 0.16, S - 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      ring.position.set(x, 0.74, z);
      ring.visible = false;
      this.group.add(ring);
      this.ownerRings.set(i, ring);

      // Container for 3D LEGO buildings on the inner side of the tile
      const bGroup = new THREE.Group();
      const inward = new THREE.Vector3(-x, 0, -z).normalize();
      bGroup.position.set(x + inward.x * (S * 0.58), 0.7, z + inward.z * (S * 0.58));
      this.group.add(bGroup);
      this.buildingGroups.set(i, bGroup);
    });
  }

  _buildCenterPark() {
    // Center LEGO Plaza with Golden Racing Trophy & Trees!
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(11.5, 12.2, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    plaza.position.y = 0.25;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(10.8, 0.4, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    this.group.add(ring);

    // Spinning Giant Golden Trophy
    this.trophy = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.2 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    base.position.y = 0.6;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 2.4, 12), goldMat);
    stem.position.y = 2.2;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.3, 3.2, 16), goldMat);
    cup.position.y = 4.6;
    this.trophy.add(base, stem, cup);
    this.trophy.position.y = 0.5;
    this.group.add(this.trophy);

    // 4 Corner LEGO Trees in the plaza
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    for (const [tx, tz] of [[-7.2, -7.2], [7.2, -7.2], [-7.2, 7.2], [7.2, 7.2]]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.8, 1.1), trunkMat);
      tr.position.set(tx, 1.9, tz);
      const lf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 3.2), leafMat);
      lf.position.set(tx, 4.1, tz);
      this.group.add(tr, lf);
    }
  }

  _buildDice() {
    // 3D LEGO White Die with Black Pips!
    const faces = [1, 6, 2, 5, 3, 4].map((num) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 120, 120);
      ctx.fillStyle = num === 1 || num === 4 ? '#ef4444' : '#0f172a';
      const pips = {
        1: [[64, 64]],
        2: [[36, 36], [92, 92]],
        3: [[36, 36], [64, 64], [92, 92]],
        4: [[36, 36], [92, 36], [36, 92], [92, 92]],
        5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]],
        6: [[36, 32], [92, 32], [36, 64], [92, 64], [36, 96], [92, 96]],
      }[num];
      for (const [px, py] of pips) {
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 });
    });

    this.diceMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4), faces);
    this.diceMesh.position.set(0, 9.5, 0);
    this.diceMesh.castShadow = true;
    this.diceMesh.visible = false;
    this.group.add(this.diceMesh);
  }

  updatePropertyVisual(tileId, ownerColorHex, level) {
    const ring = this.ownerRings.get(tileId);
    const bGroup = this.buildingGroups.get(tileId);
    if (!bGroup) return;

    while (bGroup.children.length > 0) bGroup.remove(bGroup.children[0]);

    if (ownerColorHex == null) {
      if (ring) ring.visible = false;
      return;
    }

    if (ring) {
      ring.visible = true;
      ring.material.color.setHex(ownerColorHex);
    }

    // Build 3D LEGO Building based on level (1..4)!
    const wallMat = new THREE.MeshStandardMaterial({ color: ownerColorHex, roughness: 0.35 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.2 });

    const floors = Math.max(1, Math.min(4, level));
    for (let f = 0; f < floors; f++) {
      const w = Math.max(1.5, 2.6 - f * 0.22);
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 1.25, w), f === 3 ? goldMat : wallMat);
      block.position.y = 0.62 + f * 1.28;
      block.castShadow = true;
      bGroup.add(block);
    }
    // Roof spire / LEGO stud cap
    const cap = new THREE.Mesh(
      floors >= 3 ? new THREE.ConeGeometry(1.3, 1.5, 4) : new THREE.BoxGeometry(2.2, 0.35, 2.2),
      floors >= 3 ? goldMat : roofMat
    );
    cap.position.y = floors * 1.28 + (floors >= 3 ? 0.75 : 0.18);
    if (floors >= 3) cap.rotation.y = Math.PI / 4;
    bGroup.add(cap);
  }

  getTileWorldPos(tileIndex, slotOffset = 0) {
    const base = this.tilePositions[tileIndex % BOARD_TILES.length];
    const offsets = [
      [-1.1, -1.1],
      [1.1, -1.1],
      [-1.1, 1.1],
      [1.1, 1.1],
    ];
    const [ox, oz] = offsets[slotOffset % 4];
    return new THREE.Vector3(base.x + ox, 0.72, base.z + oz);
  }

  update(dt, elapsed) {
    if (this.trophy) this.trophy.rotation.y += dt * 0.9;
    if (this.diceMesh && this.diceMesh.visible) {
      this.diceMesh.rotation.x += dt * 11;
      this.diceMesh.rotation.y += dt * 14;
      this.diceMesh.position.y = 9.5 + Math.abs(Math.sin(elapsed * 12)) * 2.5;
    }
  }
}
