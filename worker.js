/* eslint-disable no-undef */
importScripts("common.js");

const BUDGET_MAX = [200, 200, 999, 999, 999, 999];
const INITIAL_GOLD = 1000000000;
const MAX_DEPTH = 1000;
const UPDATE_INTERVAL = 3000;
var levelXp = [];
var allCombos = [[], [], []];
var lastUpdateTime;
const SEARCH_OPTIONS = {maxLevel: 1, resort: 0};
const RNG_MIN = [0, 10, 20, 10, 0, 0];
const RNG_MAX = [0, 200, 200, 100, 100, 100];
const RNG_IN_LEVEL_MIN = 0;
const RNG_IN_LEVEL_MAX = 0;
const RNG_TARGET_LEVEL_MIN = 100;
const RNG_TARGET_LEVEL_MAX = 500;
const RNG_IN_QUALITY_MIN = 5;
const RNG_IN_QUALITY_MAX = 10;

fillXpTable();
makeCombos();

onmessage = function(message) {
  if (DEBUG) console.log("Worker received request:");
  if (DEBUG) console.log(message.data);
  for (let i = 0; i < (message.data.runTests ? message.data.numTests : 1); i++) {
    let result = runTestIteration(message.data);
    postMessage(result);
  }
};

function runTestIteration(solution) {
  resetSolution(solution, true);
  randomize(solution);

  // Determine if we are in "spend everything" mode
  let targetXp = levelXp[solution.targetLevel];
  let availableXp = solution.budget.slice(2).reduce(( acc, cur, i ) => (acc + TROOPS[i + 2].xp * cur), 0);
  let noRingsXp = availableXp / targetXp;
  if (DEBUG) console.log("XP factor without rings: " + noRingsXp);
  // Don't do the exhaustive refinement if we're good without rings
  //if (noRingsXp >= 1) solution.maxRefinementLevel = 1;

  if (!solution.runTests) {
    stringModeSearch(solution);
    if (DEBUG) console.log(solution);

    // if (!solution.reachedQuality) {
    //   if (DEBUG) console.log("String didn't reach quality");
    //   resetSolution(solution, false);
    //   bruteForceSearch(solution, 0, 1, SEARCH_OPTIONS);
    // }

    postMessage(solution);

    if (DEBUG_SINGLE_SOLUTION) {
      solution.maxRefinementLevel = 1;
      solution.secondarySearch = 1;
      resetSolution(solution, false);
      bruteForceSearch(solution, 1, solution.maxRefinementLevel, SEARCH_OPTIONS);
      if (DEBUG) console.log(solution);
      postMessage(solution);
    }
  } else {
    bruteForceSearch(solution, 0, 0, SEARCH_OPTIONS);
    if (solution.runSecondarySearch) {
      let secondarySolution = Object.assign({}, solution);
      resetSolution(secondarySolution);
      bruteForceSearch(secondarySolution, 1, 1, SEARCH_OPTIONS);
      solution.secondarySolution = secondarySolution;
      solution.secondaryTime = secondarySolution.time;
      if (solution.bestQuality >= secondarySolution.bestQuality && solution.bestLevel >= secondarySolution.bestLevel) {
        solution.quickCostDiff = solution.bestCost - secondarySolution.bestCost;
      } else {
        solution.quickCostDiff =
          solution.bestQuality + "->" + secondarySolution.bestQuality + ", "
          + solution.bestLevel + "->" + secondarySolution.bestLevel + ", "
          + solution.bestCost + "->" + secondarySolution.bestCost;
      }
    }
  }
  solution.final = true;
  return solution;
}

function bruteForceSearch(solution, minRefLevel, maxRefLevel, options) {
  lastUpdateTime = solution.startTime;
  for (let refinementLevel = minRefLevel; refinementLevel <= maxRefLevel; refinementLevel++) {
    if (DEBUG) console.log("Starting refinement level " + refinementLevel + " with " + allCombos[refinementLevel].length + " combos");
    solution.combos = allCombos[refinementLevel];
    search(0, 0, solution, options);
    if (DEBUG) console.log("Done with refinement level " + refinementLevel + ", best solution so far:");
    if (DEBUG) console.log(solution);
  }
  prepSolution(options, solution);
}

