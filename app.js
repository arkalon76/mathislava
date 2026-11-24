'use strict';

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const rad = Math.min(Array.isArray(r) ? r[0] : r || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

/* ==========================================================================
   CONSTANTS & CONFIGURATION
   ========================================================================== */

const STORAGE_KEY = 'rising_lava_obby_v2';

const WEIGHT_CLASSES = {
  junior: {
    id: 'junior',
    label: 'Junior Class',
    baseLavaSpeed: 0.78,
    rampPerMeter: 0.0022,
    missingFactorRate: 0,
    maxFactor: 10
  },
  pro: {
    id: 'pro',
    label: 'Pro Class',
    baseLavaSpeed: 1.25,
    rampPerMeter: 0.0045,
    missingFactorRate: 0.35,
    maxFactor: 12
  }
};

const HATS = [
  { id: 'none', name: 'No Hat', icon: '🙂', minDist: 0 },
  { id: 'cone', name: 'Traffic Cone', icon: '🚧', minDist: 40 },
  { id: 'propeller', name: 'Propeller Cap', icon: '🪁', minDist: 120 },
  { id: 'chicken', name: 'Rubber Chicken', icon: '🐔', minDist: 250 },
  { id: 'fishbowl', name: 'Astro Fishbowl', icon: '🐠', minDist: 450 },
  { id: 'crown', name: 'Flaming Crown', icon: '👑', minDist: 750 }
];

const BIOMES = [
  {
    id: 'kitchen',
    name: 'Noob Kitchen',
    icon: '🍳',
    minAlt: 0,
    hazardName: 'Tomato Soup',
    skyTop: '#2a1d3d',
    skyBottom: '#4b2839',
    hazardTop: '#ff5238',
    hazardDeep: '#b81d13',
    accent: '#ffcf66',
    wipeoutEmoji: '🍲',
    wipeoutTitle: 'Simmered in Tomato Soup!',
    wipeoutSub: 'Watch out for those giant floating croutons next time!'
  },
  {
    id: 'construction',
    name: 'Wacky Construction',
    icon: '🏗️',
    minAlt: 50,
    hazardName: 'Nacho Cheese',
    skyTop: '#1d324d',
    skyBottom: '#3c4c63',
    hazardTop: '#ffbe2e',
    hazardDeep: '#d47400',
    accent: '#38ef7d',
    wipeoutEmoji: '🧀',
    wipeoutTitle: 'Dunked in Nacho Cheese!',
    wipeoutSub: 'Extra gooey, extra cheesy — aim for the green trampolines!'
  },
  {
    id: 'lab',
    name: 'Mad Scientist Lab',
    icon: '🧪',
    minAlt: 100,
    hazardName: 'Radioactive Slime',
    skyTop: '#112a2e',
    skyBottom: '#1c4743',
    hazardTop: '#6eff47',
    hazardDeep: '#1d9423',
    accent: '#7be9ff',
    wipeoutEmoji: '🧪',
    wipeoutTitle: 'Gooped by Radioactive Slime!',
    wipeoutSub: 'Good news: your shoes glow in the dark now!'
  },
  {
    id: 'orbit',
    name: 'Low Earth Orbit',
    icon: '🛸',
    minAlt: 150,
    hazardName: 'Plasma Nebula',
    skyTop: '#080a1c',
    skyBottom: '#1b1442',
    hazardTop: '#e85cff',
    hazardDeep: '#6b1bb8',
    accent: '#ffe36e',
    wipeoutEmoji: '🛸',
    wipeoutTitle: 'Zapped by Plasma Nebula!',
    wipeoutSub: 'Houston, the math thrusters need a recharge!'
  }
];

function getBiomeForAlt(alt) {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (alt >= BIOMES[i].minAlt) return BIOMES[i];
  }
  return BIOMES[0];
}

/* ==========================================================================
   1. STATE STORE (localStorage persistence, profiles, stats, leaderboard)
   ========================================================================== */

class StateStore {
  constructor() {
    this.memoryFallback = null;
    this.state = this.load();
  }

  createDefaultState() {
    return {
      selectedPlayerId: 'player1',
      muted: false,
      players: {
        player1: {
          id: 'player1',
          name: 'Player 1',
          weightClass: 'junior',
          color: '#2ec4ff',
          accent: '#ffcf33',
          comfortTables: [2, 3, 4, 5, 10],
          newTables: [6, 7],
          focusTable: null,
          bestAltitude: 0,
          bestStreak: 0,
          totalDistance: 0,
          equippedHat: 'none',
          facts: {},
          ghost: []
        },
        player2: {
          id: 'player2',
          name: 'Player 2',
          weightClass: 'pro',
          color: '#8b5cf6',
          accent: '#38ef7d',
          comfortTables: [6, 7, 8, 9, 11, 12],
          newTables: [13, 14],
          focusTable: null,
          bestAltitude: 0,
          bestStreak: 0,
          totalDistance: 0,
          equippedHat: 'none',
          facts: {},
          ghost: []
        }
      }
    };
  }

  load() {
    const defaults = this.createDefaultState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.players) return defaults;

      const merged = {
        ...defaults,
        ...parsed,
        players: { ...defaults.players }
      };

      for (const id of Object.keys(defaults.players)) {
        if (parsed.players[id]) {
          merged.players[id] = {
            ...defaults.players[id],
            ...parsed.players[id],
            focusTable:
              Number.isInteger(parsed.players[id].focusTable) &&
              parsed.players[id].focusTable >= 2 &&
              parsed.players[id].focusTable <= 15
                ? parsed.players[id].focusTable
                : null,
            facts: parsed.players[id].facts || {},
            ghost: Array.isArray(parsed.players[id].ghost) ? parsed.players[id].ghost : []
          };
        }
      }
      if (!merged.players[merged.selectedPlayerId]) {
        merged.selectedPlayerId = 'player1';
      }
      return merged;
    } catch (_err) {
      return defaults;
    }
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_err) {
      this.memoryFallback = JSON.stringify(this.state);
    }
  }

  getPlayers() {
    return Object.values(this.state.players);
  }

  getPlayer(id) {
    return this.state.players[id] || this.state.players.player1;
  }

  getSelectedPlayer() {
    return this.getPlayer(this.state.selectedPlayerId);
  }

  setSelectedPlayer(id) {
    if (this.state.players[id]) {
      this.state.selectedPlayerId = id;
      this.save();
    }
  }

  setFocusTable(playerId, tableNum) {
    const player = this.getPlayer(playerId);
    if (tableNum === null || tableNum === undefined) {
      player.focusTable = null;
    } else if (Number.isInteger(tableNum) && tableNum >= 2 && tableNum <= 15) {
      player.focusTable = tableNum;
    }
    this.save();
  }

  getRival(playerId) {
    const ids = Object.keys(this.state.players);
    const rivalId = ids.find((id) => id !== playerId);
    return rivalId ? this.state.players[rivalId] : null;
  }

  isMuted() {
    return Boolean(this.state.muted);
  }

  setMuted(muted) {
    this.state.muted = Boolean(muted);
    this.save();
  }

  getUnlockedHats(player) {
    return HATS.filter((hat) => (player.totalDistance || 0) >= hat.minDist);
  }

  getNextHat(player) {
    return HATS.find((hat) => (player.totalDistance || 0) < hat.minDist) || null;
  }

  equipHat(playerId, hatId) {
    const player = this.getPlayer(playerId);
    const hat = HATS.find((h) => h.id === hatId);
    if (!hat || player.totalDistance < hat.minDist) return false;
    player.equippedHat = hatId;
    this.save();
    return true;
  }

  recordFact(playerId, key, correct) {
    const player = this.getPlayer(playerId);
    const prev = player.facts[key] || { right: 0, wrong: 0, streak: 0 };
    if (correct) {
      player.facts[key] = {
        right: prev.right + 1,
        wrong: prev.wrong,
        streak: prev.streak + 1
      };
    } else {
      player.facts[key] = {
        right: prev.right,
        wrong: prev.wrong + 1,
        streak: 0
      };
    }
    this.save();
  }

  recordRunResult(playerId, { altitude, maxStreak, ghostSamples }) {
    const player = this.getPlayer(playerId);
    const prevUnlockedIds = new Set(this.getUnlockedHats(player).map((h) => h.id));
    const roundedAlt = Math.max(0, Math.round(altitude));

    player.totalDistance = (player.totalDistance || 0) + roundedAlt;
    if (maxStreak > (player.bestStreak || 0)) {
      player.bestStreak = maxStreak;
    }

    let isNewBest = false;
    if (roundedAlt > (player.bestAltitude || 0)) {
      player.bestAltitude = roundedAlt;
      player.ghost = Array.isArray(ghostSamples) ? ghostSamples : [];
      isNewBest = true;
    }

    const newlyUnlocked = this.getUnlockedHats(player).filter((h) => !prevUnlockedIds.has(h.id));
    if (newlyUnlocked.length > 0 && player.equippedHat === 'none') {
      player.equippedHat = newlyUnlocked[newlyUnlocked.length - 1].id;
    }

    this.save();
    return { isNewBest, newlyUnlocked, roundedAlt };
  }

  updatePlayerConfig(playerId, patch) {
    const player = this.getPlayer(playerId);
    if (typeof patch.name === 'string') {
      const trimmed = patch.name.trim();
      if (trimmed) player.name = trimmed.slice(0, 16);
    }
    if (patch.weightClass && WEIGHT_CLASSES[patch.weightClass]) {
      player.weightClass = patch.weightClass;
    }
    if (Array.isArray(patch.comfortTables)) {
      player.comfortTables = [...patch.comfortTables].sort((a, b) => a - b);
    }
    if (Array.isArray(patch.newTables)) {
      player.newTables = [...patch.newTables].sort((a, b) => a - b);
    }
    this.save();
  }

  resetPlayerFacts(playerId) {
    const player = this.getPlayer(playerId);
    player.facts = {};
    this.save();
  }

  getLeaderboard() {
    return this.getPlayers().sort((a, b) => {
      if (b.bestAltitude !== a.bestAltitude) return b.bestAltitude - a.bestAltitude;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return b.totalDistance - a.totalDistance;
    });
  }
}

/* ==========================================================================
   2. SOUND FX (Zero-dependency Web Audio API synthesizer)
   ========================================================================== */

