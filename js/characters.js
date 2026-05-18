// ============================================================
// CHARACTER ROSTER - Camelias FC
// Abilities marked [TBD] will be updated when provided.
// ============================================================

const ROLES = {
  GK:  { label: "Goalkeeper", abbr: "GK",  color: "#FFD700", ultimateTrigger: "block"   },
  DEF: { label: "Defender",   abbr: "DEF", color: "#4da6ff", ultimateTrigger: "tackle"  },
  MID: { label: "Midfielder", abbr: "MID", color: "#bb77ff", ultimateTrigger: "dribble" },
  ATK: { label: "Attacker",   abbr: "ATK", color: "#ff7733", ultimateTrigger: "dribble" }
};

// Default abilities by role — will be replaced per-character when specified
const ROLE_ABILITIES = {
  GK: {
    special: {
      name: "Iron Grip",
      description: "Triples save radius for 5 seconds.",
      duration: 5,
      effect: "gk_save_radius"
    },
    ultimate: {
      name: "Legendary Walls",
      description: "Automatically deflects the next 2 shots on target.",
      effect: "gk_auto_save",
      chargePerTrigger: 50  // 2 blocks to fill
    }
  },
  DEF: {
    special: {
      name: "Slide Tackle",
      description: "Dash forward and steal the ball from any enemy in path.",
      duration: 0.6,
      effect: "def_slide"
    },
    ultimate: {
      name: "Iron Wall",
      description: "Doubles speed and cannot be dribbled past for 5 seconds.",
      duration: 5,
      effect: "def_iron_wall",
      chargePerTrigger: 34  // 3 tackles to fill
    }
  },
  MID: {
    special: {
      name: "Vision Pass",
      description: "Next kick passes through all enemies and finds a teammate.",
      duration: 0,
      effect: "mid_vision_pass"
    },
    ultimate: {
      name: "Playmaker",
      description: "All teammates gain 60% speed boost for 6 seconds.",
      duration: 6,
      effect: "mid_playmaker",
      chargePerTrigger: 34  // 3 dribbles to fill
    }
  },
  ATK: {
    special: {
      name: "Speed Burst",
      description: "Sprint at double speed for 3 seconds.",
      duration: 3,
      effect: "atk_sprint"
    },
    ultimate: {
      name: "Power Shot",
      description: "Next kick is unstoppable — cannot be saved by the goalkeeper.",
      duration: 0,
      effect: "atk_power_shot",
      chargePerTrigger: 25  // 4 dribbles to fill
    }
  }
};

function makeAbilities(role) {
  const base = ROLE_ABILITIES[role];
  return {
    special: {
      ...base.special,
      charge: 0,
      maxCharge: 100,
      chargeRate: 10,   // % per second (fills in ~10s)
      active: false,
      activeTimer: 0,
      cooldown: 0,
      cooldownMax: 2
    },
    ultimate: {
      ...base.ultimate,
      charge: 0,
      maxCharge: 100,
      active: false,
      activeTimer: 0
    }
  };
}

