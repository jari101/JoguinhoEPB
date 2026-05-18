// ============================================================
// CHARACTER ROSTER - Camelias FC
// ============================================================

const ROLES = {
  GK:  { label: "Goalkeeper", abbr: "GK",  color: "#FFD700", ultimateTrigger: "block"   },
  DEF: { label: "Defender",   abbr: "DEF", color: "#4da6ff", ultimateTrigger: "tackle"  },
  MID: { label: "Midfielder", abbr: "MID", color: "#bb77ff", ultimateTrigger: "dribble" },
  ATK: { label: "Attacker",   abbr: "ATK", color: "#ff7733", ultimateTrigger: "dribble" }
};

// Fallback abilities by role — used only when a character has no override
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

function makeAbilities(role, ultimateOverride) {
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
      ...(ultimateOverride || {}),
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
    id: 1, name: "Duarte", role: "GK", unlocked: true,
    stats: { speed: 62, shooting: 52, defense: 92, passing: 70 },
    skinColor: "#f4c88a", hairColor: "#3d2b1f", shirtColor: "#FFD700",
    ultimateOverride: {
      name: "Campo Dois Toques",
      description: "Forces a pass-exchange with an enemy. If the enemy fails: +60% buff to Duarte's team. If Duarte fails: +20% buff to the enemy team.",
      effect: "gk_campo_dois_toques",
      buffs: { onEnemyFail: { team: 0.60 }, onSelfFail: { enemy: 0.20 } },
      chargePerTrigger: 50
    }
  },
  {
    id: 2, name: "Jari", role: "GK", unlocked: true,
    stats: { speed: 78, shooting: 65, defense: 88, passing: 74 },
    skinColor: "#d4956a", hairColor: "#1a1a1a", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Deus Tenta",
      description: "Blocks everything. Strength +70%. Enemies entering the team area get -20% to all stats. Can foul once: target cannot use skills for 30 minutes and their stats drop -20% for the rest of the match.",
      effect: "gk_deus_tenta",
      buffs: { strength: 0.70 },
      areaDebuff: { enemyStats: -0.20 },
      foul: { skillsDisabled: 1800, statsReduction: -0.20, uses: 1 },
      chargePerTrigger: 50
    }
  },
  {
    id: 3, name: "Diego", role: "ATK", unlocked: true,
    stats: { speed: 75, shooting: 68, defense: 85, passing: 72 },
    skinColor: "#e8b89a", hairColor: "#5c3d2e", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Fator Sorte",
      description: "Steal ball chance against Diego increased by 99% for the enemy (nearly impossible to steal). 30% chance to immediately steal back if the ball is taken.",
      effect: "atk_fator_sorte",
      buffs: { stealResist: 0.99 },
      stealBackChance: 0.30,
      chargePerTrigger: 25
    }
  },
  {
    id: 4, name: "Vitor", role: "ATK", unlocked: true,
    stats: { speed: 77, shooting: 64, defense: 87, passing: 70 },
    skinColor: "#c48b6a", hairColor: "#2c1810", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Cacete",
      description: "Only activates when health or stamina drops below 60%. Speed, strength, feint, passing and accuracy all increase by 60%.",
      effect: "atk_cacete",
      condition: { healthOrStaminaBelow: 0.60 },
      buffs: { speed: 0.60, strength: 0.60, feint: 0.60, passing: 0.60, accuracy: 0.60 },
      chargePerTrigger: 25
    }
  },
  {
    id: 5, name: "Vieira", role: "ATK", unlocked: true,
    stats: { speed: 80, shooting: 70, defense: 84, passing: 78 },
    skinColor: "#a06040", hairColor: "#1a1a1a", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Fantasma",
      description: "Feint +67%. Becomes invisible to the enemy team for 6 seconds.",
      effect: "atk_fantasma",
      duration: 6,
      buffs: { feint: 0.67 },
      invisible: true,
      chargePerTrigger: 25
    }
  },
  {
    id: 6, name: "Guilherme", role: "MID", unlocked: true,
    stats: { speed: 82, shooting: 74, defense: 70, passing: 88 },
    skinColor: "#e8c9a8", hairColor: "#8b6914", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Predalva Orgulhosa",
      description: "Strength and speed +90%. The ball redirects toward the goal on every contact until it comes to a complete stop.",
      effect: "mid_predalva_orgulhosa",
      buffs: { strength: 0.90, speed: 0.90 },
      ballMagnet: { target: "goal" },
      chargePerTrigger: 34
    }
  },
  {
    id: 7, name: "Sendas", role: "MID", unlocked: true,
    stats: { speed: 80, shooting: 76, defense: 72, passing: 86 },
    skinColor: "#d4956a", hairColor: "#3d2b1f", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Rage Bait",
      description: "Taunts one enemy into attacking Sendas. Sendas takes no damage. The attacking player is sent off and cannot play for the rest of the match.",
      effect: "mid_rage_bait",
      taunt: { immuneToFoul: true, enemySentOff: true },
      chargePerTrigger: 34
    }
  },
  {
    id: 8, name: "Martim", role: "DEF", unlocked: true,
    stats: { speed: 83, shooting: 78, defense: 68, passing: 85 },
    skinColor: "#f0d0b0", hairColor: "#6b4c1e", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Pass God",
      description: "Pass accuracy +90%. Each successful pass boosts Martim's speed by 50% (max 200%). The pass recipient gains +40% to all physical stats.",
      effect: "def_pass_god",
      buffs: { passAccuracy: 0.90 },
      onSuccessfulPass: { selfSpeed: 0.50, speedCap: 2.00, recipientPhysical: 0.40 },
      chargePerTrigger: 34
    }
  },
  {
    id: 9, name: "Vinícius", role: "DEF", unlocked: true,
    stats: { speed: 94, shooting: 86, defense: 55, passing: 82 },
    skinColor: "#8b5e3c", hairColor: "#1a1a1a", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Hunt Dog",
      description: "Hunts the opposing team. Strength, speed and accuracy +90%. Cannot be fouled regardless of physical contact by opponents.",
      effect: "def_hunt_dog",
      buffs: { strength: 0.90, speed: 0.90, accuracy: 0.90 },
      foulImmune: true,
      chargePerTrigger: 34
    }
  },
  {
    id: 10, name: "Helio", role: "MID", unlocked: true,
    stats: { speed: 78, shooting: 75, defense: 74, passing: 84 },
    skinColor: "#c8935a", hairColor: "#2c2c2c", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Daqui É Caixa",
      description: "Strength and speed +120%.",
      effect: "mid_daqui_caixa",
      buffs: { strength: 1.20, speed: 1.20 },
      chargePerTrigger: 34
    }
  },
  {
    id: 11, name: "Mohammed", role: "ATK", unlocked: true,
    stats: { speed: 88, shooting: 88, defense: 52, passing: 80 },
    skinColor: "#7a4f2d", hairColor: "#1a1a1a", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Meu Pezinho",
      description: "Takes 99% of any impact — every touch by an opponent is an automatic foul. Stamina -50%, speed +60%.",
      effect: "atk_meu_pezinho",
      hyperSensitive: { anyTouchIsFoul: true },
      buffs: { speed: 0.60, stamina: -0.50 },
      chargePerTrigger: 25
    }
  },
  {
    id: 12, name: "Breno", role: "DEF", unlocked: true,
    stats: { speed: 90, shooting: 84, defense: 50, passing: 76 },
    skinColor: "#6b3d1e", hairColor: "#1a1a1a", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Na Balisa Não",
      description: "Will never kick toward goal, no matter the opportunity. Support stats (feinting, passing, stealing) +100%. Physical stats (strength, speed, stamina) +50%.",
      effect: "def_na_balisa_nao",
      noShoot: true,
      buffs: { feint: 1.00, passing: 1.00, steal: 1.00, strength: 0.50, speed: 0.50, stamina: 0.50 },
      chargePerTrigger: 34
    }
  },
  {
    id: 13, name: "Rafael", role: "MID", unlocked: true,
    stats: { speed: 85, shooting: 82, defense: 58, passing: 78 },
    skinColor: "#d4956a", hairColor: "#4a3020", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Aura",
      description: "Rafael shouts 'Aura' — every teammate gains +15% to all stats.",
      effect: "mid_aura",
      buffs: { targets: "teammates", allStats: 0.15 },
      chargePerTrigger: 34
    }
  },
  {
    id: 14, name: "Rogerio", role: "MID", unlocked: true,
    stats: { speed: 82, shooting: 78, defense: 76, passing: 87 },
    skinColor: "#b87c50", hairColor: "#2c1810", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Bancada",
      description: "Rogerio starts a fight — both he and one enemy are sent to the bench. Rogerio's team plays on; the enemy does not return for 45 minutes.",
      effect: "mid_bancada",
      selfBench: true,
      enemyBench: { duration: 2700 },
      chargePerTrigger: 34
    }
  },
  {
    id: 15, name: "Gustavo", role: "MID", unlocked: true,
    stats: { speed: 87, shooting: 85, defense: 54, passing: 77 },
    skinColor: "#e0b090", hairColor: "#5c3d2e", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Força Total",
      description: "Force +70%, accuracy +20%. Whenever Gustavo passes, the receiving player's next kick gains +25% force and accuracy.",
      effect: "mid_forca_total",
      buffs: { force: 0.70, accuracy: 0.20 },
      onPass: { recipientNextKick: { force: 0.25, accuracy: 0.25 } },
      chargePerTrigger: 34
    }
  },
  {
    id: 16, name: "Enzo", role: "DEF", unlocked: true,
    stats: { speed: 92, shooting: 90, defense: 48, passing: 80 },
    skinColor: "#f0c8a0", hairColor: "#8b7355", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Wall",
      description: "Slows all enemies within range by 30%. Steal ball chance +20%.",
      effect: "def_wall",
      aura: { slowEnemies: -0.30 },
      buffs: { stealChance: 0.20 },
      chargePerTrigger: 34
    }
  },
  // ── BLOCKED ───────────────────────────────────────────────
  {
    id: 17, name: "Luís", role: "ATK", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333",
    ultimateOverride: {
      name: "Raio",
      description: "Kick force +40%, speed +80%.",
      effect: "atk_raio",
      buffs: { kickForce: 0.40, speed: 0.80 },
      chargePerTrigger: 25
    }
  },
  {
    id: 18, name: "Miranda", role: "MID", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333",
    ultimateOverride: {
      name: "Canhão",
      description: "Kick force +150%, accuracy +25%.",
      effect: "mid_canhao",
      buffs: { kickForce: 1.50, accuracy: 0.25 },
      chargePerTrigger: 34
    }
  },
  {
    id: 19, name: "Leonardo Martins", role: "ATK", unlocked: false,
    stats: { speed: 0, shooting: 0, defense: 0, passing: 0 },
    skinColor: "#555", hairColor: "#222", shirtColor: "#333",
    ultimateOverride: {
      name: "Cobra",
      description: "Unlocks a pure feint ability: feint +50%, speed +75%.",
      effect: "atk_cobra",
      buffs: { feint: 0.50, speed: 0.75 },
      chargePerTrigger: 25
    }
  },
  // Santiago can play GK or MID — each position has its own ultimate
  {
    id: 20, name: "Santiago", role: "GK", dualRole: "MID", unlocked: false,
    stats: { speed: 95, shooting: 95, defense: 60, passing: 88 },
    skinColor: "#d4956a", hairColor: "#2c1810", shirtColor: "#1a4fff",
    ultimateOverride: {
      name: "Perfect Defense",
      description: "Extends catch range by 2 metres sideways and 50 cm upward.",
      effect: "gk_perfect_defense",
      catchRange: { sideways: 2.00, height: 0.50 },
      chargePerTrigger: 50
    },
    dualUltimateOverride: {
      name: "Perfect Player",
      description: "70% chance to steal back a ball just taken from him. 100% steal chance on any other ball. Passes and kicks have +50% power and accuracy.",
      effect: "mid_perfect_player",
      stealBack: 0.70,
      stealChance: 1.00,
      buffs: { kickPower: 0.50, accuracy: 0.50 },
      chargePerTrigger: 34
    }
  }
];

// Attach generated abilities to each character
CHARACTERS.forEach(c => {
  if (c.unlocked) {
    c.abilities = makeAbilities(c.role, c.ultimateOverride);
    // Dual-role characters get a second ability set for their alt position
    if (c.dualRole) {
      c.altAbilities = makeAbilities(c.dualRole, c.dualUltimateOverride);
    }
  }
});
