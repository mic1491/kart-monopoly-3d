// Main Controller for 3D Kart Monopoly (大富翁 × 積木卡丁車：贏家買地制！)
import { SoundFX } from './audio.js';
import { BOARD_TILES, PLAYER_PRESETS, MonopolyBoard3D, createMiniLegoKart } from './board.js';
import { MiniKartRace } from './race.js';

const MONOPOLY_CARDS = [
  { id: 'remote_dice', name: '🎯 遙控骰子', desc: '下次擲骰直接指定走 1～6 步！' },
  { id: 'missile_house', name: '🚀 飛彈炸房子', desc: '轟炸對手最高級建築降 1 級！' },
  { id: 'blizzard_turn', name: '🌨️ 冰風暴凍結', desc: '冰凍領先對手，讓他跳過 1 回合！' },
  { id: 'double_rent', name: '🧧 財神雙倍租', desc: '下次收過路費直接變 2 倍！' },
  { id: 'free_build', name: '🏗️ 免費蓋樓卡', desc: '立刻免費升級自己一塊地 +1 級！' },
];

const CHANCE_EVENTS = [
  { icon: '💰', title: '樂高彩券中獎！', desc: '恭喜獲得額外獎金 +$260！', fn: (p) => { p.money += 260; } },
  { icon: '🦖', title: '暴龍踩扁車輪！', desc: '緊急修車花了 -$120！', fn: (p) => { p.money = Math.max(0, p.money - 120); } },
  { icon: '🎁', title: '粉絲送禮！', desc: '全場其他玩家每人送你 $60！', fn: (p, all) => { for (const o of all) if (o !== p) { const pay = Math.min(o.money, 60); o.money -= pay; p.money += pay; } } },
  { icon: '🚀', title: '傳送門直飛起點！', desc: '直接飛回起點並領取 +$300！', fn: (p) => { p.tile = 0; p.money += 300; } },
];

const audio = new SoundFX();

// DOM
const canvas = document.getElementById('game-canvas');
const splitDivider = document.getElementById('split-divider');
const lobbyScreen = document.getElementById('lobby-screen');
const boardHud = document.getElementById('board-hud');
const raceHud = document.getElementById('race-hud');
const touchControlsEl = document.getElementById('touch-controls');
const roundPill = document.getElementById('round-pill');
const playersStrip = document.getElementById('players-strip');
const boardToast = document.getElementById('board-toast');
const actionDock = document.getElementById('action-dock');
const turnWhoEl = document.getElementById('turn-who');
const rollBtn = document.getElementById('roll-btn');
const cardsBtn = document.getElementById('cards-btn');
const cardCountEl = document.getElementById('card-count');
const modalOverlay = document.getElementById('modal-overlay');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalActions = document.getElementById('modal-actions');
const raceTagEl = document.getElementById('race-tag');
const raceStandingsEl = document.getElementById('race-standings');
const raceCountdownEl = document.getElementById('race-countdown');
const raceBannerEl = document.getElementById('race-banner');
const raceItemPill = document.getElementById('race-item-pill');
const gpBadge = document.getElementById('gp-badge');

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x38bdf8);
scene.fog = new THREE.Fog(0x38bdf8, 120, 360);

const cam1 = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.5, 600);
const cam2 = new THREE.PerspectiveCamera(58, window.innerWidth / 2 / window.innerHeight, 0.5, 600);
cam1.position.set(0, 42, 42);
cam1.lookAt(0, 0, 0);

