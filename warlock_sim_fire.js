// Number of simulations to run
const SIMS = 10000;
// Time in seconds
const TIME = 120;
// Character stats
const SP = 319 + 35 + 40 + 36;
const CRIT = 9.13 + 1 + 5 + 10;
const HIT = 5;
const MANA = 4213;
const MP5 = 4; // Not implemented

// Curses/Modifiers
// Set to true if Curse of Shadows (10% shadow damage) is applied to the boss
const COS = true;
// Set to true if Shadow Weaving  (15% shadow damage) is applied to the boss
const SW = false;
// Set to true if you have a corruption slot (assumes 0 knockoffs)
const CS = false;
// Set to true if using DS/ruin spec or any spec that sacrifices succubus (15% shadow damage)
const DS = false;
// Set to true if using SM/ruin spec (10% shadow damage)
const SM = false;
// Set to true if using TOEP
const TOEP = false;
// Set to true if using ZHC
const ZHC = false;

// Other warlock crit chance
//const OTHER_LOCKS = [15, 15, 15];
const OTHER_LOCKS = [];

// Adjust for boss base resistance (not implemented)
const BOSS_SHADOW_RESISTANCE = 0;

// Set this to true to print out what occurs at each tick
// Don't touch this unless you know what you're doing
const SHOW_DETAILS = false;

// DON'T TOUCH ANYTHING BELOW THIS
const ZHC_START_STACKS = 12;
const ZHC_DURATION = 20000;
const ZHC_CD = 120;
const TOEP_BASE = 175;
const TOEP_DURATION = 15000;
const TOEP_CD = 90000;
const SEARING_PAIN_CHANNEL = 1500;
const SEARING_PAIN_COST = 370;
const SEARING_PAIN_BASE = 208;
const SEARING_PAIN_RANGE = 36;
const GCD = 1500;
const ISB_DURATION = 12000;
const COR_COST = 290;
const COR_TICK_DMG = 111;
const BASE_HIT = 83;
const ITEM_CD = 120000;

// Debug/print helper function
const print = (...args) => {
  if (SHOW_DETAILS) console.log(...args)
}

// Calculate shadow damage modifier
const getShadowDamageModifier = () => {
	let shadowDmgModifier = 1;
  if (SM) {
  	shadowDmgModifier += 0.10;
  }
  
  if (DS) {
  	shadowDmgModifier += 0.15;
  }
  
  if (COS) {
  	shadowDmgModifier += 0.10;
  }
  
  if (SW) {
  	shadowDmgModifier += 0.15;
  }
  return shadowDmgModifier;
}

// Calculates damage for a shadow bolt
const getSBDamage = (bossStats, bonusSP = 0) => {
  if (Math.random() * 100 < Math.min(BASE_HIT + HIT, 99)) {
    let modifier = getShadowDamageModifier();

    const baseDamage = SEARING_PAIN_BASE + Math.floor(Math.random() * SEARING_PAIN_RANGE);
    const spBonus = Math.round((SP + bonusSP) * 0.4285);
    let damage = baseDamage + spBonus

    if (Math.random() * 100 <= CRIT) {
      damage *= 2;
    }
    const dmg = Math.round(damage * modifier)
    print("Shoot shadow bolt for:", dmg)
    return dmg;
  }

  print("Shadowbolt resisted!")
  return 0;
}

// Returns false if GCD activates, true otherwise
const manaRegen = (playerStats) => {
  // Demonic rune usage
  if (playerStats.runeTimer == 0) {
    playerStats.runeTimer = ITEM_CD;
    const manaGain = Math.round(900 + Math.random() * 600)
    playerStats.mana += manaGain
    print("Use demonic rune for:", manaGain)
    return true;
  }

  // Potion usage
  if(playerStats.potTimer == 0) {
    playerStats.potTimer = ITEM_CD;
    const manaGain = Math.round(1350 + Math.random() * 900);
    playerStats.mana += manaGain;
    print("Use Major Mana Potion for:", manaGain)
    return true;
  }

  // Lifetap
  const bonusSP = calcBonusSpellPower(playerStats)
  let manaGain
  if (DS) {
    manaGain = Math.floor(424 + (SP + bonusSP) * 0.8) * 1.15 * 1.2;
  } else if (SM) {
    manaGain = Math.floor(424 + (SP + bonusSP) * 0.8) * 1.2;
  } else {
    manaGain = Math.floor(424 + (SP + bonusSP) * 0.8);
  }
  playerStats.mana += manaGain
  playerStats.gcdTimer = GCD;
  print("Cast lifetap for:", manaGain)
  return false;
}

const calcBonusSpellPower = (playerStats) => {
  if (playerStats.zhcTimer > 0 && playerStats.zhcStacks > 0) {
    const spellPower = playerStats.zhcStacks * 17
    playerStats.zhcStacks -= 1;
    print("Consuming ZHC stack")
    return spellPower;
  }
  if (playerStats.toepTimer > 0) {
    print("Adding TOEP spell power")
    return TOEP_BASE;
  }
  return 0;
}