const CHARACTERS = [
  // ── UNLOCKED ──────────────────────────────────────────────
  {
    id: 1,  name: "Duarte",    role: "GK",  unlocked: true,
    stats: { speed: 62, shooting: 52, defense: 92, passing: 70 },
    skinColor: "#f4c88a", hairColor: "#3d2b1f", shirtColor: "#FFD700"
  },
  {
    id: 2,  name: "Jari",      role: "GK",  unlocked: true,
    stats: { speed: 78, shooting: 65, defense: 88, passing: 74 },
    skinColor: "#d4956a", hairColor: "#1a1a1a", shirtColor: "#1a4fff"
  },
  {
    id: 3,  name: "Diego",     role: "ATK", unlocked: true,
    stats: { speed: 75, shooting: 68, defense: 85, passing: 72 },
    skinColor: "#e8b89a", hairColor: "#5c3d2e", shirtColor: "#1a4fff"
  },
  {
    id: 4,  name: "Vitor",     role: "ATK", unlocked: true,
    stats: { speed: 77, shooting: 64, defense: 87, passing: 70 },
    skinColor: "#c48b6a", hairColor: "#2c1810", shirtColor: "#1a4fff"
  },
  {
    id: 5,  name: "Vieira",    role: "ATK", unlocked: true,
    stats: { speed: 80, shooting: 70, defense: 84, passing: 78 },
    skinColor: "#a06040", hairColor: "#1a1a1a", shirtColor: "#1a4fff"
  },
  {
    id: 6,  name: "Guilherme", role: "MID", unlocked: true,
    stats: { speed: 82, shooting: 74, defense: 70, passing: 88 },
    skinColor: "#e8c9a8", hairColor: "#8b6914", shirtColor: "#1a4fff"
  },
  {
    id: 7,  name: "Sendas",    role: "MID", unlocked: true,
    stats: { speed: 80, shooting: 76, defense: 72, passing: 86 },
    skinColor: "#d4956a", hairColor: "#3d2b1f", shirtColor: "#1a4fff"
  },
  {
    id: 8,  name: "Martim",    role: "DEF", unlocked: true,
    stats: { speed: 83, shooting: 78, defense: 68, passing: 85 },
    skinColor: "#f0d0b0", hairColor: "#6b4c1e", shirtColor: "#1a4fff"
  },
  {
    id: 9,  name: "Vinícius",  role: "DEF", unlocked: true,
    stats: { speed: 94, shooting: 86, defense: 55, passing: 82 },
    skinColor: "#8b5e3c", hairColor: "#1a1a1a", shirtColor: "#1a4fff"
  },
  {
    id: 10, name: "Helio",     role: "MID", unlocked: true,
    stats: { speed: 78, shooting: 75, defense: 74, passing: 84 },
    skinColor: "#c8935a", hairColor: "#2c2c2c", shirtColor: "#1a4fff"
  },
  {
    id: 11, name: "Mohammed",  role: "ATK", unlocked: true,
    stats: { speed: 88, shooting: 88, defense: 52, passing: 80 },
    skinColor: "#7a4f2d", hairColor: "#1a1a1a", shirtColor: "#1a4fff"
  },
  {
    id: 12, name: "Breno",     role: "DEF", unlocked: true,
    stats: { speed: 90, shooting: 84, defense: 50, passing: 76 },
    skinColor: "#6b3d1e", hairColor: "#1a1a1a", shirtColor: "#1a4fff"
  },
  {
    id: 13, name: "Rafael",    role: "MID", unlocked: true,
    stats: { speed: 85, shooting: 82, defense: 58, passing: 78 },
    skinColor: "#d4956a", hairColor: "#4a3020", shirtColor: "#1a4fff"
  },
  {
    id: 14, name: "Rogerio",   role: "MID", unlocked: true,
    stats: { speed: 82, shooting: 78, defense: 76, passing: 87 },
    skinColor: "#b87c50", hairColor: "#2c1810", shirtColor: "#1a4fff"
  },
  {
    id: 15, name: "Gustavo",   role: "MID", unlocked: true,
    stats: { speed: 87, shooting: 85, defense: 54, passing: 77 },
    skinColor: "#e0b090", hairColor: "#5c3d2e", shirtColor: "#1a4fff"
  },
  {
    id: 16, name: "Enzo",      role: "DEF", unlocked: true,
    stats: { speed: 92, shooting: 90, defense: 48, passing: 80 },
    skinColor: "#f0c8a0", hairColor: "#8b7355", shirtColor: "#1a4fff"
  },
  // ── BLOCKED ───────────────────────────────────────────────
  {
    id: 17, name: "Luís",              role: "ATK", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333"
  },
  {
    id: 18, name: "Miranda",           role: "MID", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333"
  },
  {
    id: 19, name: "Leonardo Martins",  role: "ATK", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333"
  },
  // Santiago can play GK or MID — each position unlocks a different ultimate
  {
    id: 20, name: "Santiago",  role: "GK", dualRole: "MID", unlocked: false,
    stats: { speed: 95, shooting: 95, defense: 60, passing: 88 },
    skinColor: "#d4956a", hairColor: "#2c1810", shirtColor: "#1a4fff"
  }
];

// Attach generated abilities to each character
CHARACTERS.forEach(c => {
  if (c.unlocked) {
    c.abilities = makeAbilities(c.role);
    // Dual-role characters get a second set of abilities for their alt position
    if (c.dualRole) {
      c.altAbilities = makeAbilities(c.dualRole);
    }
  }
});