const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x166534, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfffbeb, 1.5);
sun.position.set(45, 75, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const board3D = new MonopolyBoard3D(scene);
let pendingRaceContext = null;
const miniRace = new MiniKartRace(scene, audio, (sortedPlayers) => onMiniRaceFinished(sortedPlayers));

// Game State
let humanCount = 1;
let maxRounds = 8;
let currentRound = 1;
let turnIdx = 0;
let appMode = 'lobby'; // 'lobby' | 'board' | 'race' | 'gameover'
let turnBusy = false;
let players = [];
let properties = new Map(); // tileId -> { ownerId, level }
let toastTimer = 0;
let bannerTimer = 0;
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Controls (Keyboard + Touch + Dual Gamepad / Arcade Stick!)
const keys = {};
let touchSteer = 0;
const gpState = [
  { accel: false, brake: false, left: false, right: false, drift: false, use: false, steer: 0 },
  { accel: false, brake: false, left: false, right: false, drift: false, use: false, steer: 0 },
];
const gpPrevUse = [false, false];

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && appMode === 'board' && !turnBusy && modalOverlay.classList.contains('hidden')) {
    const cur = players[turnIdx];
    if (cur && cur.isHuman) {
      e.preventDefault();
      rollDiceForCurrentPlayer();
    }
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Prevent iOS Safari double-tap zoom
let lastTapAt = 0;
document.addEventListener('touchend', (e) => {
  if (e.target && e.target.closest && e.target.closest('#race-hud, #touch-controls, button, .steer-pad')) {
    const now = Date.now();
    if (now - lastTapAt < 320) e.preventDefault();
    lastTapAt = now;
  }
}, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

// Bind touch steer pad & buttons
(() => {
  const pad = document.getElementById('steer-pad');
  const knob = document.getElementById('steer-knob');
  const halves = pad ? pad.querySelectorAll('.steer-half') : [];
  let activeId = null;
  const setFrom = (e) => {
    const rect = pad.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mag = THREE.MathUtils.clamp((Math.abs(rel) - 0.1) / 0.6, 0, 1);
    touchSteer = -Math.sign(rel) * mag;
    knob.style.transform = `translateX(${THREE.MathUtils.clamp(rel, -1, 1) * rect.width * 0.42}px)`;
    if (halves[0]) halves[0].classList.toggle('on', touchSteer > 0.05);
    if (halves[1]) halves[1].classList.toggle('on', touchSteer < -0.05);
  };
  const end = (e) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    touchSteer = 0;
    pad.classList.remove('active');
    knob.style.transform = '';
    halves.forEach((h) => h.classList.remove('on'));
  };
  if (pad) {
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); activeId = e.pointerId; pad.classList.add('active'); setFrom(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === activeId) setFrom(e); });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }
  const bindHold = (id, keyCode) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[keyCode] = true; el.classList.add('pressed'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => el.addEventListener(ev, () => { keys[keyCode] = false; el.classList.remove('pressed'); }));
  };
  bindHold('btn-brake', 'KeyS');
  bindHold('btn-drift', 'ShiftLeft');
  bindHold('btn-use', 'Space');
})();

function pollGamepads() {
  if (!navigator.getGamepads) return;
  const active = Array.from(navigator.getGamepads()).filter((g) => g && g.connected);
  gpBadge.classList.toggle('hidden', active.length === 0);
  if (active.length > 0) gpBadge.textContent = `🕹️ 已連接 ${active.length} 支搖桿/手把`;
  for (let i = 0; i < 2; i++) {
    const gp = active[i];
    if (!gp) {
      gpState[i] = { accel: false, brake: false, left: false, right: false, drift: false, use: false, steer: 0 };
      continue;
    }
    const ax0 = gp.axes[0] || 0;
    const ax1 = gp.axes[1] || 0;
    const btns = gp.buttons || [];
    const b = (idx) => !!(btns[idx] && (btns[idx].pressed || btns[idx].value > 0.35));
    const useNow = b(3) || b(4);
    gpState[i] = {
      accel: b(0) || b(7) || ax1 < -0.35,
      brake: b(1) || b(6) || ax1 > 0.35,
      left: ax0 < -0.25 || b(14),
      right: ax0 > 0.25 || b(15),
      drift: b(2) || b(5),
      use: useNow && !gpPrevUse[i],
      steer: Math.abs(ax0) > 0.15 ? -ax0 : 0,
    };
    gpPrevUse[i] = useNow;
  }
}

function getRaceInput(slot) {
  const gp = gpState[slot] || gpState[0];
  const isSplit = miniRace.humanRacers.length >= 2;
  if (isSplit) {
    if (slot === 0) {
      return {
        accel: !!(keys['KeyW'] || gp.accel),
        brake: !!(keys['KeyS'] || gp.brake),
        left: !!(keys['KeyA'] || gp.left),
        right: !!(keys['KeyD'] || gp.right),
        drift: !!(keys['ShiftLeft'] || gp.drift),
        use: !!(keys['Space'] || gp.use),
        steer: gp.steer,
      };
    }
    return {
      accel: !!(keys['ArrowUp'] || gp.accel),
      brake: !!(keys['ArrowDown'] || gp.brake),
      left: !!(keys['ArrowLeft'] || gp.left),
      right: !!(keys['ArrowRight'] || gp.right),
      drift: !!(keys['ShiftRight'] || gp.drift),
      use: !!(keys['Enter'] || gp.use),
      steer: gp.steer,
    };
  }
  const autoGas = isTouchDevice && !keys['KeyS'] && !keys['ArrowDown'];
  return {
    accel: !!(keys['KeyW'] || keys['ArrowUp'] || autoGas || gp.accel),
    brake: !!(keys['KeyS'] || keys['ArrowDown'] || gp.brake),
    left: !!(keys['KeyA'] || keys['ArrowLeft'] || gp.left),
    right: !!(keys['KeyD'] || keys['ArrowRight'] || gp.right),
    drift: !!(keys['ShiftLeft'] || keys['ShiftRight'] || gp.drift),
    use: !!(keys['Space'] || keys['Enter'] || gp.use),
    steer: touchSteer !== 0 ? touchSteer : gp.steer,
  };
}