function stringModeSearch(solution) {
  let targetXp = levelXp[solution.targetLevel];
  //let availableXp = solution.budget.slice(1).reduce(( acc, cur, i ) => (acc + TROOPS[i + 1].xp * cur), 0);
  let accXp = 0;
  let troopsToUse = [];
  for (let troopType = 5; troopType > 0; troopType--) {
    for (numTroops = 0; numTroops < solution.budget[troopType]; numTroops++) {
      accXp += TROOPS[troopType].xp;
      troopsToUse.push(troopType);
      if (accXp >= targetXp) {
        // Find potential cheaper replacement troop
        let lastUsedTroopType = troopType;
        for (let cheaperTroopType = troopType - 1; cheaperTroopType > 0; cheaperTroopType--) {
          if (solution.budget[cheaperTroopType] > 0) {
            let accXpWithReplacement = accXp - TROOPS[lastUsedTroopType].xp + TROOPS[cheaperTroopType].xp;
            if (accXpWithReplacement >= targetXp) {
              accXp = accXpWithReplacement;
              troopsToUse.pop();
              troopsToUse.push(cheaperTroopType);
              lastUsedTroopType = cheaperTroopType;
            }
          }
        }
        break;
      }
    }
    if (accXp >= targetXp) break;
  }
  let step = {troops: []};
  while(troopsToUse.length) {
    step.troops.unshift(troopsToUse.pop());
    solution.troopTotals[step.troops[step.troops.length - 1]] ++;
    if (step.troops.length == 5) {
      solution.steps.push(step);
      step = {troops: []};
    }
  }
  if (step.troops.length) solution.steps.push(step);

  // Calculate stats
  let prevQuality = solution.initialQuality;
  let prevXp = levelXp[solution.initialLevel] + solution.initialXp;
  let prevLevel = solution.initialLevel;
  let prevCost = 0;
  for (step of solution.steps) {
    step.quality = prevQuality;
    step.percent = step.troops.reduce(sumPercent, 0);
    if (step.percent >= 100 && prevQuality < 10) {
      step.quality++;
    }
    step.sumXp = prevXp + step.troops.reduce(sumXp, 0);
    step.level = getLevel(prevLevel, step.sumXp);
    step.cost = getCost(prevLevel, step.troops.length);
  
    step.sumCost = prevCost + step.cost;
    step.extraXp = step.sumXp - levelXp[step.level];
    solution.quality = step.quality;
    solution.sumXp = step.sumXp;
    solution.level = step.level;
    solution.sumCost = step.sumCost;

    prevStep = step;
    prevQuality = prevStep.quality;
    prevXp = prevStep.sumXp;
    prevLevel = prevStep.level;
    prevCost = prevStep.sumCost;
  }
  saveBestSolution(solution);
  prepSolution(undefined, solution);
}

function search(startCombo, depth, solution, options) {
  if (new Date().getTime() - lastUpdateTime > UPDATE_INTERVAL) {
    lastUpdateTime = new Date().getTime();
    prepSolution(options, solution);
    postMessage(solution);
  }
  for (let comboNumber = startCombo; comboNumber < solution.combos.length; comboNumber++) {
    var reachedQuality = false;
    var reachedLevel = false;
    solution.iterations++;

    if (solution.steps[depth]) {
      subtractFromTotal(solution, solution.combos[solution.steps[depth].combo]);
    }
    solution.steps[depth] = {combo: comboNumber, comboId: solution.combos[comboNumber].id};
    solution.lastInsert = depth;
    addToTotal(solution, solution.combos[comboNumber]);

    if (budgetFits(solution)) {
      //console.log("budget fits");
      calculateStats(solution);
      if (solution.quality >= solution.targetQuality) {
        reachedQuality = true;
        if (!solution.reachedQuality) {
          if (DEBUG) console.log("Reached target quality!");
          solution.reachedQuality = true;
          saveBestSolution(solution);
        }
      }
      if (solution.level >= solution.targetLevel) {
        reachedLevel = true;
        if (!solution.reachedLevel) {
          if (DEBUG) console.log("Reached target level!");
          solution.reachedLevel = true;
          saveBestSolution(solution);
        }
      }
      if (solution.quality > solution.bestQuality && solution.quality <= solution.targetQuality) {
        // Improved quality but didn't reach goal
        if (DEBUG) console.log("New quality: " + solution.quality);
        saveBestSolution(solution);
      // } else if (options.maxLevel && solution.level > solution.bestLevel && !reachedLevel && reachedQuality) {
      //   // Improved level but didn't reach goal
      //   if (DEBUG) console.log("New level: " + solution.level);
      //   saveBestSolution(solution);
      } else if (solution.sumCost < solution.bestCost
        && solution.quality >= solution.bestQuality
        // && (!options.maxLevel || solution.level >= solution.bestLevel)
        // Improved cost, same or higher quality, no goal change
        && reachedQuality == solution.reachedQuality && reachedLevel == solution.reachedLevel) {
        if (DEBUG) console.log("New best cost at same goal status: " + solution.sumCost);
        saveBestSolution(solution);
      }
      if (!reachedQuality || (!reachedLevel && depth < MAX_DEPTH)) {
        search(comboNumber, depth + 1, solution, options);
      }
    }
  }
  subtractFromTotal(solution, solution.combos[solution.steps[depth].combo]);
  solution.steps.pop();
}