class SoundFX {
  constructor(muted = false) {
    this.ctx = null;
    this.muted = muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  isMuted() {
    return this.muted;
  }

  unlock() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (_err) {
      // Audio unavailable
    }
  }

  ready() {
    if (this.muted) return false;
    this.unlock();
    return Boolean(this.ctx && this.ctx.state !== 'closed');
  }

  playClick() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.035);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_err) {
      // ignore audio error
    }
  }

  playJump(streak = 1) {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const clamped = Math.min(Math.max(streak, 0), 16);
      const baseFreq = 250 + clamped * 26;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.14);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch (_err) {
      // ignore audio error
    }
  }

  playMilestone() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.17);
      });
    } catch (_err) {
      // ignore audio error
    }
  }

  playBonk() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.24);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    } catch (_err) {
      // ignore audio error
    }
  }

  playCryoFreeze() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
      freqs.forEach((freq, i) => {
        const t = now + i * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (_err) {
      // ignore audio error
    }
  }

  playSizzle() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 0.55;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + duration);
      filter.Q.value = 1.4;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 0.4);
      subGain.gain.setValueAtTime(0.14, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.43);
    } catch (_err) {
      // ignore audio error
    }
  }

  playUnlock() {
    if (!this.ready()) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => {
        const t = now + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.31);
      });
    } catch (_err) {
      // ignore audio error
    }
  }
}

/* ==========================================================================
   3. QUESTION ENGINE (70/20/10 deck, Cryo-Freeze, Hints, Recovery)
   ========================================================================== */

class QuestionEngine {
  constructor() {
    this.recentKeys = [];
  }

  reset() {
    this.recentKeys = [];
  }

  static factKey(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `${lo}x${hi}`;
  }

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  buildHint(a, b, missingMode, answer) {
    if (missingMode) {
      const known = missingMode === 'left' ? b : a;
      const product = a * b;
      const mid = known * 5;
      if (answer <= 5) {
        return `Count by ${known}s until you hit ${product}!`;
      }
      if (answer >= 10) {
        return `Start at ${known} × 10 = ${known * 10}, then count up to ${product}!`;
      }
      return `Start at ${known} × 5 = ${mid}, then see how many more ${known}s reach ${product}!`;
    }

    const lo = Math.min(a, b);
    const hi = Math.max(a, b);

    if (lo === 9 || hi === 9) {
      const other = lo === 9 ? hi : lo;
      return `×9 trick: ${other} × 10 = ${other * 10}, minus ${other} = ${other * 10 - other}!`;
    }
    if (lo === 11 || hi === 11) {
      const other = lo === 11 ? hi : lo;
      return `×11 trick: ${other} × 10 (${other * 10}) + ${other}!`;
    }
    if (hi >= 12) {
      const rem = hi - 10;
      return `Split ${hi} into 10 + ${rem}: (${lo} × 10 = ${lo * 10}) + (${lo} × ${rem} = ${lo * rem})!`;
    }
    if (hi >= 6 && hi <= 8) {
      const rem = hi - 5;
      return `Start at ${lo} × 5 = ${lo * 5}, then add ${lo} × ${rem} (${lo * rem})!`;
    }
    if (lo === 4 || hi === 4) {
      const other = lo === 4 ? hi : lo;
      return `Double twice: ${other} × 2 = ${other * 2}, then double ${other * 2}!`;
    }
    if (lo === 5 || hi === 5) {
      const other = lo === 5 ? hi : lo;
      return `Half of ×10: ${other} × 10 = ${other * 10}, cut in half!`;
    }
    if (lo === 3 || hi === 3) {
      const other = lo === 3 ? hi : lo;
      return `Double ${other} (${other * 2}), then add one more ${other}!`;
    }
    return `Skip-count by ${hi}s, ${lo} times!`;
  }

  rememberKey(key) {
    this.recentKeys.push(key);
    if (this.recentKeys.length > 3) {
      this.recentKeys.shift();
    }
  }

  nextQuestion(player, { forceRecovery = false } = {}) {
    const wc = WEIGHT_CLASSES[player.weightClass] || WEIGHT_CLASSES.junior;
    const focusTable =
      Number.isInteger(player.focusTable) && player.focusTable >= 2 && player.focusTable <= 15
        ? player.focusTable
        : null;

    if (focusTable !== null) {
      return this.nextFocusQuestion(player, wc, focusTable, forceRecovery);
    }

    const comfortPool = player.comfortTables.length > 0 ? player.comfortTables : [2, 3, 4, 5, 10];
    const newPool = player.newTables.length > 0 ? player.newTables : comfortPool;

    if (forceRecovery) {
      const recoveryTables = [2, 3, 4, 5, 10];
      let a = 2;
      let b = 2;
      let key = '2x2';
      for (let attempt = 0; attempt < 12; attempt++) {
        a = this.pickRandom(recoveryTables);
        b = this.randInt(2, 9);
        key = QuestionEngine.factKey(a, b);
        if (!this.recentKeys.includes(key)) break;
      }
      if (Math.random() < 0.5) [a, b] = [b, a];
      this.rememberKey(key);
      return {
        a,
        b,
        key,
        tier: 'recovery',
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        jumpMeters: 4,
        cryoFreeze: false,
        missingMode: null,
        hint: this.buildHint(a, b, null, a * b)
      };
    }

    const bossKeys = Object.entries(player.facts || {})
      .filter(([, stat]) => stat && stat.wrong > 0 && stat.streak < 2)
      .map(([k]) => k);

    const roll = Math.random();
    let tier = 'comfort';
    let a = 2;
    let b = 2;
    let key = '2x2';
    let jumpMeters = 4;

    if (roll < 0.1 && bossKeys.length > 0) {
      tier = 'boss';
      jumpMeters = 12;
      const freshBoss = bossKeys.filter((k) => !this.recentKeys.includes(k));
      const pickedKey = this.pickRandom(freshBoss.length > 0 ? freshBoss : bossKeys);
      const parts = pickedKey.split('x').map(Number);
      a = parts[0] || 6;
      b = parts[1] || 7;
      if (Math.random() < 0.5) [a, b] = [b, a];
      key = pickedKey;
    } else if (roll < 0.3 && player.newTables.length > 0) {
      tier = 'new';
      for (let attempt = 0; attempt < 16; attempt++) {
        a = this.pickRandom(newPool);
        b = this.randInt(2, wc.maxFactor);
        key = QuestionEngine.factKey(a, b);
        if (!this.recentKeys.includes(key)) break;
      }
      if (Math.random() < 0.5) [a, b] = [b, a];
    } else {
      tier = 'comfort';
      for (let attempt = 0; attempt < 16; attempt++) {
        a = this.pickRandom(comfortPool);
        b = this.randInt(2, wc.maxFactor);
        key = QuestionEngine.factKey(a, b);
        if (!this.recentKeys.includes(key)) break;
      }
      if (Math.random() < 0.5) [a, b] = [b, a];
    }

    this.rememberKey(key);

    const stat = (player.facts || {})[key];
    const touchesNewTable = player.newTables.includes(a) || player.newTables.includes(b);
    const cryoFreeze = (tier === 'new' || touchesNewTable) && (!stat || stat.right < 3);

    return this.formatQuestion({ a, b, key, tier, jumpMeters, cryoFreeze, wc, focusTable: null });
  }

  nextFocusQuestion(player, wc, focusTable, forceRecovery) {
    if (forceRecovery) {
      const easyFactors = [2, 3, 4, 5, 10];
      let other = 2;
      let key = QuestionEngine.factKey(focusTable, other);
      for (let attempt = 0; attempt < 12; attempt++) {
        other = this.pickRandom(easyFactors);
        key = QuestionEngine.factKey(focusTable, other);
        if (!this.recentKeys.includes(key)) break;
      }
      let a = focusTable;
      let b = other;
      if (Math.random() < 0.5) [a, b] = [b, a];
      this.rememberKey(key);
      return {
        a,
        b,
        key,
        tier: 'recovery',
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        jumpMeters: 4,
        cryoFreeze: false,
        missingMode: null,
        focusTable,
        hint: this.buildHint(a, b, null, a * b)
      };
    }

    const bossKeys = Object.entries(player.facts || {})
      .filter(([k, stat]) => {
        if (!stat || stat.wrong <= 0 || stat.streak >= 2) return false;
        const [p1, p2] = k.split('x').map(Number);
        return p1 === focusTable || p2 === focusTable;
      })
      .map(([k]) => k);

    let tier = 'focus';
    let jumpMeters = 4;
    let a = focusTable;
    let b = 2;
    let key = QuestionEngine.factKey(a, b);

    if (Math.random() < 0.1 && bossKeys.length > 0) {
      tier = 'boss';
      jumpMeters = 12;
      const freshBoss = bossKeys.filter((k) => !this.recentKeys.includes(k));
      const pickedKey = this.pickRandom(freshBoss.length > 0 ? freshBoss : bossKeys);
      const parts = pickedKey.split('x').map(Number);
      a = parts[0] || focusTable;
      b = parts[1] || 2;
      key = pickedKey;
    } else {
      for (let attempt = 0; attempt < 16; attempt++) {
        b = this.randInt(2, wc.maxFactor);
        key = QuestionEngine.factKey(focusTable, b);
        if (!this.recentKeys.includes(key)) break;
      }
    }

    if (Math.random() < 0.5) [a, b] = [b, a];
    this.rememberKey(key);

    const stat = (player.facts || {})[key];
    const cryoFreeze = !stat || stat.right < 3;

    return this.formatQuestion({ a, b, key, tier, jumpMeters, cryoFreeze, wc, focusTable });
  }

  formatQuestion({ a, b, key, tier, jumpMeters, cryoFreeze, wc, focusTable }) {
    let missingMode = null;
    if (wc.missingFactorRate > 0 && Math.random() < wc.missingFactorRate) {
      missingMode = Math.random() < 0.5 ? 'left' : 'right';
    }

    const product = a * b;
    let prompt = `${a} × ${b} = ?`;
    let answer = product;

    if (missingMode === 'left') {
      prompt = `? × ${b} = ${product}`;
      answer = a;
    } else if (missingMode === 'right') {
      prompt = `${a} × ? = ${product}`;
      answer = b;
    }

    return {
      a,
      b,
      key,
      tier,
      prompt,
      answer,
      jumpMeters,
      cryoFreeze,
      missingMode,
      focusTable,
      hint: this.buildHint(a, b, missingMode, answer)
    };
  }
}