// Lobby buttons
document.querySelectorAll('#player-mode-group .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#player-mode-group .pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    humanCount = Number(btn.dataset.humans);
  });
});
document.querySelectorAll('#rounds-group .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#rounds-group .pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    maxRounds = Number(btn.dataset.rounds);
  });
});

document.getElementById('start-game-btn').addEventListener('click', startNewBoardGame);
document.getElementById('mute-btn').addEventListener('click', (e) => {
  audio.muted = !audio.muted;
  e.currentTarget.textContent = audio.muted ? '🔇' : '🔊';
});
document.getElementById('home-btn').addEventListener('click', () => {
  miniRace.stop();
  board3D.group.visible = true;
  appMode = 'lobby';
  boardHud.classList.add('hidden');
  raceHud.classList.add('hidden');
  modalOverlay.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
});
rollBtn.addEventListener('click', () => rollDiceForCurrentPlayer());
cardsBtn.addEventListener('click', () => openCardsModal());

function showToast(msg, dur = 2.4) {
  boardToast.textContent = msg;
  boardToast.classList.remove('hidden');
  toastTimer = dur;
}

function showRaceBanner(msg) {
  raceBannerEl.textContent = msg;
  raceBannerEl.classList.remove('hidden');
  bannerTimer = 1.6;
}

function showModal(icon, title, desc, buttons) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalDesc.innerHTML = desc;
  modalActions.innerHTML = '';
  buttons.forEach((b) => {
    const el = document.createElement('button');
    el.className = b.primary ? 'primary-btn' : 'secondary-btn';
    el.textContent = b.label;
    el.disabled = !!b.disabled;
    el.addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
      if (b.onClick) b.onClick();
    });
    modalActions.appendChild(el);
  });
  modalOverlay.classList.remove('hidden');
}

function startNewBoardGame() {
  audio.init();
  audio.playBuy();
  lobbyScreen.classList.add('hidden');
  boardHud.classList.remove('hidden');
  raceHud.classList.add('hidden');
  modalOverlay.classList.add('hidden');
  board3D.group.visible = true;

  // Clear old board karts & buildings
  for (const p of players) if (p.boardKart) board3D.group.remove(p.boardKart.root);
  properties.clear();
  BOARD_TILES.forEach((t) => board3D.updatePropertyVisual(t.id, null, 0));

  currentRound = 1;
  turnIdx = 0;
  turnBusy = false;
  appMode = 'board';

  players = PLAYER_PRESETS.map((pr, idx) => {
    const isHuman = idx < humanCount;
    const kart = createMiniLegoKart(pr.hex, pr.accent);
    kart.root.scale.setScalar(0.82);
    const pos = board3D.getTileWorldPos(0, idx);
    kart.root.position.copy(pos);
    board3D.group.add(kart.root);
    return {
      ...pr,
      name: isHuman ? (humanCount === 2 ? `玩家${idx + 1}・${pr.name}` : `你・${pr.name}`) : `電腦・${pr.name}`,
      isHuman,
      money: 1500,
      tile: 0,
      frozenTurns: 0,
      doubleRent: false,
      cards: [MONOPOLY_CARDS[idx % MONOPOLY_CARDS.length]],
      boardKart: kart,
      targetPos: pos.clone(),
    };
  });

  renderBoardHUD();
  beginTurn();
}

function getNetWorth(p) {
  let propVal = 0;
  for (const [tileId, info] of properties.entries()) {
    if (info.ownerId === p.id) {
      const t = BOARD_TILES[tileId];
      propVal += t.price + (info.level - 1) * Math.round(t.price * 0.5);
    }
  }
  return p.money + propVal;
}

function renderBoardHUD() {
  roundPill.textContent = `第 ${currentRound} / ${maxRounds} 回合`;
  playersStrip.innerHTML = '';
  players.forEach((p, idx) => {
    let lands = 0;
    for (const info of properties.values()) if (info.ownerId === p.id) lands++;
    const chip = document.createElement('div');
    chip.className = 'p-chip' + (idx === turnIdx ? ' active' : '');
    chip.innerHTML = `
      <span class="p-dot" style="background:${p.color}"></span>
      <span>${p.name}</span>
      <span style="color:#fde047">$${p.money}</span>
      <span style="color:#86efac">🏠${lands}</span>
      ${p.frozenTurns > 0 ? '<span>🥶</span>' : ''}
      ${p.doubleRent ? '<span>🧧</span>' : ''}
    `;
    playersStrip.appendChild(chip);
  });

  const cur = players[turnIdx];
  if (cur) {
    turnWhoEl.textContent = `輪到：${cur.icon} ${cur.name}`;
    cardCountEl.textContent = cur.cards.length;
    actionDock.classList.toggle('hidden', !cur.isHuman || turnBusy);
    cardsBtn.disabled = cur.cards.length === 0;
  }
}