function saveBestSolution(solution) {
  solution.bestQuality = solution.quality;
  solution.bestLevel = solution.level;
  solution.bestCost = solution.sumCost;
  solution.bestSteps = JSON.parse(JSON.stringify(solution.steps));
  solution.bestCombos = solution.combos;
  solution.troopCounts = [...solution.troopTotals];
}

function prepSolution(options, solution) {
  if (solution.combos) {
    if (options && options.resort) resortSolution(solution, solution.combos);
    // Copy combo attributes to step for simpler rendering
    for (let step of solution.bestSteps) {
      for (var prop in solution.bestCombos[step.combo]) {
        if (Object.prototype.hasOwnProperty.call(solution.bestCombos[step.combo], prop)) {
          step[prop] = solution.bestCombos[step.combo][prop];
        }
      }
    }
  }
  if (solution.bestCost == INITIAL_GOLD) {
    resetSolution(solution);
  }
  solution.bestComboCounts = countIds(solution.bestSteps);
  solution.time = new Date().getTime() - solution.startTime;
}

function calculateStats(solution) {
  let step = solution.steps[solution.lastInsert];
  let prevQuality, prevXp, prevLevel, prevCost;
  if (solution.lastInsert == 0) {
    prevQuality = solution.initialQuality;
    prevXp = levelXp[solution.initialLevel] + solution.initialXp;
    prevLevel = solution.initialLevel;
    prevCost = 0;
  } else {
    let prevStep = solution.steps[solution.lastInsert - 1];
    prevQuality = prevStep.quality;
    prevXp = prevStep.sumXp;
    prevLevel = prevStep.level;
    prevCost = prevStep.sumCost;
  }
  step.quality = prevQuality;
  if (solution.combos[step.combo].percent >= 100 && prevQuality < 10) {
    step.quality++;
  }
  step.sumXp = prevXp + solution.combos[step.combo].xp;
  step.level = getLevel(prevLevel, step.sumXp);
  step.cost = getCost(prevLevel, solution.combos[step.combo].troops.length);

  step.sumCost = prevCost + step.cost;
  step.extraXp = step.sumXp - levelXp[step.level];
  solution.quality = step.quality;
  solution.sumXp = step.sumXp;
  solution.level = step.level;
  solution.sumCost = step.sumCost;
}

function addToTotal(solution, combo) {
  for (let tc = 0; tc < TROOPS.length; tc++) {
    if (!solution.troopTotals[tc]) {
      solution.troopTotals[tc] = 0;
    }
    if (combo.counts[tc]) {
      solution.troopTotals[tc] += combo.counts[tc];
    }
  }
}

function subtractFromTotal(solution, combo) {
  for (let tc = 0; tc < TROOPS.length; tc++) {
    if (combo.counts[tc]) {
      solution.troopTotals[tc] -= combo.counts[tc];
    }
  }
}

function budgetFits(solution) {
  for (let i = 0; i < solution.budget.length; i++) {
    if (solution.troopTotals[i] > solution.budget[i]) {
      return false;
    }
  }
  return true;
}

function randomize(solution) {
  if (solution.runTests) {
    // Randomize budget and target
    for (let t = 0; t < solution.budget.length; t++) {
      solution.budget[t] = Math.floor(Math.random() * (RNG_MAX[t] - RNG_MIN[t]) + RNG_MIN[t]);
    }
    solution.initialQuality = Math.floor(Math.random() * (RNG_IN_QUALITY_MAX - RNG_IN_QUALITY_MIN) + RNG_IN_QUALITY_MIN);
    //Get rid of unrealistically low initial level values
    let iq = solution.initialQuality;
    let minLevel = Math.max(-0.35 * iq * iq + 10 * iq + 5, RNG_IN_LEVEL_MIN);
    solution.initialLevel = Math.floor(Math.random() * (RNG_IN_LEVEL_MAX - minLevel) + minLevel);
    // solution.initialLevel = Math.floor(
    //   Math.random() * (RNG_IN_LEVEL_MAX - RNG_IN_LEVEL_MIN) + RNG_IN_LEVEL_MIN
    // );
    solution.targetLevel = Math.floor(Math.random() * (RNG_TARGET_LEVEL_MAX - RNG_TARGET_LEVEL_MIN) + RNG_TARGET_LEVEL_MIN);
  }
}