/* ==========================================================================
   4. OBBY ENGINE (HTML5 Canvas Renderer, Physics, Biomes, Ghost Rival)
   ========================================================================== */

class ObbyEngine {
  constructor(canvas, soundFX, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = soundFX;
    this.callbacks = callbacks;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = 640;
    this.viewH = 480;

    this.rafId = null;
    this.lastTs = 0;
    this.running = false;

    this.player = null;
    this.rival = null;
    this.wc = WEIGHT_CLASSES.junior;

    this.time = 0;
    this.playerAlt = 0;
    this.maxAlt = 0;
    this.playerXRatio = 0.5;
    this.lavaAlt = -8;
    this.cryoTimer = 0;
    this.slipTimer = 0;
    this.shakeTimer = 0;
    this.cameraAlt = -2;

    this.squashY = 1;
    this.squashX = 1;

    this.jumpAnim = null;
    this.platforms = [];
    this.highestGeneratedAlt = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.bananas = [];
    this.snowflakes = [];

    this.ghostSamples = [];
    this.nextGhostSampleTime = 0;
    this.ghostSpeech = { text: '', timer: 0, cooldown: 3.5 };
    this.prevGhostAhead = null;

    this.currentBiomeId = 'kitchen';

    this.initResizeObserver();
  }

  initResizeObserver() {
    const updateSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.viewW = rect.width;
      this.viewH = rect.height;
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(updateSize);
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', updateSize);
    }
  }

  startRun(player, rival) {
    this.stop();
    this.player = player;
    this.rival = rival;
    this.wc = WEIGHT_CLASSES[player.weightClass] || WEIGHT_CLASSES.junior;

    this.time = 0;
    this.playerAlt = 0;
    this.maxAlt = 0;
    this.playerXRatio = 0.5;
    this.lavaAlt = -8.0;
    this.cryoTimer = 0;
    this.slipTimer = 0;
    this.shakeTimer = 0;
    this.cameraAlt = -2.0;

    this.squashX = 1;
    this.squashY = 1;
    this.jumpAnim = null;

    this.platforms = [];
    this.highestGeneratedAlt = -4;
    this.particles = [];
    this.floatingTexts = [];
    this.bananas = [];
    this.snowflakes = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 2 + Math.random() * 2.5,
      s: 0.14 + Math.random() * 0.2
    }));

    this.ghostSamples = [{ t: 0, h: 0 }];
    this.nextGhostSampleTime = 0.5;
    this.ghostSpeech = { text: '', timer: 0, cooldown: 2.5 };
    this.prevGhostAhead = null;
    this.currentBiomeId = 'kitchen';

    this.addPlatform(0, 0.5, 'starter', false);
    this.ensurePlatformsUpTo(40);

    this.running = true;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  addPlatform(alt, xRatio, kind = 'normal', isTrampoline = false) {
    this.platforms.push({
      alt,
      xRatio,
      kind,
      isTrampoline,
      bounceAnim: 0,
      usedTrampoline: false
    });
  }

  ensurePlatformsUpTo(targetAlt) {
    while (this.highestGeneratedAlt < targetAlt) {
      this.highestGeneratedAlt += 4;
      const alt = this.highestGeneratedAlt;
      const biome = getBiomeForAlt(alt);
      const wave = Math.sin(alt * 0.43) * 0.18;
      const xRatio = Math.max(0.24, Math.min(0.76, 0.5 + wave));
      const isTrampoline = biome.id === 'construction' && alt >= 54 && alt <= 98 && Math.round(alt) % 12 === 8;
      this.addPlatform(alt, xRatio, biome.id, isTrampoline);
    }
  }

  findOrCreatePlatformAt(targetAlt, xHint = 0.5) {
    let found = this.platforms.find((p) => Math.abs(p.alt - targetAlt) < 0.65);
    if (!found) {
      const biome = getBiomeForAlt(targetAlt);
      const xRatio = Math.max(0.24, Math.min(0.76, xHint + (Math.random() * 0.2 - 0.1)));
      const isTrampoline = biome.id === 'construction' && targetAlt >= 54 && targetAlt <= 98 && Math.round(targetAlt) % 12 === 8;
      this.addPlatform(targetAlt, xRatio, biome.id, isTrampoline);
      found = this.platforms[this.platforms.length - 1];
    }
    return found;
  }

  jump(meters, { isBoss = false, isMilestone = false, isTrampoline = false } = {}) {
    if (!this.running) return;
    const startAlt = this.jumpAnim ? this.jumpAnim.endAlt : this.playerAlt;
    const startX = this.jumpAnim ? this.jumpAnim.endX : this.playerXRatio;
    const endAlt = startAlt + meters;

    this.ensurePlatformsUpTo(endAlt + 32);
    const targetPlat = this.findOrCreatePlatformAt(endAlt, startX);

    const duration = isBoss ? 0.44 : isTrampoline ? 0.38 : 0.30;
    this.jumpAnim = {
      t: 0,
      duration,
      startAlt,
      endAlt,
      startX,
      endX: targetPlat.xRatio,
      targetPlat,
      isBoss,
      isMilestone,
      isTrampoline
    };

    this.squashX = 0.78;
    this.squashY = 1.28;

    const particleColor = isBoss ? '#ffcf33' : isTrampoline ? '#38ef7d' : isMilestone ? '#ff9f1c' : '#7be9ff';
    this.spawnBurst(startX, startAlt, isBoss ? 22 : 12, particleColor);

    if (isBoss) {
      this.spawnFloatingText(endAlt + 1.2, targetPlat.xRatio, `+${meters}m ROCKET!`, '#ffcf33');
    } else if (isTrampoline) {
      this.spawnFloatingText(endAlt + 1.0, targetPlat.xRatio, `BOING +${meters}m!`, '#38ef7d');
    } else if (isMilestone) {
      this.spawnFloatingText(endAlt + 1.0, targetPlat.xRatio, `+${meters}m STREAK!`, '#ffcf33');
    } else {
      this.spawnFloatingText(endAlt + 0.8, targetPlat.xRatio, `+${meters}m`, '#ffffff');
    }
  }

  slip() {
    if (!this.running) return;
    const baseAlt = this.jumpAnim ? this.jumpAnim.endAlt : this.playerAlt;
    this.jumpAnim = null;

    const newAlt = Math.max(0, baseAlt - 2);
    this.playerAlt = newAlt;
    this.slipTimer = 0.65;
    this.shakeTimer = 0.28;
    this.squashX = 1.25;
    this.squashY = 0.75;

    const plat = this.findOrCreatePlatformAt(newAlt, this.playerXRatio);
    this.playerXRatio = plat.xRatio;

    this.bananas.push({
      xRatio: this.playerXRatio,
      alt: baseAlt + 0.4,
      vy: 4.5,
      vx: (Math.random() < 0.5 ? -1 : 1) * 0.25,
      rot: 0,
      life: 1.1
    });

    this.spawnBurst(this.playerXRatio, newAlt + 0.5, 10, '#ffe135');
    this.spawnFloatingText(newAlt + 1.5, this.playerXRatio, '-2m SLIP!', '#ff5c6c');

    if (this.callbacks.onAltitudeChange) {
      this.callbacks.onAltitudeChange(this.playerAlt, this.maxAlt);
    }
  }

  triggerCryoFreeze(seconds = 5.0) {
    this.cryoTimer = Math.max(this.cryoTimer, seconds);
    this.spawnFloatingText(this.playerAlt + 2.2, 0.5, '❄️ CRYO-FREEZE 5s!', '#7be9ff');
  }

  getCryoRemaining() {
    return this.cryoTimer;
  }

  getCurrentBiome() {
    return getBiomeForAlt(this.playerAlt);
  }

  spawnBurst(xRatio, alt, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.5;
      this.particles.push({
        xRatio,
        alt,
        vx: Math.cos(angle) * speed * 0.045,
        vy: Math.sin(angle) * speed + 1.5,
        size: 3 + Math.random() * 4.5,
        color,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8
      });
    }
  }

  spawnFloatingText(alt, xRatio, text, color) {
    this.floatingTexts.push({
      alt,
      xRatio,
      text,
      color,
      life: 1.05,
      maxLife: 1.05
    });
  }

  sampleGhostRivalAlt() {
    if (!this.rival || !Array.isArray(this.rival.ghost) || this.rival.ghost.length < 2) {
      return null;
    }
    const samples = this.rival.ghost;
    if (this.time <= samples[0].t) return samples[0].h;
    const last = samples[samples.length - 1];
    if (this.time >= last.t) return last.h;

    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (this.time >= a.t && this.time <= b.t) {
        const span = Math.max(0.001, b.t - a.t);
        const u = (this.time - a.t) / span;
        return a.h + (b.h - a.h) * u;
      }
    }
    return last.h;
  }

  loop(ts) {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
    this.lastTs = ts;

    this.update(dt);
    this.render();

    if (this.running) {
      this.rafId = requestAnimationFrame((nextTs) => this.loop(nextTs));
    }
  }

  update(dt) {
    this.time += dt;

    // Record ghost rival sample every 0.5s
    if (this.time >= this.nextGhostSampleTime) {
      this.ghostSamples.push({
        t: Number(this.time.toFixed(2)),
        h: Number(this.playerAlt.toFixed(2))
      });
      this.nextGhostSampleTime += 0.5;
    }

    // Jump arc animation
    if (this.jumpAnim) {
      this.jumpAnim.t += dt;
      const u = Math.min(1, this.jumpAnim.t / this.jumpAnim.duration);
      const ease = 1 - Math.pow(1 - u, 2);
      const arc = Math.sin(u * Math.PI) * 1.4;
      this.playerAlt = this.jumpAnim.startAlt + (this.jumpAnim.endAlt - this.jumpAnim.startAlt) * ease + arc;
      this.playerXRatio = this.jumpAnim.startX + (this.jumpAnim.endX - this.jumpAnim.startX) * ease;

      if (u >= 1) {
        const landedPlat = this.jumpAnim.targetPlat;
        this.playerAlt = this.jumpAnim.endAlt;
        this.playerXRatio = this.jumpAnim.endX;
        this.maxAlt = Math.max(this.maxAlt, this.playerAlt);
        this.squashX = 1.26;
        this.squashY = 0.74;
        const wasTrampolineJump = this.jumpAnim.isTrampoline;
        this.jumpAnim = null;

        if (this.callbacks.onAltitudeChange) {
          this.callbacks.onAltitudeChange(this.playerAlt, this.maxAlt);
        }

        // Check Construction Trampoline auto-bounce (+8m)
        if (!wasTrampolineJump && landedPlat && landedPlat.isTrampoline && !landedPlat.usedTrampoline) {
          landedPlat.usedTrampoline = true;
          landedPlat.bounceAnim = 0.35;
          this.sound.playMilestone();
          this.jump(8, { isTrampoline: true });
        }
      }
    }

    // Squash & stretch recovery
    this.squashX += (1 - this.squashX) * Math.min(1, dt * 13);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 13);

    if (this.slipTimer > 0) this.slipTimer = Math.max(0, this.slipTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // Cryo-Freeze & rising lava speed
    if (this.cryoTimer > 0) {
      this.cryoTimer = Math.max(0, this.cryoTimer - dt);
    } else {
      const ramp = Math.max(0, this.playerAlt) * this.wc.rampPerMeter;
      const speed = this.wc.baseLavaSpeed + ramp;
      this.lavaAlt += speed * dt;
    }

    // Smooth camera follow (keep player around ~38% up from bottom)
    const targetCam = this.playerAlt - 5.2;
    this.cameraAlt += (targetCam - this.cameraAlt) * Math.min(1, dt * 6.5);

    // Biome transition check
    const biome = this.getCurrentBiome();
    if (biome.id !== this.currentBiomeId) {
      this.currentBiomeId = biome.id;
      this.spawnFloatingText(this.playerAlt + 2.4, 0.5, `${biome.icon} ${biome.name.toUpperCase()}!`, biome.accent);
      if (this.callbacks.onBiomeChange) {
        this.callbacks.onBiomeChange(biome);
      }
    }

    // Ghost speech bubbles
    const ghostAlt = this.sampleGhostRivalAlt();
    if (ghostAlt !== null) {
      if (this.ghostSpeech.timer > 0) {
        this.ghostSpeech.timer = Math.max(0, this.ghostSpeech.timer - dt);
      } else {
        this.ghostSpeech.cooldown -= dt;
        const ahead = ghostAlt > this.playerAlt + 1.5;
        if (this.prevGhostAhead === false && ahead) {
          this.ghostSpeech = { text: 'Too slow!', timer: 2.0, cooldown: 5.0 };
        } else if (this.ghostSpeech.cooldown <= 0) {
          const lines =
            ghostAlt - this.lavaAlt < 5.5
              ? ['PANIC!', 'HOT SOUP!']
              : ahead
              ? ['Catch me!', 'Too slow!', 'See ya!']
              : ['Coming for you!', 'Nice jump!'];
          this.ghostSpeech = {
            text: lines[Math.floor(Math.random() * lines.length)],
            timer: 2.1,
            cooldown: 6.5 + Math.random() * 3.5
          };
        }
        this.prevGhostAhead = ahead;
      }
    }

    // Update platforms bounce anim & prune old platforms well below lava
    for (const p of this.platforms) {
      if (p.bounceAnim > 0) p.bounceAnim = Math.max(0, p.bounceAnim - dt);
    }
    this.platforms = this.platforms.filter((p) => p.alt > this.lavaAlt - 16);

    // Particles
    for (const pt of this.particles) {
      pt.xRatio += pt.vx * dt;
      pt.alt += pt.vy * dt;
      pt.vy -= 14 * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // Banana slips
    for (const b of this.bananas) {
      b.xRatio += b.vx * dt;
      b.alt += b.vy * dt;
      b.vy -= 18 * dt;
      b.rot += 9 * dt;
      b.life -= dt;
    }
    this.bananas = this.bananas.filter((b) => b.life > 0);

    // Floating texts
    for (const ft of this.floatingTexts) {
      ft.alt += 1.9 * dt;
      ft.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life > 0);

    // Snowflakes during Cryo-Freeze
    if (this.cryoTimer > 0) {
      for (const s of this.snowflakes) {
        s.y += s.s * dt;
        s.x += Math.sin(this.time * 2 + s.y * 10) * 0.03 * dt;
        if (s.y > 1) s.y = -0.05;
      }
    }

    // HUD callback
    const gap = this.playerAlt - this.lavaAlt;
    if (this.callbacks.onFrame) {
      this.callbacks.onFrame({
        alt: this.playerAlt,
        lavaAlt: this.lavaAlt,
        gap,
        cryoRemaining: this.cryoTimer,
        ghostAlt,
        biome
      });
    }

    // Check wipeout
    if (this.lavaAlt >= this.playerAlt - 0.15) {
      this.running = false;
      this.sound.playSizzle();
      if (this.callbacks.onGameOver) {
        this.callbacks.onGameOver({
          altitude: this.maxAlt,
          biome,
          ghostAlt,
          ghostSamples: this.ghostSamples
        });
      }
    }
  }

  altToY(alt, pxPerM) {
    return this.viewH - (alt - this.cameraAlt) * pxPerM;
  }

  render() {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const pxPerM = Math.max(18, Math.min(34, h / 18.5));
    const biome = this.getCurrentBiome();

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.shakeTimer > 0) {
      const mag = (this.shakeTimer / 0.28) * 6;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 1. Sky / Background gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, biome.skyTop);
    skyGrad.addColorStop(1, biome.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Parallax Biome Props
    this.renderParallaxProps(ctx, w, h, biome);

    // 3. Tower Vertical Shaft & Left Altitude Ruler
    this.renderTowerAndRuler(ctx, w, h, pxPerM);

    // 4. Personal Best Dashed Line
    if (this.player && this.player.bestAltitude > 0) {
      const pbY = this.altToY(this.player.bestAltitude, pxPerM);
      if (pbY > -20 && pbY < h + 20) {
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = 'rgba(255, 207, 51, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(58, pbY);
        ctx.lineTo(w - 16, pbY);
        ctx.stroke();
        ctx.fillStyle = '#ffcf33';
        ctx.font = '800 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`PB ${this.player.bestAltitude}m`, w - 18, pbY - 5);
        ctx.restore();
      }
    }

    // 5. Platforms
    for (const plat of this.platforms) {
      const py = this.altToY(plat.alt, pxPerM);
      if (py < -50 || py > h + 50) continue;
      const px = plat.xRatio * w;
      this.renderPlatform(ctx, px, py, plat);
    }

    // 6. Ghost Rival
    const ghostAlt = this.sampleGhostRivalAlt();
    if (ghostAlt !== null && this.rival) {
      const gy = this.altToY(ghostAlt, pxPerM);
      if (gy > -90 && gy < h + 90) {
        const gx = Math.max(0.24, Math.min(0.76, 0.5 + Math.sin(ghostAlt * 0.43) * 0.18)) * w + 34;
        ctx.save();
        ctx.globalAlpha = 0.52;
        ObbyEngine.drawAvatar(ctx, {
          x: gx,
          y: gy,
          scale: 0.92,
          color: this.rival.color,
          accent: this.rival.accent,
          hatId: this.rival.equippedHat || 'none',
          time: this.time,
          panic: ghostAlt - this.lavaAlt < 5.5,
          isGhost: true
        });
        ctx.restore();

        // Nametag
        ctx.save();
        ctx.font = '800 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(13, 18, 38, 0.78)';
        const label = `👻 ${this.rival.name}`;
        const tw = ctx.measureText(label).width + 12;
        ctx.beginPath();
        ctx.roundRect(gx - tw / 2, gy - 78, tw, 18, 8);
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.fillText(label, gx, gy - 65);

        // Comic Speech Bubble
        if (this.ghostSpeech.timer > 0 && this.ghostSpeech.text) {
          const msg = this.ghostSpeech.text;
          const bw = ctx.measureText(msg).width + 16;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(gx - bw / 2, gy - 104, bw, 22, 9);
          ctx.fill();
          ctx.fillStyle = '#111827';
          ctx.fillText(msg, gx, gy - 89);
        }
        ctx.restore();
      }
    }

    // 7. Player Avatar
    const playerY = this.altToY(this.playerAlt, pxPerM);
    const playerX = this.playerXRatio * w;
    const panic = this.playerAlt - this.lavaAlt < 5.5 && this.cryoTimer <= 0;
    const jumping = Boolean(this.jumpAnim);
    const rot = this.slipTimer > 0 ? Math.sin(this.slipTimer * 28) * 0.45 : 0;

    ObbyEngine.drawAvatar(ctx, {
      x: playerX,
      y: playerY,
      scale: 1,
      scaleX: this.squashX,
      scaleY: this.squashY,
      rot,
      color: this.player ? this.player.color : '#2ec4ff',
      accent: this.player ? this.player.accent : '#ffcf33',
      hatId: this.player ? this.player.equippedHat : 'none',
      time: this.time,
      jumping,
      panic,
      dizzy: this.slipTimer > 0
    });

    // 8. Banana peels & Particles
    for (const b of this.bananas) {
      const by = this.altToY(b.alt, pxPerM);
      const bx = b.xRatio * w;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.rot);
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍌', 0, 0);
      ctx.restore();
    }

    for (const pt of this.particles) {
      const py = this.altToY(pt.alt, pxPerM);
      const px = pt.xRatio * w;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(px - pt.size / 2, py - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }

    // 9. Rising Hazard / Cryo-Ice
    this.renderHazard(ctx, w, h, pxPerM, biome);

    // 10. Floating Score Texts
    for (const ft of this.floatingTexts) {
      const fy = this.altToY(ft.alt, pxPerM);
      const fx = ft.xRatio * w;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / 0.45);
      ctx.font = '900 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10, 12, 24, 0.85)';
      ctx.strokeText(ft.text, fx, fy);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
      ctx.restore();
    }

    // 11. Cryo Snowfall Overlay
    if (this.cryoTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(123, 233, 255, 0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(225, 250, 255, 0.78)';
      for (const s of this.snowflakes) {
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  renderParallaxProps(ctx, w, h, biome) {
    ctx.save();
    const scroll = this.cameraAlt * 8;

    if (biome.id === 'kitchen') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const tile = 48;
      const offY = ((scroll % tile) + tile) % tile;
      for (let x = 0; x < w; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = offY; y < h; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 220, 180, 0.07)';
      for (let i = 0; i < 6; i++) {
        const x = ((i * 137) % (w - 80)) + 40;
        const y = (((i * 110 + scroll * 0.6) % (h + 120)) + h + 120) % (h + 120) - 60;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome.id === 'construction') {
      ctx.strokeStyle = 'rgba(255, 207, 51, 0.08)';
      ctx.lineWidth = 6;
      const step = 120;
      const offY = ((scroll % step) + step) % step;
      for (let y = offY - step; y < h + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 70);
        ctx.stroke();
      }
    } else if (biome.id === 'lab') {
      for (let i = 0; i < 5; i++) {
        const x = 80 + ((i * 149) % Math.max(120, w - 120));
        const y = (((i * 150 + scroll * 0.7) % (h + 100)) + h + 100) % (h + 100) - 50;
        ctx.fillStyle = 'rgba(110, 255, 71, 0.08)';
        ctx.beginPath();
        ctx.roundRect(x - 16, y - 24, 32, 48, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(123, 233, 255, 0.14)';
        ctx.beginPath();
        ctx.arc(x, y + 6, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Low Earth Orbit: stars + UFOs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < 36; i++) {
        const x = ((i * 97 + 23) % 100) * 0.01 * w;
        const y = (((i * 61 + scroll * 0.35) % (h + 40)) + h + 40) % (h + 40) - 20;
        const r = (i % 3) + 1;
        ctx.fillRect(x, y, r, r);
      }
      // Cruising UFO
      const ufoX = ((this.time * 42) % (w + 120)) - 60;
      const ufoY = h * 0.24 + Math.sin(this.time * 2.2) * 14;
      ctx.fillStyle = 'rgba(123, 233, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(ufoX, ufoY - 6, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(192, 132, 252, 0.55)';
      ctx.beginPath();
      ctx.ellipse(ufoX, ufoY, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderTowerAndRuler(ctx, w, h, pxPerM) {
    ctx.save();
    // Side walls
    ctx.fillStyle = 'rgba(10, 12, 24, 0.32)';
    ctx.fillRect(0, 0, 52, h);
    ctx.fillRect(w - 14, 0, 14, h);

    // Ruler ticks every 10m
    const minM = Math.max(0, Math.floor(this.cameraAlt / 10) * 10);
    const maxM = Math.ceil((this.cameraAlt + h / pxPerM) / 10) * 10;

    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'right';
    for (let m = minM; m <= maxM; m += 10) {
      const y = this.altToY(m, pxPerM);
      const isBiomeLine = m > 0 && m % 50 === 0;
      ctx.strokeStyle = isBiomeLine ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isBiomeLine ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(isBiomeLine ? w - 14 : 56, y);
      ctx.stroke();

      ctx.fillStyle = isBiomeLine ? '#ffcf33' : 'rgba(203, 213, 225, 0.72)';
      ctx.fillText(`${m}m`, 40, y + 3);
    }
    ctx.restore();
  }

  renderPlatform(ctx, x, y, plat) {
    const bounceOffset = plat.bounceAnim > 0 ? Math.sin((plat.bounceAnim / 0.35) * Math.PI) * 7 : 0;
    const drawY = y + bounceOffset;
    const width = plat.kind === 'starter' ? 170 : 104;
    const hw = width / 2;

    ctx.save();
    if (plat.isTrampoline) {
      // Green Trampoline Platform (Wacky Construction)
      ctx.fillStyle = '#0f5132';
      ctx.beginPath();
      ctx.roundRect(x - hw, drawY, width, 16, 7);
      ctx.fill();

      ctx.fillStyle = '#38ef7d';
      ctx.beginPath();
      ctx.roundRect(x - hw + 3, drawY - 4, width - 6, 10, 6);
      ctx.fill();

      ctx.fillStyle = '#062814';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ +8m ▲', x, drawY + 4);
    } else if (plat.kind === 'kitchen' || plat.kind === 'starter') {
      const isPan = plat.kind === 'kitchen' && Math.round(plat.alt / 4) % 2 === 1;
      if (isPan) {
        // Frying pan + sunny-side-up egg
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(x + hw - 4, drawY + 5, 24, 6, 3);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x - hw, drawY + 2, width, 15, 7);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(x - hw + 4, drawY + 4, width - 8, 5, 3);
        ctx.fill();
        // Sunny-side-up egg
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, drawY + 3, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, drawY + 2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Giant toast slice
        ctx.fillStyle = '#b46927';
        ctx.beginPath();
        ctx.roundRect(x - hw, drawY, width, 18, 7);
        ctx.fill();
        ctx.fillStyle = '#f5d293';
        ctx.beginPath();
        ctx.roundRect(x - hw + 4, drawY + 3, width - 8, 11, 5);
        ctx.fill();
        // Melted butter pat
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath();
        ctx.roundRect(x - 12, drawY + 1, 24, 6, 2);
        ctx.fill();
      }
    } else if (plat.kind === 'construction') {
      // Steel I-beam
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x - hw, drawY, width, 5);
      ctx.fillRect(x - hw, drawY + 12, width, 5);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - hw + 8, drawY + 5, width - 16, 7);
    } else if (plat.kind === 'lab') {
      // Hovering neon energy pad
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x - hw, drawY + 2, width, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#38f8b4';
      ctx.beginPath();
      ctx.roundRect(x - hw + 6, drawY, width - 12, 6, 4);
      ctx.fill();
    } else {
      // Asteroid platform
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(x - hw, drawY, width, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(x - hw + 5, drawY + 2, width - 10, 6, 4);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(x - 18, drawY + 10, 4, 0, Math.PI * 2);
      ctx.arc(x + 22, drawY + 9, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderHazard(ctx, w, h, pxPerM, biome) {
    const surfaceY = this.altToY(this.lavaAlt, pxPerM);
    if (surfaceY > h + 40) return;

    const frozen = this.cryoTimer > 0;
    const topColor = frozen ? '#9df3ff' : biome.hazardTop;
    const deepColor = frozen ? '#146ca4' : biome.hazardDeep;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h + 10);
    for (let x = 0; x <= w; x += 18) {
      const wave = frozen
        ? Math.sin(x * 0.08) * 3
        : Math.sin(x * 0.04 + this.time * 4.2) * 5 + Math.cos(x * 0.09 - this.time * 3) * 2.5;
      ctx.lineTo(x, surfaceY + wave);
    }
    ctx.lineTo(w, h + 10);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, surfaceY, 0, h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(0.28, deepColor);
    grad.addColorStop(1, '#090b16');
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright surface rim
    ctx.strokeStyle = frozen ? '#e6fbff' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Floating hazard props (croutons, chips, bubbles, or ice shards)
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 97 + (frozen ? 0 : this.time * 18)) % (w - 40)) + 20;
      const by = surfaceY + 16 + (i % 3) * 14;
      if (by > h - 6) continue;
      if (frozen) {
        ctx.fillStyle = 'rgba(225, 250, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(bx, by - 7);
        ctx.lineTo(bx + 6, by);
        ctx.lineTo(bx, by + 7);
        ctx.lineTo(bx - 6, by);
        ctx.closePath();
        ctx.fill();
      } else if (biome.id === 'kitchen') {
        // Croutons in Tomato Soup
        ctx.fillStyle = '#e7b160';
        ctx.fillRect(bx - 7, by - 5, 14, 10);
      } else if (biome.id === 'construction') {
        // Tortilla chips in Nacho Cheese
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(bx, by - 7);
        ctx.lineTo(bx + 8, by + 6);
        ctx.lineTo(bx - 8, by + 6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(bx, by, 5 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hazard label near surface
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = frozen ? '#e0fbff' : '#ffffff';
    const labelText = frozen ? '❄️ ICE FROZEN ❄️' : `🔥 ${biome.hazardName.toUpperCase()} 🔥`;
    if (surfaceY + 26 < h) {
      ctx.fillText(labelText, w / 2, surfaceY + 24);
    }

    ctx.restore();
  }

  static drawAvatar(ctx, opts) {
    const {
      x,
      y,
      scale = 1,
      scaleX = 1,
      scaleY = 1,
      rot = 0,
      color = '#2ec4ff',
      accent = '#ffcf33',
      hatId = 'none',
      time = 0,
      jumping = false,
      panic = false,
      dizzy = false
    } = opts;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale * scaleX, scale * scaleY);

    // Drop shadow on platform when grounded
    if (!jumping) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs (blocky Roblox style)
    const legSwing = jumping ? 0.25 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.save();
    ctx.translate(-7, -14);
    ctx.rotate(legSwing);
    ctx.beginPath();
    ctx.roundRect(-5, 0, 10, 14, 3);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(7, -14);
    ctx.rotate(-legSwing);
    ctx.beginPath();
    ctx.roundRect(-5, 0, 10, 14, 3);
    ctx.fill();
    ctx.restore();

    // Torso
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-13, -36, 26, 23, 5);
    ctx.fill();

    // Stripe / chest badge
    ctx.fillStyle = accent;
    ctx.fillRect(-7, -30, 14, 6);

    // Arms (flail overhead when jumping or panicking!)
    const flail = jumping || panic;
    const leftArmAng = flail ? -2.45 + Math.sin(time * 22) * 0.45 : 0.14;
    const rightArmAng = flail ? 2.45 - Math.sin(time * 22) * 0.45 : -0.14;

    ctx.fillStyle = '#ffd59e';
    ctx.save();
    ctx.translate(-14, -33);
    ctx.rotate(leftArmAng);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 18, 3);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(14, -33);
    ctx.rotate(rightArmAng);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 18, 3);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#ffd59e';
    ctx.beginPath();
    ctx.roundRect(-12, -59, 24, 22, 6);
    ctx.fill();

    // Face
    if (dizzy) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, -51);
      ctx.lineTo(-3, -47);
      ctx.moveTo(-3, -51);
      ctx.lineTo(-7, -47);
      ctx.moveTo(3, -51);
      ctx.lineTo(7, -47);
      ctx.moveTo(7, -51);
      ctx.lineTo(3, -47);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -42, 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (panic) {
      // Bulging eyes + sweat drops
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5, -50, 4.5, 0, Math.PI * 2);
      ctx.arc(5, -50, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-5, -49, 1.8, 0, Math.PI * 2);
      ctx.arc(5, -49, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Open screaming mouth
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(0, -41.5, 4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated sweat drops
      const dropY = (time * 24) % 10;
      ctx.fillStyle = '#7be9ff';
      ctx.beginPath();
      ctx.arc(-15, -54 + dropY, 2.6, 0, Math.PI * 2);
      ctx.arc(15, -51 + ((dropY + 5) % 10), 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Happy Roblox face
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(-6.5, -52, 3.2, 4.5, 1.5);
      ctx.roundRect(3.3, -52, 3.2, 4.5, 1.5);
      ctx.fill();

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -45, 4.8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // Unlockable Vector Hats
    ObbyEngine.drawHat(ctx, hatId, time);

    ctx.restore();
  }

  static drawHat(ctx, hatId, time) {
    if (!hatId || hatId === 'none') return;

    ctx.save();
    if (hatId === 'cone') {
      // Traffic Cone
      ctx.fillStyle = '#ff6d1f';
      ctx.fillRect(-15, -62, 30, 4);
      ctx.beginPath();
      ctx.moveTo(-10, -62);
      ctx.lineTo(-3, -84);
      ctx.lineTo(3, -84);
      ctx.lineTo(10, -62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-7.5, -70);
      ctx.lineTo(-5.8, -75);
      ctx.lineTo(5.8, -75);
      ctx.lineTo(7.5, -70);
      ctx.closePath();
      ctx.fill();
    } else if (hatId === 'propeller') {
      // Rainbow Propeller Cap
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -58, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, -58, 13, Math.PI * 1.25, Math.PI * 1.75);
      ctx.lineTo(0, -58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-13, -60, 26, 3);
      // Spinning blades
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -75, 3, 6);
      const bladeW = 4 + Math.abs(Math.cos(time * 16)) * 16;
      ctx.fillStyle = '#38ef7d';
      ctx.beginPath();
      ctx.roundRect(-bladeW, -77, bladeW * 2, 4, 2);
      ctx.fill();
    } else if (hatId === 'chicken') {
      // Rubber Chicken perched on head
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, -66, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -75, 6, 0, Math.PI * 2);
      ctx.fill();
      // Red comb
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(4, -81, 3, 0, Math.PI * 2);
      ctx.arc(8, -80, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Orange beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(11, -76);
      ctx.lineTo(18, -74);
      ctx.lineTo(11, -72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(8, -76, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (hatId === 'fishbowl') {
      // Astronaut Fishbowl
      ctx.fillStyle = 'rgba(123, 233, 255, 0.28)';
      ctx.strokeStyle = '#7be9ff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -64, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Little swimming goldfish
      const fx = Math.sin(time * 3) * 6;
      ctx.fillStyle = '#ff7a33';
      ctx.beginPath();
      ctx.ellipse(fx, -71, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Collar ring
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-13, -59, 26, 3);
    } else if (hatId === 'crown') {
      // Flaming Crown
      const flicker = Math.sin(time * 14) * 2.5;
      ctx.fillStyle = '#ff5a1f';
      ctx.beginPath();
      ctx.moveTo(-10, -72);
      ctx.lineTo(-6, -86 + flicker);
      ctx.lineTo(0, -78);
      ctx.lineTo(4, -89 - flicker);
      ctx.lineTo(10, -72);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffcf33';
      ctx.beginPath();
      ctx.moveTo(-12, -59);
      ctx.lineTo(-13, -72);
      ctx.lineTo(-5, -66);
      ctx.lineTo(0, -74);
      ctx.lineTo(5, -66);
      ctx.lineTo(13, -72);
      ctx.lineTo(12, -59);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -64, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ==========================================================================
   5. UI CONTROLLER (Lobby, Split-Screen Numpad, Keyboard, Parent Modal)
   ========================================================================== */

class UIController {
  constructor() {
    this.store = new StateStore();
    this.sound = new SoundFX(this.store.isMuted());
    this.questionEngine = new QuestionEngine();
    this.obby = new ObbyEngine(document.getElementById('obby-canvas'), this.sound, {
      onFrame: (info) => this.handleEngineFrame(info),
      onAltitudeChange: (alt, maxAlt) => this.handleAltitudeChange(alt, maxAlt),
      onBiomeChange: (biome) => this.updateBiomePill(biome),
      onGameOver: (summary) => this.handleGameOver(summary)
    });

    this.isPlaying = false;
    this.currentQuestion = null;
    this.typedAnswer = '';
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.totalAttempts = 0;
    this.questionElapsed = 0;
    this.hintShown = false;
    this.lastTickTs = 0;
    this.hintRafId = null;

    this.parentActiveId = this.store.getSelectedPlayer().id;
    this.parentHoldTimer = null;

    this.cacheDOM();
    this.bindEvents();
    this.updateMuteButton();
    this.renderLobby();
  }

  cacheDOM() {
    this.dom = {
      screenLobby: document.getElementById('screen-lobby'),
      screenGame: document.getElementById('screen-game'),
      biomePill: document.getElementById('biome-pill'),
      btnLobby: document.getElementById('btn-lobby'),
      btnMute: document.getElementById('btn-mute'),
      muteIcon: document.getElementById('mute-icon'),
      btnParent: document.getElementById('btn-parent'),

      playerCards: document.getElementById('player-cards'),
      focusStatus: document.getElementById('focus-status'),
      focusPicker: document.getElementById('focus-picker'),
      btnStart: document.getElementById('btn-start'),
      wardrobeOwner: document.getElementById('wardrobe-owner'),
      hatWardrobe: document.getElementById('hat-wardrobe'),
      leaderboardList: document.getElementById('leaderboard-list'),

      hudAlt: document.getElementById('hud-alt'),
      hudStreak: document.getElementById('hud-streak'),
      hudGap: document.getElementById('hud-gap'),
      hudGapPill: document.getElementById('hud-gap-pill'),
      cryoBadge: document.getElementById('cryo-badge'),
      cryoTimer: document.getElementById('cryo-timer'),
      ghostBadge: document.getElementById('ghost-badge'),
      ghostBadgeText: document.getElementById('ghost-badge-text'),

      questionCard: document.getElementById('question-card'),
      qBadge: document.getElementById('q-badge'),
      qReward: document.getElementById('q-reward'),
      qPrompt: document.getElementById('q-prompt'),
      answerDisplay: document.getElementById('answer-display'),
      hintBox: document.getElementById('hint-box'),
      hintText: document.getElementById('hint-text'),
      numpad: document.getElementById('numpad'),

      modalGameOver: document.getElementById('modal-gameover'),
      goEmoji: document.getElementById('go-emoji'),
      goHeadline: document.getElementById('go-headline'),
      goSub: document.getElementById('go-sub'),
      goPbBanner: document.getElementById('go-pb-banner'),
      goHatBanner: document.getElementById('go-hat-banner'),
      goAlt: document.getElementById('go-alt'),
      goStreak: document.getElementById('go-streak'),
      goAcc: document.getElementById('go-acc'),
      goGhost: document.getElementById('go-ghost'),
      btnRetry: document.getElementById('btn-retry'),
      btnGoLobby: document.getElementById('btn-go-lobby'),

      modalParent: document.getElementById('modal-parent'),
      parentTabs: document.getElementById('parent-tabs'),
      parentName: document.getElementById('parent-name'),
      parentWeightToggle: document.getElementById('parent-weight-toggle'),
      comfortToggles: document.getElementById('comfort-toggles'),
      newToggles: document.getElementById('new-toggles'),
      masteryHeatmap: document.getElementById('mastery-heatmap'),
      extendedFacts: document.getElementById('extended-facts'),
      btnResetFacts: document.getElementById('btn-reset-facts'),
      btnParentSave: document.getElementById('btn-parent-save'),
      btnParentClose: document.getElementById('btn-parent-close')
    };
  }

  bindEvents() {
    this.dom.btnStart.addEventListener('click', () => this.startGame());
    this.dom.btnLobby.addEventListener('click', () => this.returnToLobby());
    this.dom.btnRetry.addEventListener('click', () => {
      this.dom.modalGameOver.classList.add('hidden');
      this.startGame();
    });
    this.dom.btnGoLobby.addEventListener('click', () => {
      this.dom.modalGameOver.classList.add('hidden');
      this.returnToLobby();
    });

    this.dom.btnMute.addEventListener('click', () => {
      const next = !this.sound.isMuted();
      this.sound.setMuted(next);
      this.store.setMuted(next);
      this.updateMuteButton();
    });

    // Hold 1.1s for Parent Calibration Modal
    const cancelHold = () => {
      if (this.parentHoldTimer) {
        clearTimeout(this.parentHoldTimer);
        this.parentHoldTimer = null;
      }
      this.dom.btnParent.classList.remove('is-holding');
    };

    this.dom.btnParent.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cancelHold();
      this.dom.btnParent.classList.add('is-holding');
      this.parentHoldTimer = setTimeout(() => {
        cancelHold();
        this.openParentModal();
      }, 1100);
    });
    this.dom.btnParent.addEventListener('pointerup', cancelHold);
    this.dom.btnParent.addEventListener('pointerleave', cancelHold);
    this.dom.btnParent.addEventListener('pointercancel', cancelHold);

    // Custom Touch Numpad (never focus native <input>)
    this.dom.numpad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.num-key');
      if (!btn || !this.isPlaying) return;
      e.preventDefault();
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 110);
      this.handleNumpadKey(btn.dataset.key);
    });

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;
      if (!this.dom.modalParent.classList.contains('hidden')) return;
      if (!this.dom.modalGameOver.classList.contains('hidden')) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this.handleNumpadKey(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        this.handleNumpadKey('back');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleNumpadKey('submit');
      }
    });

    // Parent Modal events
    this.dom.btnParentClose.addEventListener('click', () => this.closeParentModal());
    this.dom.btnParentSave.addEventListener('click', () => this.closeParentModal());
    this.dom.parentName.addEventListener('input', (e) => {
      this.store.updatePlayerConfig(this.parentActiveId, { name: e.target.value });
      this.renderParentTabs();
    });
    this.dom.parentWeightToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-weight]');
      if (!btn) return;
      this.store.updatePlayerConfig(this.parentActiveId, { weightClass: btn.dataset.weight });
      this.renderParentBody();
    });
    this.dom.btnResetFacts.addEventListener('click', () => {
      this.store.resetPlayerFacts(this.parentActiveId);
      this.renderParentHeatmap();
    });
  }

  updateMuteButton() {
    const muted = this.sound.isMuted();
    this.dom.muteIcon.textContent = muted ? '🔇' : '🔊';
    this.dom.btnMute.setAttribute('aria-pressed', String(muted));
  }

  /* ---------- LOBBY RENDERING ---------- */

  renderLobby() {
    const selected = this.store.getSelectedPlayer();
    const players = this.store.getPlayers();

    // Player Cards
    this.dom.playerCards.innerHTML = '';
    for (const p of players) {
      const wc = WEIGHT_CLASSES[p.weightClass] || WEIGHT_CLASSES.junior;
      const isSelected = p.id === selected.id;
      const nextHat = this.store.getNextHat(p);
      const hatProgressPct = nextHat ? Math.min(100, Math.round((p.totalDistance / nextHat.minDist) * 100)) : 100;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `player-card${isSelected ? ' is-selected' : ''}`;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', String(isSelected));
      card.innerHTML = `
        ${isSelected ? '<span class="selected-ribbon">ACTIVE CLIMBER</span>' : ''}
        <div class="player-avatar-box">
          <canvas class="player-avatar-canvas" width="152" height="172"></canvas>
        </div>
        <div class="player-info">
          <div class="player-title-row">
            <span class="player-name">${this.escapeHtml(p.name)}</span>
            <span class="class-badge ${wc.id}">${wc.label}</span>
          </div>
          <div class="player-meta-line">
            Lava: ${wc.baseLavaSpeed.toFixed(2)} m/s • Tables: ${p.comfortTables.join(', ')} (+${p.newTables.join(', ')})
          </div>
          <div class="player-stats-row">
            <div class="p-stat"><span>Best</span><strong>${p.bestAltitude} m</strong></div>
            <div class="p-stat"><span>Streak</span><strong>${p.bestStreak}×</strong></div>
            <div class="p-stat"><span>Total</span><strong>${p.totalDistance} m</strong></div>
          </div>
          <div class="hat-progress-wrap">
            <div class="hat-progress-label">
              <span>${nextHat ? `Next: ${nextHat.icon} ${nextHat.name}` : '👑 All Hats Unlocked!'}</span>
              <span>${nextHat ? `${p.totalDistance}/${nextHat.minDist} m` : '100%'}</span>
            </div>
            <div class="hat-progress-bar">
              <div class="hat-progress-fill" style="width:${hatProgressPct}%"></div>
            </div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        this.sound.playClick();
        this.store.setSelectedPlayer(p.id);
        this.renderLobby();
      });

      this.dom.playerCards.appendChild(card);

      // Draw mini avatar preview
      const miniCanvas = card.querySelector('.player-avatar-canvas');
      const mctx = miniCanvas.getContext('2d');
      mctx.scale(2, 2);
      ObbyEngine.drawAvatar(mctx, {
        x: 38,
        y: 78,
        scale: 0.9,
        color: p.color,
        accent: p.accent,
        hatId: p.equippedHat || 'none',
        time: 0.4
      });
    }

    // Practice Focus Picker (All Mix or single 2x-15x table)
    const activeFocus = Number.isInteger(selected.focusTable) ? selected.focusTable : null;
    this.dom.focusStatus.textContent = activeFocus ? `${activeFocus}× Table Only` : 'All Tables Mix';
    this.dom.btnStart.textContent = activeFocus ? `🚀 Start Climbing (${activeFocus}× Only)` : '🚀 Start Climbing';
    this.dom.focusPicker.innerHTML = '';

    const focusChoices = [{ label: '⚡ All Mix', value: null }];
    for (let t = 2; t <= 15; t++) {
      focusChoices.push({ label: `${t}×`, value: t });
    }
    for (const choice of focusChoices) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `focus-chip${activeFocus === choice.value ? ' is-active' : ''}`;
      chip.dataset.focus = choice.value === null ? 'all' : String(choice.value);
      chip.textContent = choice.label;
      chip.addEventListener('click', () => {
        this.sound.playClick();
        this.store.setFocusTable(selected.id, choice.value);
        this.renderLobby();
      });
      this.dom.focusPicker.appendChild(chip);
    }

    // Hat Wardrobe for selected player
    this.dom.wardrobeOwner.textContent = `${selected.name}'s Collection (${selected.totalDistance} m total)`;
    this.dom.hatWardrobe.innerHTML = '';
    for (const hat of HATS) {
      const unlocked = selected.totalDistance >= hat.minDist;
      const equipped = (selected.equippedHat || 'none') === hat.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hat-item${equipped ? ' is-equipped' : ''}${unlocked ? '' : ' is-locked'}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span class="hat-icon">${hat.icon}</span>
        <span class="hat-name">${hat.name}</span>
        <span class="hat-req">${equipped ? 'Equipped' : unlocked ? 'Unlocked' : `${hat.minDist} m`}</span>
      `;
      if (unlocked) {
        btn.addEventListener('click', () => {
          this.sound.playClick();
          this.store.equipHat(selected.id, hat.id);
          this.renderLobby();
        });
      }
      this.dom.hatWardrobe.appendChild(btn);
    }

    // Household Leaderboard
    const board = this.store.getLeaderboard();
    this.dom.leaderboardList.innerHTML = '';
    board.forEach((p, idx) => {
      const wc = WEIGHT_CLASSES[p.weightClass] || WEIGHT_CLASSES.junior;
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <div class="lb-rank">${idx === 0 ? '🥇' : '🥈'}</div>
        <div class="lb-player">
          <strong>${this.escapeHtml(p.name)}</strong>
          <span>${wc.label}</span>
        </div>
        <div class="lb-metrics">
          <div class="lb-metric"><span>Best</span><strong>${p.bestAltitude} m</strong></div>
          <div class="lb-metric"><span>Streak</span><strong>${p.bestStreak}×</strong></div>
          <div class="lb-metric"><span>Total</span><strong>${p.totalDistance} m</strong></div>
        </div>
      `;
      this.dom.leaderboardList.appendChild(row);
    });
  }

  /* ---------- GAMEPLAY FLOW ---------- */

  startGame() {
    this.sound.unlock();
    const player = this.store.getSelectedPlayer();
    const rival = this.store.getRival(player.id);

    this.isPlaying = true;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.totalAttempts = 0;
    this.typedAnswer = '';

    this.questionEngine.reset();

    document.body.classList.add('is-playing');
    this.dom.screenLobby.classList.add('hidden');
    this.dom.screenGame.classList.remove('hidden');
    this.dom.biomePill.classList.remove('hidden');
    this.dom.btnLobby.classList.remove('hidden');

    this.updateBiomePill(BIOMES[0]);
    this.dom.hudAlt.textContent = '0 m';
    this.dom.hudStreak.textContent = '0×';
    this.dom.hudGap.textContent = '+8.0 m';
    this.dom.hudGapPill.classList.remove('is-danger');
    this.dom.cryoBadge.classList.add('hidden');

    if (rival && rival.ghost && rival.ghost.length >= 2) {
      this.dom.ghostBadge.classList.remove('hidden');
      this.dom.ghostBadgeText.textContent = `${rival.name} Ghost (${rival.bestAltitude}m)`;
    } else {
      this.dom.ghostBadge.classList.add('hidden');
    }

    // Ensure no input has focus (iPad keyboard prevention)
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    this.obby.startRun(player, rival);
    this.serveNextQuestion({ forceRecovery: false });
    this.startHintLoop();
  }

  returnToLobby() {
    this.isPlaying = false;
    this.stopHintLoop();
    this.obby.stop();

    document.body.classList.remove('is-playing');
    this.dom.screenGame.classList.add('hidden');
    this.dom.screenLobby.classList.remove('hidden');
    this.dom.biomePill.classList.add('hidden');
    this.dom.btnLobby.classList.add('hidden');

    this.renderLobby();
  }

  startHintLoop() {
    this.stopHintLoop();
    this.lastTickTs = performance.now();
    const tick = (ts) => {
      if (!this.isPlaying) return;
      const dt = Math.min(0.1, (ts - this.lastTickTs) / 1000);
      this.lastTickTs = ts;
      this.questionElapsed += dt;

      if (!this.hintShown && this.currentQuestion && this.questionElapsed >= 3.8) {
        this.hintShown = true;
        this.dom.hintText.textContent = this.currentQuestion.hint;
        this.dom.hintBox.classList.remove('hidden');
      }

      this.hintRafId = requestAnimationFrame(tick);
    };
    this.hintRafId = requestAnimationFrame(tick);
  }

  stopHintLoop() {
    if (this.hintRafId) {
      cancelAnimationFrame(this.hintRafId);
      this.hintRafId = null;
    }
  }

  serveNextQuestion({ forceRecovery = false } = {}) {
    const player = this.store.getSelectedPlayer();
    const q = this.questionEngine.nextQuestion(player, { forceRecovery });
    this.currentQuestion = q;
    this.typedAnswer = '';
    this.questionElapsed = 0;
    this.hintShown = false;

    this.dom.hintBox.classList.add('hidden');
    this.dom.questionCard.classList.remove('is-boss', 'is-cryo', 'is-recovery', 'is-wrong');

    const focusPrefix = q.focusTable ? `${q.focusTable}× ` : '';
    if (q.tier === 'boss') {
      this.dom.questionCard.classList.add('is-boss');
      this.dom.qBadge.textContent = `👑 ${focusPrefix ? `${focusPrefix}BOSS` : 'GOLDEN BOSS'}`;
      this.dom.qReward.textContent = '+12 m ROCKET';
    } else if (q.tier === 'recovery') {
      this.dom.questionCard.classList.add('is-recovery');
      this.dom.qBadge.textContent = `🍌 ${focusPrefix ? `${focusPrefix}RECOVERY` : 'RECOVERY BOOST'}`;
      this.dom.qReward.textContent = '+4 m';
    } else if (q.cryoFreeze) {
      this.dom.questionCard.classList.add('is-cryo');
      this.dom.qBadge.textContent = `❄️ ${focusPrefix ? `${focusPrefix}CRYO` : 'CRYO NEW FACT'}`;
      this.dom.qReward.textContent = '+4 m';
    } else if (q.focusTable) {
      this.dom.qBadge.textContent = `🎯 ${q.focusTable}× FOCUS`;
      this.dom.qReward.textContent = '+4 m';
    } else if (q.tier === 'new') {
      this.dom.qBadge.textContent = '🌟 TARGET TABLE';
      this.dom.qReward.textContent = '+4 m';
    } else {
      this.dom.qBadge.textContent = '⚡ COMFORT';
      this.dom.qReward.textContent = '+4 m';
    }

    if (q.cryoFreeze) {
      this.obby.triggerCryoFreeze(5.0);
      this.sound.playCryoFreeze();
    }

    this.dom.qPrompt.textContent = q.prompt;
    this.renderTypedAnswer();
  }

  renderTypedAnswer() {
    if (this.typedAnswer.length === 0) {
      this.dom.answerDisplay.textContent = '?';
      this.dom.answerDisplay.classList.add('is-empty');
    } else {
      this.dom.answerDisplay.textContent = this.typedAnswer;
      this.dom.answerDisplay.classList.remove('is-empty');
    }
  }

  handleNumpadKey(key) {
    if (!this.isPlaying || !this.currentQuestion) return;

    if (key === 'back') {
      this.sound.playClick();
      this.typedAnswer = this.typedAnswer.slice(0, -1);
      this.renderTypedAnswer();
      return;
    }

    if (key === 'submit') {
      if (this.typedAnswer.length === 0) return;
      this.submitAnswer();
      return;
    }

    if (/^\d$/.test(key) && this.typedAnswer.length < 4) {
      this.sound.playClick();
      this.typedAnswer += key;
      this.renderTypedAnswer();
    }
  }

  submitAnswer() {
    const player = this.store.getSelectedPlayer();
    const val = parseInt(this.typedAnswer, 10);
    const q = this.currentQuestion;
    this.totalAttempts += 1;

    if (val === q.answer) {
      this.correctCount += 1;
      this.streak += 1;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      this.store.recordFact(player.id, q.key, true);

      const isMilestone = q.tier !== 'boss' && this.streak > 0 && this.streak % 5 === 0;
      const meters = q.tier === 'boss' ? 12 : isMilestone ? 8 : q.jumpMeters;

      if (q.tier === 'boss' || isMilestone) {
        this.sound.playMilestone();
      } else {
        this.sound.playJump(this.streak);
      }

      this.dom.hudStreak.textContent = `${this.streak}×`;
      this.obby.jump(meters, {
        isBoss: q.tier === 'boss',
        isMilestone
      });

      this.serveNextQuestion({ forceRecovery: false });
    } else {
      this.streak = 0;
      this.dom.hudStreak.textContent = '0×';
      this.store.recordFact(player.id, q.key, false);

      this.sound.playBonk();
      this.obby.slip();

      this.dom.questionCard.classList.remove('is-wrong');
      void this.dom.questionCard.offsetWidth;
      this.dom.questionCard.classList.add('is-wrong');

      this.serveNextQuestion({ forceRecovery: true });
    }
  }

  handleAltitudeChange(alt, _maxAlt) {
    this.dom.hudAlt.textContent = `${Math.round(alt)} m`;
  }

  updateBiomePill(biome) {
    this.dom.biomePill.textContent = `${biome.icon} ${biome.name}`;
  }

  handleEngineFrame({ alt, gap, cryoRemaining }) {
    this.dom.hudAlt.textContent = `${Math.round(alt)} m`;
    this.dom.hudGap.textContent = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} m`;

    if (gap < 5.5 && cryoRemaining <= 0) {
      this.dom.hudGapPill.classList.add('is-danger');
    } else {
      this.dom.hudGapPill.classList.remove('is-danger');
    }

    if (cryoRemaining > 0) {
      this.dom.cryoBadge.classList.remove('hidden');
      this.dom.cryoTimer.textContent = `${cryoRemaining.toFixed(1)}s`;
    } else {
      this.dom.cryoBadge.classList.add('hidden');
    }
  }

  handleGameOver({ altitude, biome, ghostAlt, ghostSamples }) {
    this.isPlaying = false;
    this.stopHintLoop();

    const player = this.store.getSelectedPlayer();
    const rival = this.store.getRival(player.id);
    const { isNewBest, newlyUnlocked, roundedAlt } = this.store.recordRunResult(player.id, {
      altitude,
      maxStreak: this.maxStreak,
      ghostSamples
    });

    if (newlyUnlocked.length > 0) {
      setTimeout(() => this.sound.playUnlock(), 250);
    }

    const acc = this.totalAttempts > 0 ? Math.round((this.correctCount / this.totalAttempts) * 100) : 100;

    this.dom.goEmoji.textContent = biome.wipeoutEmoji;
    this.dom.goHeadline.textContent = biome.wipeoutTitle;
    this.dom.goSub.textContent = biome.wipeoutSub;
    this.dom.goAlt.textContent = `${roundedAlt} m`;
    this.dom.goStreak.textContent = `${this.maxStreak}×`;
    this.dom.goAcc.textContent = `${acc}%`;

    if (ghostAlt !== null && rival) {
      const diff = Math.round(roundedAlt - ghostAlt);
      this.dom.goGhost.textContent = `${diff >= 0 ? '+' : ''}${diff} m vs ${rival.name}`;
    } else {
      this.dom.goGhost.textContent = 'No Ghost Yet';
    }

    this.dom.goPbBanner.classList.toggle('hidden', !isNewBest);

    if (newlyUnlocked.length > 0) {
      const labels = newlyUnlocked.map((h) => `${h.icon} ${h.name}`).join(', ');
      this.dom.goHatBanner.textContent = `🎩 Hat Unlocked: ${labels}!`;
      this.dom.goHatBanner.classList.remove('hidden');
    } else {
      this.dom.goHatBanner.classList.add('hidden');
    }

    this.dom.modalGameOver.classList.remove('hidden');
  }

  /* ---------- PARENT CALIBRATION MODAL ---------- */

  openParentModal() {
    this.parentActiveId = this.store.getSelectedPlayer().id;
    this.renderParentTabs();
    this.renderParentBody();
    this.dom.modalParent.classList.remove('hidden');
  }

  closeParentModal() {
    this.dom.modalParent.classList.add('hidden');
    if (!this.isPlaying) {
      this.renderLobby();
    }
  }

  renderParentTabs() {
    this.dom.parentTabs.innerHTML = '';
    for (const p of this.store.getPlayers()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `parent-tab${p.id === this.parentActiveId ? ' is-active' : ''}`;
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        this.parentActiveId = p.id;
        this.renderParentTabs();
        this.renderParentBody();
      });
      this.dom.parentTabs.appendChild(btn);
    }
  }

  renderParentBody() {
    const p = this.store.getPlayer(this.parentActiveId);
    this.dom.parentName.value = p.name;

    this.dom.parentWeightToggle.querySelectorAll('[data-weight]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.weight === p.weightClass);
    });

    this.renderTableToggles(this.dom.comfortToggles, p.comfortTables, 'is-comfort', (tbl) => {
      const next = p.comfortTables.includes(tbl)
        ? p.comfortTables.filter((x) => x !== tbl)
        : [...p.comfortTables, tbl];
      if (next.length === 0) return;
      this.store.updatePlayerConfig(p.id, { comfortTables: next });
      this.renderParentBody();
    });

    this.renderTableToggles(this.dom.newToggles, p.newTables, 'is-new', (tbl) => {
      const next = p.newTables.includes(tbl)
        ? p.newTables.filter((x) => x !== tbl)
        : [...p.newTables, tbl];
      this.store.updatePlayerConfig(p.id, { newTables: next });
      this.renderParentBody();
    });

    this.renderParentHeatmap();
  }

  renderTableToggles(container, activeList, activeClass, onToggle) {
    container.innerHTML = '';
    for (let t = 2; t <= 15; t++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `table-chip${activeList.includes(t) ? ` ${activeClass}` : ''}`;
      btn.textContent = `${t}×`;
      btn.addEventListener('click', () => onToggle(t));
      container.appendChild(btn);
    }
  }

  classifyFact(stat) {
    if (!stat || (stat.right === 0 && stat.wrong === 0)) return 'hm-grey';
    if (stat.streak >= 3) return 'hm-green';
    if (stat.wrong > 0 && stat.streak < 2) return 'hm-red';
    return 'hm-amber';
  }

  renderParentHeatmap() {
    const p = this.store.getPlayer(this.parentActiveId);
    const facts = p.facts || {};
    this.dom.masteryHeatmap.innerHTML = '';

    // Top-left corner
    const corner = document.createElement('div');
    corner.className = 'hm-head';
    corner.textContent = '×';
    this.dom.masteryHeatmap.appendChild(corner);

    // Column headers 1..12
    for (let c = 1; c <= 12; c++) {
      const h = document.createElement('div');
      h.className = 'hm-head';
      h.textContent = String(c);
      this.dom.masteryHeatmap.appendChild(h);
    }

    // 12x12 rows
    for (let r = 1; r <= 12; r++) {
      const rh = document.createElement('div');
      rh.className = 'hm-head';
      rh.textContent = String(r);
      this.dom.masteryHeatmap.appendChild(rh);

      for (let c = 1; c <= 12; c++) {
        const key = QuestionEngine.factKey(r, c);
        const stat = facts[key];
        const cls = this.classifyFact(stat);
        const cell = document.createElement('div');
        cell.className = `hm-cell ${cls}`;
        cell.textContent = String(r * c);
        cell.title = stat
          ? `${r} × ${c} = ${r * c} | Right: ${stat.right}, Wrong: ${stat.wrong}, Streak: ${stat.streak}`
          : `${r} × ${c} = ${r * c} | Unseen`;
        this.dom.masteryHeatmap.appendChild(cell);
      }
    }

    // Extended facts (13x-15x)
    const extKeys = Object.keys(facts).filter((k) => {
      const parts = k.split('x').map(Number);
      return parts[1] > 12;
    });
    this.dom.extendedFacts.innerHTML = '';
    for (const k of extKeys) {
      const [a, b] = k.split('x').map(Number);
      const stat = facts[k];
      const cls = this.classifyFact(stat);
      const pill = document.createElement('span');
      pill.className = `ext-pill ${cls}`;
      pill.textContent = `${a}×${b}=${a * b} (🔥${stat.streak})`;
      this.dom.extendedFacts.appendChild(pill);
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.risingLavaApp = new UIController();
});