function beginTurn() {
  if (appMode !== 'board') return;
  const p = players[turnIdx];
  turnBusy = false;
  renderBoardHUD();

  if (p.frozenTurns > 0) {
    p.frozenTurns--;
    showToast(`🥶 ${p.name} 被冰風暴凍住，本回合跳過！`);
    turnBusy = true;
    setTimeout(() => nextTurn(), 1300);
    return;
  }

  if (!p.isHuman) {
    turnBusy = true;
    renderBoardHUD();
    setTimeout(() => rollDiceForCurrentPlayer(), 700);
  }
}

function openCardsModal() {
  const p = players[turnIdx];
  if (!p || !p.isHuman || p.cards.length === 0) return;
  const btns = p.cards.map((c, idx) => ({
    label: `${c.name}`,
    primary: true,
    onClick: () => useMonopolyCard(p, idx),
  }));
  btns.push({ label: '取消', primary: false });
  showModal('🃏', '選擇要使用的道具卡', '使用完道具卡後，依然可以繼續擲骰子喔！', btns);
}

function useMonopolyCard(p, cardIdx) {
  const card = p.cards.splice(cardIdx, 1)[0];
  audio.playCard();
  if (card.id === 'remote_dice') {
    showModal('🎯', '遙控骰子', '選擇這回合要精準走幾步：', [1, 2, 3, 4, 5, 6].map((n) => ({
      label: `走 ${n} 步`,
      primary: true,
      onClick: () => rollDiceForCurrentPlayer(n),
    })));
    return;
  }
  if (card.id === 'double_rent') {
    p.doubleRent = true;
    showToast(`🧧 ${p.name} 財神附身！下次收租變 2 倍！`);
  } else if (card.id === 'blizzard_turn') {
    const rival = players.filter((o) => o !== p).sort((a, b) => getNetWorth(b) - getNetWorth(a))[0];
    if (rival) {
      rival.frozenTurns = 1;
      showToast(`🌨️ ${p.name} 冰凍了 ${rival.name} 一回合！`);
    }
  } else if (card.id === 'missile_house') {
    let bestTile = -1, bestLv = 0;
    for (const [tid, info] of properties.entries()) {
      if (info.ownerId !== p.id && info.level > bestLv) { bestLv = info.level; bestTile = tid; }
    }
    if (bestTile >= 0) {
      const info = properties.get(bestTile);
      info.level = Math.max(1, info.level - 1);
      board3D.updatePropertyVisual(bestTile, players[info.ownerId].hex, info.level);
      audio.playHit();
      showToast(`🚀 飛彈轟炸了「${BOARD_TILES[bestTile].name}」降為 Lv.${info.level}！`);
    } else {
      showToast('🚀 目前沒有對手建築可炸，改送你 +$150！');
      p.money += 150;
    }
  } else if (card.id === 'free_build') {
    let upgraded = false;
    for (const [tid, info] of properties.entries()) {
      if (info.ownerId === p.id && info.level < 4) {
        info.level++;
        board3D.updatePropertyVisual(tid, p.hex, info.level);
        showToast(`🏗️ 免費升級「${BOARD_TILES[tid].name}」到 Lv.${info.level}！`);
        upgraded = true;
        break;
      }
    }
    if (!upgraded) {
      p.money += 200;
      showToast('🏗️ 沒有可升級的地，折換現金 +$200！');
    }
  }
  renderBoardHUD();
}

function rollDiceForCurrentPlayer(forcedSteps = null) {
  if (appMode !== 'board') return;
  const p = players[turnIdx];
  turnBusy = true;
  renderBoardHUD();

  const steps = forcedSteps || (1 + Math.floor(Math.random() * 6));
  audio.playDice();
  board3D.diceMesh.visible = true;
  showToast(`🎲 ${p.name} 擲出了 ${steps} 點！`, 1.8);

  setTimeout(() => {
    board3D.diceMesh.visible = false;
    stepMovePlayer(p, steps);
  }, 620);
}

function stepMovePlayer(p, remaining) {
  if (remaining <= 0) {
    resolveTileLanding(p);
    return;
  }
  p.tile = (p.tile + 1) % BOARD_TILES.length;
  p.targetPos = board3D.getTileWorldPos(p.tile, p.id);
  audio.playStep();
  if (p.tile === 0) {
    p.money += 300;
    audio.playCoin();
    showToast(`🏁 ${p.name} 經過起點！領取 +$300！`, 1.8);
    renderBoardHUD();
  }
  setTimeout(() => stepMovePlayer(p, remaining - 1), 240);
}

