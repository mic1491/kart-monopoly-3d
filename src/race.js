// Dual 3D Kart Racing Engine:
// 1. 'sprint'  -> 10-second High-Speed Straight Sprint (Empty Land Auction Race!)
// 2. 'circuit' -> 1-Lap 3D Circuit Duel with Drift + Items (Rival Land Takeover Duel!)
import { createMiniLegoKart } from './board.js';

export class MiniKartRace {
  constructor(scene, audio, onFinish) {
    this.scene = scene;
    this.audio = audio;
    this.onFinish = onFinish;

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.visible = false;

    this.active = false;
    this.mode = 'sprint'; // 'sprint' | 'circuit'
    this.racers = [];
    this.humanRacers = [];
    this.boostPads = [];
    this.obstacles = [];
    this.itemBoxes = [];
    this.curve = null;
    this.trackPoints = [];
    this.trackTangents = [];
    this.trackRights = [];
    this.samples = 240;
    this.sprintLength = 440;
    this.roadWidth = 22;

    this.countdown = 0;
    this.lastCountInt = 4;
    this.raceTime = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  start({ mode, participants, title, themeColor = '#38bdf8' }) {
    this._clear();
    this.mode = mode;
    this.active = true;
    this.finished = false;
    this.raceTime = 0;
    this.elapsed = 0;
    this.countdown = 2.6;
    this.lastCountInt = 4;
    this.group.visible = true;

    if (mode === 'sprint') this._buildSprintTrack(themeColor);
    else this._buildCircuitTrack(themeColor);

    this.racers = [];
    this.humanRacers = [];

    participants.forEach((p, idx) => {
      const kart = createMiniLegoKart(p.hex, p.accent);
      kart.root.scale.setScalar(1.05);
      this.group.add(kart.root);

      let startPos, startYaw;
      if (mode === 'sprint') {
        const laneX = (idx - (participants.length - 1) / 2) * 4.4;
        startPos = new THREE.Vector3(laneX, 0, 0);
        startYaw = 0;
      } else {
        const sIdx = (this.samples - 4 - idx * 2) % this.samples;
        const pt = this.trackPoints[sIdx];
        const tan = this.trackTangents[sIdx];
        const right = this.trackRights[sIdx];
        const lane = idx % 2 === 0 ? -3.6 : 3.6;
        startPos = pt.clone().addScaledVector(right, lane);
        startYaw = Math.atan2(-tan.x, -tan.z);
      }

      kart.root.position.copy(startPos);
      kart.root.rotation.y = startYaw;

      const racer = {
        player: p,
        isHuman: p.isHuman,
        humanSlot: p.isHuman ? this.humanRacers.length : -1,
        kart,
        pos: startPos.clone(),
        yaw: startYaw,
        speed: 0,
        steer: 0,
        isDrifting: false,
        driftDir: 0,
        driftTime: 0,
        boostTimer: 0,
        spinTimer: 0,
        slowTimer: 0,
        item: mode === 'circuit' ? 'nitro' : null,
        padCd: 0,
        obsCd: 0,
        trackIndex: 0,
        progress: 0,
        passedHalf: false,
        finished: false,
        finishTime: 0,
        aiLane: (idx % 2 === 0 ? -4.2 : 4.2) + (Math.random() - 0.5) * 2,
        aiSkill: 0.9 + Math.random() * 0.12,
      };
      this.racers.push(racer);
      if (racer.isHuman) this.humanRacers.push(racer);
    });
  }

  stop() {
    this.active = false;
    this.group.visible = false;
    this._clear();
  }

  _clear() {
    while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
    this.racers = [];
    this.humanRacers = [];
    this.boostPads = [];
    this.obstacles = [];
    this.itemBoxes = [];
    this.trackPoints = [];
    this.trackTangents = [];
    this.trackRights = [];
  }

  _buildSprintTrack(themeColor) {
    const L = this.sprintLength + 80;
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, L + 200),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.15, -L / 2 + 40);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Asphalt highway
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roadWidth, L),
      new THREE.MeshStandardMaterial({ color: 0x262d3d, roughness: 0.78 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.04, -L / 2 + 30);
    road.receiveShadow = true;
    this.group.add(road);

    // Neon guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: themeColor, emissive: themeColor, emissiveIntensity: 0.35 });
    for (const sx of [-this.roadWidth / 2 - 0.7, this.roadWidth / 2 + 0.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, L), railMat);
      rail.position.set(sx, 0.65, -L / 2 + 30);
      this.group.add(rail);
    }

    // Start & Finish Checkered Arches
    this._buildArch(0, 0x38bdf8);
    this._buildArch(-this.sprintLength, 0xfbbf24);

    // Boost pads along the sprint!
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, side: THREE.DoubleSide });
    for (let z = -65; z > -this.sprintLength + 40; z -= 82) {
      const lx = ((Math.abs(z) % 3) - 1) * 5.2;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7.5), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(lx, 0.1, z);
      this.group.add(pad);
      this.boostPads.push({ pos: new THREE.Vector3(lx, 0, z), radius: 3.6 });
    }

    // Moving LEGO Barriers / Rolling Boulders!
    const obsMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });
    for (let z = -110; z > -this.sprintLength + 50; z -= 95) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.2), obsMat);
      mesh.castShadow = true;
      this.group.add(mesh);
      this.obstacles.push({
        mesh,
        center: new THREE.Vector3(0, 0, z),
        right: new THREE.Vector3(1, 0, 0),
        pos: new THREE.Vector3(0, 0, z),
        range: this.roadWidth / 2 - 2.6,
        speed: 1.7 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  _buildArch(zPos, colorHex) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
    const g = new THREE.Group();
    for (const sx of [-this.roadWidth / 2 - 1, this.roadWidth / 2 + 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 10, 1.6), mat);
      p.position.set(sx, 5, zPos);
      g.add(p);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 4, 2.2, 1.8), mat);
    bar.position.set(0, 9.6, zPos);
    g.add(bar);
    this.group.add(g);
  }

  _buildCircuitTrack(themeColor) {
    // Fast 1-Lap Circuit (~20 seconds!)
    const pts = [
      new THREE.Vector3(0, 0, 75),
      new THREE.Vector3(0, 0, -55),
      new THREE.Vector3(55, 4, -125),
      new THREE.Vector3(145, 6, -110),
      new THREE.Vector3(175, 2, -25),
      new THREE.Vector3(120, 0, 45),
      new THREE.Vector3(155, 4, 115),
      new THREE.Vector3(70, 2, 145),
      new THREE.Vector3(0, 0, 120),
    ];
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.45);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.samples; i++) {
      const t = i / this.samples;
      const p = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t).normalize();
      const hTan = new THREE.Vector3(tan.x, 0, tan.z).normalize();
      const right = new THREE.Vector3().crossVectors(hTan, up).normalize();
      this.trackPoints.push(p);
      this.trackTangents.push(tan);
      this.trackRights.push(right);
    }

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(80, -0.3, 10);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Road ribbon
    const hw = this.roadWidth / 2;
    const positions = [];
    const indices = [];
    for (let i = 0; i <= this.samples; i++) {
      const idx = i % this.samples;
      const p = this.trackPoints[idx];
      const r = this.trackRights[idx];
      const pL = p.clone().addScaledVector(r, -hw);
      const pR = p.clone().addScaledVector(r, hw);
      positions.push(pL.x, p.y + 0.06, pL.z, pR.x, p.y + 0.06, pR.z);
      if (i < this.samples) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const roadMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x262d3d, roughness: 0.75, side: THREE.DoubleSide })
    );
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    // Glowing roadside posts
    const postMat = new THREE.MeshStandardMaterial({ color: themeColor, emissive: themeColor, emissiveIntensity: 0.35 });
    for (let i = 0; i < this.samples; i += 6) {
      const p = this.trackPoints[i];
      const r = this.trackRights[i];
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 2.0), postMat);
        const pos = p.clone().addScaledVector(r, side * (hw + 1.4));
        post.position.set(pos.x, p.y + 0.75, pos.z);
        this.group.add(post);
      }
    }

    // Start/Finish Arch at sample 0
    const sp = this.trackPoints[0];
    const sr = this.trackRights[0];
    const stan = this.trackTangents[0];
    const arch = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, 10, 1.6), archMat);
      col.position.set(side * (hw + 1.2), 5, 0);
      arch.add(col);
    }
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 4, 2.0, 1.6), archMat);
    topBar.position.set(0, 9.6, 0);
    arch.add(topBar);
    arch.position.copy(sp);
    arch.rotation.y = Math.atan2(stan.x, stan.z);
    this.group.add(arch);

    // Boost pads & Item Boxes on circuit!
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, side: THREE.DoubleSide });
    [0.14, 0.38, 0.64, 0.86].forEach((t) => {
      const idx = Math.floor(t * this.samples);
      const p = this.trackPoints[idx];
      const tan = this.trackTangents[idx];
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7.2), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = -Math.atan2(tan.x, tan.z);
      pad.position.set(p.x, p.y + 0.14, p.z);
      this.group.add(pad);
      this.boostPads.push({ pos: p.clone(), radius: 4.4 });
    });

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.5 });
    [0.24, 0.54, 0.78].forEach((t) => {
      const idx = Math.floor(t * this.samples);
      const p = this.trackPoints[idx];
      const r = this.trackRights[idx];
      for (const lat of [-4.5, 0, 4.5]) {
        const bp = p.clone().addScaledVector(r, lat);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), boxMat);
        mesh.position.set(bp.x, p.y + 1.4, bp.z);
        this.group.add(mesh);
        this.itemBoxes.push({ mesh, pos: bp, respawn: 0 });
      }
    });
  }

  _getClosestCircuit(pos, hint) {
    let best = 0, bestD = Infinity;
    for (let o = -22; o <= 22; o++) {
      const idx = (hint + o + this.samples) % this.samples;
      const p = this.trackPoints[idx];
      const d = (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2;
      if (d < bestD) { bestD = d; best = idx; }
    }
    const p = this.trackPoints[best];
    const r = this.trackRights[best];
    const tan = this.trackTangents[best];
    const lat = (pos.x - p.x) * r.x + (pos.z - p.z) * r.z;
    return { index: best, t: best / this.samples, point: p, right: r, tangent: tan, lat };
  }

  update(dt, getInputFn, onBanner) {
    if (!this.active) return null;
    this.elapsed += dt;

    // Update obstacles & item boxes
    for (const o of this.obstacles) {
      const off = Math.sin(this.elapsed * o.speed + o.phase) * o.range;
      o.pos.copy(o.center).addScaledVector(o.right, off);
      o.mesh.position.set(o.pos.x, o.pos.y + 1.1, o.pos.z);
    }
    for (const b of this.itemBoxes) {
      if (b.respawn > 0) {
        b.respawn -= dt;
        if (b.respawn <= 0) b.mesh.visible = true;
      } else {
        b.mesh.rotation.y += dt * 2.5;
      }
    }

    // Countdown
    if (this.countdown > 0) {
      this.countdown -= dt;
      const num = Math.ceil(this.countdown);
      if (num < this.lastCountInt && num > 0) {
        this.lastCountInt = num;
        this.audio.playBeep(false);
      }
      if (this.countdown <= 0) {
        this.audio.playBeep(true);
      }
      return { countdown: Math.max(0, Math.ceil(this.countdown)) };
    }

    this.raceTime += dt;

    for (const r of this.racers) {
      if (r.boostTimer > 0) r.boostTimer = Math.max(0, r.boostTimer - dt);
      if (r.spinTimer > 0) r.spinTimer = Math.max(0, r.spinTimer - dt);
      if (r.slowTimer > 0) r.slowTimer = Math.max(0, r.slowTimer - dt);
      if (r.padCd > 0) r.padCd -= dt;
      if (r.obsCd > 0) r.obsCd -= dt;

      const baseMax = this.mode === 'sprint' ? 54 : 46;
      let maxSpd = baseMax + (r.boostTimer > 0 ? 22 : 0);
      if (r.slowTimer > 0) maxSpd *= 0.56;

      if (r.spinTimer > 0) {
        r.speed *= Math.pow(0.25, dt);
        r.kart.root.rotation.y += dt * 14;
      } else if (r.isHuman && !r.finished) {
        const inp = getInputFn(r.humanSlot);
        if (inp.use && r.item) {
          const used = r.item;
          r.item = null;
          if (used === 'nitro') {
            r.boostTimer = 2.0;
            this.audio.playBoost();
            onBanner(`⚡ ${r.player.name} 氮氣衝刺！`);
          } else if (used === 'blizzard') {
            this.audio.playHit();
            onBanner(`🌨️ ${r.player.name} 施放冰風暴減速全場！`);
            for (const o of this.racers) if (o !== r) o.slowTimer = 2.6;
          } else if (used === 'missile') {
            this.audio.playHit();
            const target = this.racers.filter((o) => o !== r).sort((a, b) => b.progress - a.progress)[0];
            if (target) {
              target.spinTimer = 0.85;
              onBanner(`🚀 ${r.player.name} 飛彈命中 ${target.player.name}！`);
            }
          }
        }
        if (inp.accel || r.boostTimer > 0) r.speed += 36 * dt;
        else if (inp.brake) r.speed -= 34 * dt;
        else r.speed *= Math.pow(0.5, dt);
        r.speed = THREE.MathUtils.clamp(r.speed, -10, maxSpd);

        const rawSteer = inp.steer !== 0 ? inp.steer : ((inp.left ? 1 : 0) - (inp.right ? 1 : 0));
        r.steer = THREE.MathUtils.lerp(r.steer, rawSteer, Math.min(1, dt * 12));

        if (inp.drift && Math.abs(r.steer) > 0.15 && r.speed > 18) {
          r.isDrifting = true;
          r.driftTime += dt;
          r.yaw += r.steer * 2.55 * dt;
        } else {
          if (r.isDrifting && r.driftTime > 0.45) {
            r.boostTimer = Math.max(r.boostTimer, 1.0);
            this.audio.playBoost();
          }
          r.isDrifting = false;
          r.driftTime = 0;
          r.yaw += r.steer * (this.mode === 'sprint' ? 1.45 : 2.1) * dt;
        }
      } else {
        // AI Racer
        if (this.mode === 'sprint') {
          let targetX = r.aiLane;
          for (const o of this.obstacles) {
            const dz = r.pos.z - o.pos.z;
            if (dz > 0 && dz < 32 && Math.abs(r.pos.x - o.pos.x) < 4.5) {
              targetX = o.pos.x > 0 ? -6.5 : 6.5;
            }
          }
          const dx = targetX - r.pos.x;
          const desiredYaw = THREE.MathUtils.clamp(-dx * 0.08, -0.45, 0.45);
          r.yaw = THREE.MathUtils.lerp(r.yaw, desiredYaw, Math.min(1, dt * 6));
        } else {
          const lookIdx = (r.trackIndex + 10) % this.samples;
          const tp = this.trackPoints[lookIdx].clone().addScaledVector(this.trackRights[lookIdx], r.aiLane);
          const desiredYaw = Math.atan2(-(tp.x - r.pos.x), -(tp.z - r.pos.z));
          let diff = desiredYaw - r.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          r.yaw += THREE.MathUtils.clamp(diff * 2.6, -2.5, 2.5) * dt;
        }
        r.speed = THREE.MathUtils.lerp(r.speed, maxSpd * r.aiSkill, Math.min(1, dt * 3.8));
      }

      // Move kart
      r.pos.x += -Math.sin(r.yaw) * r.speed * dt;
      r.pos.z += -Math.cos(r.yaw) * r.speed * dt;

      // Track bounds & progress
      if (this.mode === 'sprint') {
        const lim = this.roadWidth / 2 - 1.5;
        if (Math.abs(r.pos.x) > lim) {
          r.pos.x = Math.sign(r.pos.x) * (lim - 0.3);
          r.yaw *= 0.4;
        }
        r.progress = THREE.MathUtils.clamp(-r.pos.z / this.sprintLength, 0, 1.2);
        if (!r.finished && -r.pos.z >= this.sprintLength) {
          r.finished = true;
          r.finishTime = this.raceTime;
        }
      } else {
        const prevT = r.trackIndex / this.samples;
        const c = this._getClosestCircuit(r.pos, r.trackIndex);
        r.trackIndex = c.index;
        r.pos.y = THREE.MathUtils.lerp(r.pos.y, c.point.y, Math.min(1, dt * 14));
        const lim = this.roadWidth / 2 - 1.4;
        if (Math.abs(c.lat) > lim) {
          const sign = Math.sign(c.lat);
          const safe = c.point.clone().addScaledVector(c.right, sign * (lim - 0.5));
          r.pos.x = safe.x;
          r.pos.z = safe.z;
          const tYaw = Math.atan2(-c.tangent.x, -c.tangent.z);
          let ad = tYaw - r.yaw;
          while (ad > Math.PI) ad -= Math.PI * 2;
          while (ad < -Math.PI) ad += Math.PI * 2;
          r.yaw += ad * 0.55;
        }
        if (c.t > 0.4 && c.t < 0.65) r.passedHalf = true;
        r.progress = r.passedHalf ? c.t : (c.t > 0.8 ? c.t - 1 : c.t);
        if (!r.finished && r.passedHalf && prevT > 0.82 && c.t < 0.18) {
          r.finished = true;
          r.finishTime = this.raceTime;
          r.progress = 1.1;
        }
      }

      // Boost Pads
      if (r.padCd <= 0) {
        for (const pad of this.boostPads) {
          if ((r.pos.x - pad.pos.x) ** 2 + (r.pos.z - pad.pos.z) ** 2 < pad.radius * pad.radius) {
            r.boostTimer = Math.max(r.boostTimer, 1.15);
            r.padCd = 1.0;
            if (r.isHuman) this.audio.playBoost();
            break;
          }
        }
      }

      // Obstacles
      if (r.obsCd <= 0 && r.spinTimer <= 0) {
        for (const o of this.obstacles) {
          if ((r.pos.x - o.pos.x) ** 2 + (r.pos.z - o.pos.z) ** 2 < 7.5) {
            r.spinTimer = 0.75;
            r.obsCd = 1.4;
            r.speed *= 0.35;
            if (r.isHuman) {
              this.audio.playHit();
              onBanner(`💥 ${r.player.name} 撞到路障！`);
            }
            break;
          }
        }
      }

      // Item boxes (Circuit mode)
      if (!r.item) {
        for (const b of this.itemBoxes) {
          if (b.respawn > 0) continue;
          if ((r.pos.x - b.pos.x) ** 2 + (r.pos.z - b.pos.z) ** 2 < 7.0) {
            b.respawn = 8;
            b.mesh.visible = false;
            const pool = ['nitro', 'missile', 'blizzard'];
            r.item = pool[Math.floor(Math.random() * pool.length)];
            if (r.isHuman) this.audio.playCoin();
            break;
          }
        }
      }

      // Visuals
      r.kart.root.position.copy(r.pos);
      if (r.spinTimer <= 0) r.kart.root.rotation.y = r.yaw;
      for (const w of r.kart.wheels) w.rotation.x -= r.speed * dt * 2.0;
      for (const fl of r.kart.flames) fl.visible = r.boostTimer > 0;
    }

    // Finish trigger: as soon as 1st place finishes (or 28s timeout)!
    const winner = this.racers.find((r) => r.finished);
    if (!this.finished && (winner || this.raceTime > 28)) {
      this.finished = true;
      const sorted = [...this.racers].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.progress - a.progress;
      });
      this.audio.playWin();
      setTimeout(() => {
        if (this.onFinish) this.onFinish(sorted.map((r) => r.player));
      }, 950);
    }

    const sortedNow = [...this.racers].sort((a, b) => b.progress - a.progress);
    return {
      countdown: 0,
      sorted: sortedNow,
      time: this.raceTime,
    };
  }
}