function resetSolution(solution, initial) {
  if (initial || !solution.reachedQuality || !solution.reachedLevel) {
    solution.initialBudget = [...solution.budget];
    solution.startTime = new Date().getTime();
    solution.reachedQuality = solution.initialQuality >= solution.targetQuality;
    solution.reachedLevel = solution.initialLevel >= solution.targetLevel;
    solution.bestSteps = [];
    solution.bestCost = INITIAL_GOLD;
    solution.bestLevel = solution.initialLevel;
    solution.bestQuality = solution.initialQuality;
    solution.bestComboCounts = [];
    solution.final = false;
    solution.troopTotals = [0, 0, 0, 0, 0, 0];
    solution.iterations = 0;
    for (let [i, value] of solution.budget.entries()) {
      solution.budget[i] = Math.min(BUDGET_MAX[i], Number(value));
    }
  }
  solution.steps = [];
}

// Resorting
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// TODO: Can't deal with different combo lists
function resortSolution(solution) {
  if (!solution.bestSteps) return;
  console.log("Permutations: " + solution.bestSteps.length + "!");
  let permutations = permute(solution.bestSteps);
  let bestCost = INITIAL_GOLD;
  let bestPerm;
  for (permutation of permutations) {
    let permCost = calculateCost(
      permutation,
      levelXp[solution.initialLevel] + solution.initialXp,
      solution.initialLevel,
      solution.combos
    );
    if (permCost < bestCost) {
      bestCost = permCost;
      bestPerm = permutation;
    }
  }
  solution.bestSteps = bestPerm;
  solution.bestCost = bestCost;
  recalculate(solution);
}

function recalculate(solution) {
  solution.steps = solution.bestSteps;
  for (let i = 0; i < solution.bestSteps.length; i++) {
    solution.lastInsert = i;
    calculateStats(solution);
  }
  saveBestSolution(solution);
}

function calculateCost(stepArray, initialXp, initialLevel, combos) {
  let prevXp = initialXp;
  let prevLevel = initialLevel;
  let prevCost = 0;
  for (step of stepArray) {
    step.cost = getCost(prevLevel, combos[step.combo].troops.length);
    prevCost = prevCost + step.cost;
    prevXp = prevXp + combos[step.combo].xp;
    step.level = getLevel(prevLevel, prevXp);
    prevLevel = getLevel(prevLevel, prevXp);
  }
  return prevCost;
}

function permute(permutation) {
  var length = permutation.length,
    result = [permutation.slice()],
    c = new Array(length).fill(0),
    i = 1,
    k,
    p;
  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = permutation[i];
      permutation[i] = permutation[k];
      permutation[k] = p;
      ++c[i];
      i = 1;
      result.push(permutation.slice());
    } else {
      c[i] = 0;
      ++i;
    }
  }
  return result;
}

// Misc 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function countTroops(arr) {
  return arr.reduce(function(acc, curr) {
    acc[curr] ? acc[curr]++ : (acc[curr] = 1);
    return acc;
  }, {});
}

function fillXpTable() {
  for (let i = 0; i <= 1000; i++) {
    levelXp[i] = 0.5 * i + 0.5 * i * i;
  }
}

function sumXp(total, i) {
  return total + TROOPS[i].xp;
}

function sumPercent(total, i) {
  return total + TROOPS[i].percent;
}

function getLevel(level, newXp) {
  // Actually slower
  // return parseInt(-0.5 + Math.sqrt(0.25 + 2 * newXp));
  while (level < 1000) {
    level++;
    if (levelXp[level] > newXp) {
      return level - 1;
    }
  }
  return level;
}

function getCost(level, numTroops) {
  return (600 + 200 * level) * numTroops;
}

function makeCombos() {
  let id = 0;
  for (let template of TEMPLATES) {
    let combo = {};
    combo.id = id;
    combo.troops = template[0];
    combo.percent = combo.troops.reduce(sumPercent, 0);
    combo.xp = combo.troops.reduce(sumXp, 0);
    combo.counts = countTroops(combo.troops);
    for (let refinementLevel = 0; refinementLevel <= MAX_REFINEMENT_LEVEL; refinementLevel++) {
      if (template[1].includes(refinementLevel)) {
        allCombos[refinementLevel].push(combo);
      }
    }
    id++;
  }
}

function countIds(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      result[arr[i].comboId] ? result[arr[i].comboId]++ : (result[arr[i].comboId] = 1);
    }
  }
  return result;
}