function resolveTileLanding(p) {
  const tile = BOARD_TILES[p.tile];
  renderBoardHUD();

  if (tile.type === 'start') {
    nextTurn();
    return;
  }
  if (tile.type === 'parking') {
    p.money += 200;
    const card = MONOPOLY_CARDS[Math.floor(Math.random() * MONOPOLY_CARDS.length)];
    p.cards.push(card);
    audio.playCoin();
    showToast(`⚡ ${p.name} 補血加氣 +$200 並獲得 ${card.name}！`);
    renderBoardHUD();
    setTimeout(() => nextTurn(), 1400);
    return;
  }
  if (tile.type === 'tax') {
    const loss = Math.min(p.money, 150);
    p.money -= loss;
    audio.playPay();
    showToast(`🦕 暴龍攔路收費！${p.name} 支付 -$${loss}！`);
    renderBoardHUD();
    setTimeout(() => nextTurn(), 1400);
    return;
  }
  if (tile.type === 'card') {
    const card = MONOPOLY_CARDS[Math.floor(Math.random() * MONOPOLY_CARDS.length)];
    p.cards.push(card);
    audio.playCard();
    showToast(`🃏 ${p.name} 抽到了【${card.name}】！`);
    renderBoardHUD();
    setTimeout(() => nextTurn(), 1400);
    return;
  }
  if (tile.type === 'chance') {
    const ev = CHANCE_EVENTS[Math.floor(Math.random() * CHANCE_EVENTS.length)];
    ev.fn(p, players);
    p.targetPos = board3D.getTileWorldPos(p.tile, p.id);
    audio.playCard();
    showToast(`${ev.icon} ${ev.title} ${ev.desc}`, 2.6);
    renderBoardHUD();
    setTimeout(() => nextTurn(), 1700);
    return;
  }
  if (tile.type === 'race_cup') {
    // All-player 10s Sprint for $400 bonus!
    launchMiniRace({
      mode: 'sprint',
      kind: 'cup_bonus',
      tile,
      triggerPlayer: p,
      participants: players,
      title: '🏎️ 全場 10秒獎金衝刺賽（冠軍 +$400）！',
    });
    return;
  }

  // PROPERTY TILE!
  const prop = properties.get(tile.id);

  // Case 1: EMPTY LAND -> Trigger 10-Second Sprint! WINNER GETS TO BUY!
  if (!prop) {
    if (p.isHuman || players.some((x) => x.isHuman)) {
      showModal(
        tile.icon,
        `⚡ 搶地 10 秒快閃賽！`,
        `${p.name} 踩到空地 <b>「${tile.name}」($${tile.price})</b>！<br/>全場立刻開跑 10 秒直線衝刺，<b>第 1 名贏家才能買下這塊地</b>！`,
        [{
          label: '🏁 馬上開跑搶地！',
          primary: true,
          onClick: () => launchMiniRace({
            mode: 'sprint',
            kind: 'empty_land',
            tile,
            triggerPlayer: p,
            participants: players,
            title: `⚡ 10秒搶地賽：${tile.icon} ${tile.name} ($${tile.price})`,
          }),
        }]
      );
    } else {
      nextTurn();
    }
    return;
  }

  // Case 2: OWN PROPERTY -> Upgrade LEGO Building!
  if (prop.ownerId === p.id) {
    const upgCost = Math.round(tile.price * 0.5);
    if (prop.level >= 4) {
      showToast(`👑 ${tile.name} 已是最高級摩天大樓！`);
      setTimeout(() => nextTurn(), 1100);
      return;
    }
    if (p.isHuman) {
      showModal(
        '🏗️',
        `升級你的「${tile.name}」`,
        `目前等級：<b>Lv.${prop.level}</b>（過路費 $${calcRent(tile, prop.level)}）<br/>花費 <b>$${upgCost}</b> 加蓋樂高樓層到 <b>Lv.${prop.level + 1}</b>（過路費漲到 $${calcRent(tile, prop.level + 1)}）！`,
        [
          {
            label: `✅ 加蓋 ($${upgCost})`,
            primary: true,
            disabled: p.money < upgCost,
            onClick: () => {
              p.money -= upgCost;
              prop.level++;
              board3D.updatePropertyVisual(tile.id, p.hex, prop.level);
              audio.playBuy();
              showToast(`🏗️ ${tile.name} 升級為 Lv.${prop.level} 樂高大樓！`);
              renderBoardHUD();
              setTimeout(() => nextTurn(), 900);
            },
          },
          { label: '暫不升級', primary: false, onClick: () => nextTurn() },
        ]
      );
    } else {
      if (p.money >= upgCost + 200) {
        p.money -= upgCost;
        prop.level++;
        board3D.updatePropertyVisual(tile.id, p.hex, prop.level);
        audio.playBuy();
        showToast(`🏗️ ${p.name} 加蓋了「${tile.name}」到 Lv.${prop.level}！`);
      }
      setTimeout(() => nextTurn(), 1100);
    }
    return;
  }

  // Case 3: RIVAL'S PROPERTY -> Pay Toll OR Launch 1-Lap Circuit Takeover Duel!
  const owner = players[prop.ownerId];
  const baseRent = calcRent(tile, prop.level);
  const rent = owner.doubleRent ? baseRent * 2 : baseRent;

  if (p.isHuman) {
    const duelParticipants = [p, owner];
    showModal(
      '🔥',
      `踩到 ${owner.name} 的「${tile.name}」Lv.${prop.level}！`,
      `過路費：<b>$${rent}</b>${owner.doubleRent ? '（🧧 雙倍！）' : ''}<br/>你可以選擇乖乖付錢，或發起 <b>🔥 1 圈正式搶地決鬥賽</b>：<br/>✅ 贏了：免租金＋7 折強制搶走這塊地！<br/>❌ 輸了：乖乖付 1.5 倍租金 ($${Math.round(rent * 1.5)})！`,
      [
        {
          label: `🔥 發起 1 圈搶地決鬥！`,
          primary: true,
          onClick: () => launchMiniRace({
            mode: 'circuit',
            kind: 'takeover_duel',
            tile,
            triggerPlayer: p,
            owner,
            rent,
            participants: duelParticipants,
            title: `🔥 1圈搶地決鬥：${p.name} vs ${owner.name}`,
          }),
        },
        {
          label: `💸 乖乖付 $${rent}`,
          primary: false,
          onClick: () => {
            payToll(p, owner, rent);
            setTimeout(() => nextTurn(), 900);
          },
        },
      ]
    );
  } else {
    // AI pays toll (or occasionally challenges a human owner!)
    if (owner.isHuman && Math.random() < 0.35 && p.money >= tile.price * 0.7) {
      showModal(
        '⚔️',
        `${p.name} 向你發起搶地決鬥！`,
        `${p.name} 踩到你的「${tile.name}」，不甘心付 $${rent}，要跟你跑 <b>1 圈卡丁車決鬥</b>守地！`,
        [{
          label: '🏎️ 接受挑戰守住地盤！',
          primary: true,
          onClick: () => launchMiniRace({
            mode: 'circuit',
            kind: 'takeover_duel',
            tile,
            triggerPlayer: p,
            owner,
            rent,
            participants: [owner, p],
            title: `🔥 守地 1 圈決鬥：${owner.name} vs ${p.name}`,
          }),
        }]
      );
    } else {
      payToll(p, owner, rent);
      setTimeout(() => nextTurn(), 1100);
    }
  }
}