const runPlayer = (playerStats, bossStats) => {
  // Constant ticks
  if (playerStats.runeTimer > 0) playerStats.runeTimer -= 100;
  if (playerStats.potTimer > 0) playerStats.potTimer -= 100;
  if (playerStats.zhcTimer > 0) playerStats.zhcTimer -= 100;
  if (playerStats.zhcCD > 0) playerStats.zhcCD -= 100;
  if (playerStats.toepTimer > 0) playerStats.toepTimer -= 100;
  if (playerStats.toepCD > 0) playerStats.toepCD -= 100;


  if (playerStats.corruptionTimer > 0) {
    playerStats.corruptionTimer -= 100;
    if (playerStats.corruptionTimer % 3000 == 0) {
      const tick = Math.round((COR_TICK_DMG + (SP + playerStats.corruptionBonusSP) * 0.1666) * getShadowDamageModifier())
      print("Corruption ticks for: ", tick);
      playerStats.damage += tick
      if (SM && Math.random() * 100 <= 4) {
        print("Shadow trance activates!")
        playerStats.shadowTrance = true;
      } 
    }
    if (playerStats.corruptionTimer == 0) {
      playerStats.corruptionBonusSP = 0;
      print("Corruption expires")
    }
  }

  if (playerStats.castTimer == 0 && playerStats.gcdTimer == 0) {
    // Handle shadowbolt being casted
    if (playerStats.casting) {
      playerStats.casting = false;
      playerStats.damage += getSBDamage(bossStats, calcBonusSpellPower(playerStats))
    }

    // Activate TOEP if possible (TOEP is off CD and ZHC isn't active)
    if (TOEP && playerStats.zhcTimer == 0 && playerStats.toepCD == 0) {
      playerStats.toepTimer = TOEP_DURATION;
      playerStats.toepCD = TOEP_CD;
      print("Activate TOEP")
    }

    // Activate ZHC if possible (ZHC is off CD and TOEP isn't active)
    if (ZHC && playerStats.toepTimer == 0 && playerStats.zhcCD == 0) {
      playerStats.zhcTimer = ZHC_DURATION;
      playerStats.zhcCD = ZHC_CD;
      playerStats.zhcStacks = ZHC_START_STACKS;
      print("Activate ZHC")
    }

    // Handle Corruption
    if (CS && playerStats.corruptionTimer == 0) {
      if (playerStats.mana >= COR_COST || manaRegen(playerStats)) {
        let hitFromTalents = 0
        if (SM) hitFromTalents = 10;
        if (DS) hitFromTalents = 4;

        if (Math.random() * 100 < Math.min(BASE_HIT + HIT + hitFromTalents, 99)) {
          print("Cast corruption");
          playerStats.corruptionBonusSP = calcBonusSpellPower(playerStats);
          playerStats.corruptionTimer = 18000;
        } else {
          print("Corruption resisted!")
        }
        playerStats.mana -= COR_COST;
        playerStats.gcdTimer = GCD;
      }
    } else {
      // Handle shadow bolt
      let cast = false;
      if (playerStats.mana >= SEARING_PAIN_COST) {
        cast = true
      } else {
        if (manaRegen(playerStats)) {
          cast = true
        }
      }

      if (cast) {
        playerStats.mana -= SEARING_PAIN_COST;
        if (playerStats.shadowTrance) {
          playerStats.gcdTimer = GCD;
          playerStats.shadowTrance = false;
          print("Shadow trance consumed!")
          playerStats.damage += getSBDamage(bossStats, calcBonusSpellPower(playerStats))
        } else {
          print("Begin casting shadow bolt")
          playerStats.castTimer = SEARING_PAIN_CHANNEL;
          playerStats.casting = true;
        }
      }
    }
  } else if (playerStats.gcdTimer > 0) {
    playerStats.gcdTimer -= 100;
  } else {
    playerStats.castTimer -= 100;
  }
}

const runOtherLock = (pStats, bStats) => {

}

const initOtherLocks = () => {
	const result = []
  for (let i = 0; i < OTHER_LOCKS.length; i++) {
  	const stats = {
    	critChance: OTHER_LOCKS[i],
      cd: 0,
    }
  }
  return result
}

// Main Loop
const runSimulation = () => {
  const ticks = TIME * 10
  const playerStats = {
    castTimer: 0,
    casting: false,
    gcdTimer: 0,
    zhcTimer: 0,
    zhcCD: 0,
    zhcCount: 0,
    toepTimer: 0,
    toepCD: 0,
    corruptionTimer: 0,
    corruptionBonusSP: 0,
    shadowTrance: false,
    mana: MANA,
    potTimer: 0,
    runeTimer: 0,
    damage: 0,
  }
  
  const bossStats = {
    isbStacks: 0,
    isbTimer: 0,
  }
  
  const otherLockStats = initOtherLocks()
  
  for (let i = 0; i < ticks; i += 1) {
    runPlayer(playerStats, bossStats)
    for (let j = 0; j < OTHER_LOCKS.length; j++) {
      runOtherLock(otherLockStats[j], bossStats)
    }
  }
  return playerStats.damage/TIME;
}

let totalDps = 0;
for (let i = 0; i < SIMS; i++) {
	const dps = runSimulation();
  print("DPS for sim:", dps);
  totalDps += dps;
}

console.log("Average DPS: ", totalDps/SIMS);