function calcRent(tile, level) {
  return Math.round(tile.rent * (1 + (level - 1) * 0.85));
}

function payToll(payer, owner, amount) {
  const actual = Math.min(payer.money, amount);
  payer.money -= actual;
  owner.money += actual;
  owner.doubleRent = false;
  audio.playPay();
  showToast(`💸 ${payer.name} 付了 $${actual} 過路費給 ${owner.name}！`, 2.2);
  renderBoardHUD();
}

function launchMiniRace(ctx) {
  pendingRaceContext = ctx;
  appMode = 'race';
  board3D.group.visible = false;
  boardHud.classList.add('hidden');
  raceHud.classList.remove('hidden');
  raceTagEl.textContent = ctx.title;
  raceBannerEl.classList.add('hidden');

  miniRace.start({
    mode: ctx.mode,
    participants: ctx.participants,
    title: ctx.title,
    themeColor: ctx.tile ? ctx.tile.color : '#38bdf8',
  });

  const isSplit = miniRace.humanRacers.length >= 2;
  splitDivider.classList.toggle('hidden', !isSplit);
  touchControlsEl.classList.toggle('hidden', !isTouchDevice || isSplit);
}

function onMiniRaceFinished(sortedPlayers) {
  const ctx = pendingRaceContext;
  miniRace.stop();
  board3D.group.visible = true;
  raceHud.classList.add('hidden');
  splitDivider.classList.add('hidden');
  boardHud.classList.remove('hidden');
  appMode = 'board';

  const winner = sortedPlayers[0];
  renderBoardHUD();

  if (ctx.kind === 'cup_bonus') {
    winner.money += 400;
    audio.playBuy();
    showModal('🏆', `飆車冠軍：${winner.name}！`, `${winner.name} 奪下 10 秒快閃賽第 1 名，贏得獎金 <b>+$400</b>！`, [
      { label: '太棒了！繼續遊戲', primary: true, onClick: () => { renderBoardHUD(); nextTurn(); } },
    ]);
    return;
  }

  if (ctx.kind === 'empty_land') {
    const tile = ctx.tile;
    winner.money += 100; // Win bonus!
    if (winner.isHuman) {
      showModal(
        '🏆',
        `${winner.name} 贏得買地權！`,
        `恭喜奪下第 1 名（+$100 獎金）！<br/>你要以 <b>$${tile.price}</b> 買下 <b>${tile.icon} ${tile.name}</b> 並蓋出 3D 樂高車庫嗎？`,
        [
          {
            label: `🏠 買下「${tile.name}」($${tile.price})`,
            primary: true,
            disabled: winner.money < tile.price,
            onClick: () => {
              winner.money -= tile.price;
              properties.set(tile.id, { ownerId: winner.id, level: 1 });
              board3D.updatePropertyVisual(tile.id, winner.hex, 1);
              audio.playBuy();
              showToast(`🎉 ${winner.name} 買下了「${tile.name}」！`);
              renderBoardHUD();
              setTimeout(() => nextTurn(), 800);
            },
          },
          { label: '放棄購買', primary: false, onClick: () => { renderBoardHUD(); nextTurn(); } },
        ]
      );
    } else {
      if (winner.money >= tile.price) {
        winner.money -= tile.price;
        properties.set(tile.id, { ownerId: winner.id, level: 1 });
        board3D.updatePropertyVisual(tile.id, winner.hex, 1);
        audio.playBuy();
        showModal('🏎️', `${winner.name} 贏了並買下土地！`, `${winner.name} 搶先衝線，花 $${tile.price} 買走了 <b>${tile.icon} ${tile.name}</b>！`, [
          { label: '下一回合 ➔', primary: true, onClick: () => { renderBoardHUD(); nextTurn(); } },
        ]);
      } else {
        nextTurn();
      }
    }
    return;
  }

  if (ctx.kind === 'takeover_duel') {
    const { tile, triggerPlayer: challenger, owner, rent } = ctx;
    const prop = properties.get(tile.id);
    const buyoutPrice = Math.round(tile.price * 0.7);
    if (winner === challenger) {
      // Challenger won the 1-Lap Duel!
      if (challenger.isHuman) {
        showModal(
          '🔥',
          `決鬥大勝利！免付過路費！`,
          `${challenger.name} 擊敗了 ${owner.name}！<br/>你可以用 7 折價 <b>$${buyoutPrice}</b> 直接搶走 <b>${tile.name} (Lv.${prop.level})</b>！`,
          [
            {
              label: `🏴 強制搶地 ($${buyoutPrice})`,
              primary: true,
              disabled: challenger.money < buyoutPrice,
              onClick: () => {
                challenger.money -= buyoutPrice;
                owner.money += buyoutPrice;
                prop.ownerId = challenger.id;
                board3D.updatePropertyVisual(tile.id, challenger.hex, prop.level);
                audio.playBuy();
                showToast(`🏴 ${challenger.name} 成功搶下「${tile.name}」！`);
                renderBoardHUD();
                setTimeout(() => nextTurn(), 800);
              },
            },
            { label: '只要免租金就好', primary: false, onClick: () => { renderBoardHUD(); nextTurn(); } },
          ]
        );
      } else {
        if (challenger.money >= buyoutPrice) {
          challenger.money -= buyoutPrice;
          owner.money += buyoutPrice;
          prop.ownerId = challenger.id;
          board3D.updatePropertyVisual(tile.id, challenger.hex, prop.level);
        }
        showModal('😱', `${challenger.name} 搶地成功！`, `${challenger.name} 贏了 1 圈決鬥，把你的「${tile.name}」買走了！`, [
          { label: '繼續遊戲', primary: true, onClick: () => { renderBoardHUD(); nextTurn(); } },
        ]);
      }
    } else {
      // Owner defended!
      const penalty = Math.round(rent * 1.5);
      payToll(challenger, owner, penalty);
      showModal('🛡️', `${owner.name} 守地成功！`, `${challenger.name} 挑戰失敗，乖乖支付 1.5 倍過路費 <b>$${penalty}</b>！`, [
        { label: '繼續遊戲', primary: true, onClick: () => { renderBoardHUD(); nextTurn(); } },
      ]);
    }
  }
}

function nextTurn() {
  if (appMode !== 'board') return;
  turnIdx++;
  if (turnIdx >= players.length) {
    turnIdx = 0;
    currentRound++;
    if (currentRound > maxRounds) {
      finishBoardGame();
      return;
    }
  }
  beginTurn();
}

function finishBoardGame() {
  appMode = 'gameover';
  audio.playWin();
  const ranked = [...players].sort((a, b) => getNetWorth(b) - getNetWorth(a));
  const rows = ranked.map((p, i) => `<div>#${i + 1} ${p.icon} <b>${p.name}</b> — 總資產 <b style="color:#fde047">$${getNetWorth(p)}</b>（現金 $${p.money}）</div>`).join('');
  showModal('🏆', `總冠軍：${ranked[0].name}！`, `恭喜稱霸《積木大富翁車神 3D》！<br/><br/>${rows}`, [
    { label: '🎲 再玩一局', primary: true, onClick: () => startNewBoardGame() },
    { label: '🏠 回大廳', primary: false, onClick: () => { boardHud.classList.add('hidden'); lobbyScreen.classList.remove('hidden'); appMode = 'lobby'; } },
  ]);
}

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  cam1.aspect = window.innerWidth / window.innerHeight;
  cam1.updateProjectionMatrix();
});

// Main Loop
let lastTime = performance.now();
let elapsed = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;

  pollGamepads();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) boardToast.classList.add('hidden');
  }
  if (bannerTimer > 0) {
    bannerTimer -= dt;
    if (bannerTimer <= 0) raceBannerEl.classList.add('hidden');
  }

  if (appMode === 'race' && miniRace.active) {
    const info = miniRace.update(dt, getRaceInput, showRaceBanner);
    if (info) {
      if (info.countdown > 0) {
        raceCountdownEl.classList.remove('hidden');
        raceCountdownEl.textContent = info.countdown;
      } else {
        raceCountdownEl.classList.add('hidden');
        if (info.sorted) {
          raceStandingsEl.innerHTML = info.sorted.map((r, i) => `<span class="r-badge">#${i + 1} ${r.player.icon}${r.player.name}</span>`).join('');
        }
      }
      const p1r = miniRace.humanRacers[0];
      if (p1r) {
        const iMap = { nitro: '⚡ 黃金氮氣', missile: '🚀 追蹤飛彈', blizzard: '🌨️ 冰風暴' };
        raceItemPill.textContent = p1r.item ? `道具：${iMap[p1r.item]}（Space/橘鍵使用）` : '道具：無';
      }
    }

    const isSplit = miniRace.humanRacers.length >= 2;
    const w = window.innerWidth, h = window.innerHeight;
    if (isSplit) {
      renderer.setScissorTest(true);
      [miniRace.humanRacers[0], miniRace.humanRacers[1]].forEach((r, idx) => {
        const cam = idx === 0 ? cam1 : cam2;
        cam.aspect = (w / 2) / h;
        cam.updateProjectionMatrix();
        const bx = Math.sin(r.yaw), bz = Math.cos(r.yaw);
        cam.position.lerp(new THREE.Vector3(r.pos.x + bx * 11, r.pos.y + 5.2, r.pos.z + bz * 11), Math.min(1, dt * 10));
        cam.lookAt(r.pos.x - bx * 10, r.pos.y + 1.4, r.pos.z - bz * 10);
        renderer.setViewport(idx === 0 ? 0 : w / 2, 0, w / 2, h);
        renderer.setScissor(idx === 0 ? 0 : w / 2, 0, w / 2, h);
        renderer.render(scene, cam);
      });
      renderer.setScissorTest(false);
    } else {
      const r = miniRace.humanRacers[0] || miniRace.racers[0];
      if (r) {
        cam1.aspect = w / h;
        cam1.updateProjectionMatrix();
        const bx = Math.sin(r.yaw), bz = Math.cos(r.yaw);
        cam1.position.lerp(new THREE.Vector3(r.pos.x + bx * 11.5, r.pos.y + 5.2, r.pos.z + bz * 11.5), Math.min(1, dt * 10));
        cam1.lookAt(r.pos.x - bx * 12, r.pos.y + 1.4, r.pos.z - bz * 12);
      }
      renderer.setViewport(0, 0, w, h);
      renderer.render(scene, cam1);
    }
  } else {
    // 3D Monopoly Board View!
    board3D.update(dt, elapsed);
    for (const p of players) {
      if (p.boardKart && p.targetPos) {
        p.boardKart.root.position.lerp(p.targetPos, Math.min(1, dt * 12));
      }
    }
    const focusP = players[turnIdx];
    const orbitX = Math.sin(elapsed * 0.14) * 14 + (focusP ? focusP.boardKart.root.position.x * 0.35 : 0);
    const orbitZ = 34 + (focusP ? focusP.boardKart.root.position.z * 0.35 : 0);
    cam1.aspect = window.innerWidth / window.innerHeight;
    cam1.updateProjectionMatrix();
    cam1.position.lerp(new THREE.Vector3(orbitX, 34, orbitZ), Math.min(1, dt * 4));
    cam1.lookAt(focusP ? focusP.boardKart.root.position.x * 0.35 : 0, 1.5, focusP ? focusP.boardKart.root.position.z * 0.35 : 0);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render(scene, cam1);
  }
}

requestAnimationFrame(animate);
