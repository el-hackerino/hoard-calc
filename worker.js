/* eslint-disable no-undef */
importScripts("common.js");

const MAX_REFINEMENT_LEVEL = 2;
const BUDGET_MAX = [200, 200, 999, 999, 999, 999];
const MAX_GOLD = 1000000000;
const MAX_DEPTH = 1000;
const UPDATE_INTERVAL = 3000;
var levelXp = [];
var allCombos = [[], [], []];
var lastUpdateTime;
const SEARCH_OPTIONS = [
  { refinementLevel: 0, toLevel: true, resort: false},
  { refinementLevel: 1, toLevel: true, resort: false},
  { refinementLevel: 2, toLevel: true, resort: false}
];
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
  resetSolution(solution);
  solution.initialBudget = [...solution.budget];

  if (solution.runTests) {
    // Randomize budget and target
    for (let t = 0; t < solution.budget.length; t++) {
      solution.budget[t] = Math.floor(
        Math.random() * (RNG_MAX[t] - RNG_MIN[t]) + RNG_MIN[t]
      );
    }
    solution.initialQuality = Math.floor(
      Math.random() * (RNG_IN_QUALITY_MAX - RNG_IN_QUALITY_MIN) + RNG_IN_QUALITY_MIN
    );
    //Get rid of unrealistically low initial level values
    let iq = solution.initialQuality;
    let minLevel = Math.max(-0.35 * iq * iq + 10 * iq + 5, RNG_IN_LEVEL_MIN);
    solution.initialLevel = Math.floor(
      Math.random() * (RNG_IN_LEVEL_MAX - minLevel) + minLevel
    );
    // solution.initialLevel = Math.floor(
    //   Math.random() * (RNG_IN_LEVEL_MAX - RNG_IN_LEVEL_MIN) + RNG_IN_LEVEL_MIN
    // );
    solution.targetLevel = Math.floor(
      Math.random() * (RNG_TARGET_LEVEL_MAX - RNG_TARGET_LEVEL_MIN) + RNG_TARGET_LEVEL_MIN
    );
  }

  if (!solution.runTests) {
    for (let refinementLevel = 0; refinementLevel <= MAX_REFINEMENT_LEVEL; refinementLevel++) {
      if (DEBUG) console.log("Starting refinement level " + refinementLevel + " with " + allCombos[SEARCH_OPTIONS[refinementLevel].refinementLevel].length + " combos");
      findSolution(solution, SEARCH_OPTIONS[refinementLevel]);
      if (DEBUG) console.log("Done with refinement level " + refinementLevel + ", best solution so far:");
      if (DEBUG) console.log(solution);
      postMessage(solution);
    }
  } else {
    findSolution(solution, SEARCH_OPTIONS[0]);
    if (solution.runSecondarySearch) {
      let secondarySolution = Object.assign({}, solution);
      resetSolution(secondarySolution);
      findSolution(secondarySolution, SEARCH_OPTIONS[1]);
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

function resetSolution(solution) {
  solution.startTime = new Date().getTime();
  solution.reachedQuality = false;
  solution.reachedLevel = false;
  solution.steps = [];
  solution.bestSteps = [];
  solution.bestCost = MAX_GOLD;
  solution.bestGoldCost = MAX_GOLD;
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

function findSolution(solution, options) {
  lastUpdateTime = solution.startTime;
  solution.combos = allCombos[options.refinementLevel];
  search(0, 0, solution, options);
  prepSolution(options, solution);
}

function prepSolution(options, solution) {
  if (options.resort) resortSolution(solution, solution.combos);
  // Copy combo attributes to step for simpler rendering
  for (let step of solution.bestSteps) {
    for (var prop in solution.bestCombos[step.combo]) {
      if (Object.prototype.hasOwnProperty.call(solution.bestCombos[step.combo], prop)) {
        step[prop] = solution.bestCombos[step.combo][prop];
      }
    }
  }
  if (solution.bestCost == MAX_GOLD) {
    resetSolution(solution);
  }
  solution.bestComboCounts = countIds(solution.bestSteps);
  solution.lowFidelity = options.quick;
  solution.time = new Date().getTime() - solution.startTime;
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
      if (solution.sumLevel >= solution.targetLevel) {
        reachedLevel = true;
        if (!solution.reachedLevel) {
          if (DEBUG) console.log("Reached target level!");
          solution.reachedLevel = true;
          saveBestSolution(solution);
        }
      }
      // Improved quality but didn't reach goal
      if (solution.quality > solution.bestQuality && solution.quality <= solution.targetQuality) {
        if (DEBUG) console.log("New quality: " + solution.quality);
        saveBestSolution(solution);
        // Improved cost, same or higher quality, no goal change
      } else if (solution.sumCost < solution.bestCost && solution.quality >= solution.bestQuality
        && reachedQuality == solution.reachedQuality && reachedLevel == solution.reachedLevel) {
        if (DEBUG) console.log("New best cost at same goal status: " + solution.sumCost + "(" + solution.sumGoldCost + ")");
        saveBestSolution(solution);
      }
      if (!reachedQuality || (options.toLevel && !reachedLevel && depth < MAX_DEPTH)) {
        search(comboNumber, depth + 1, solution, options);
      }
    }
  }
  subtractFromTotal(solution, solution.combos[solution.steps[depth].combo]);
  solution.steps.pop();
}

function saveBestSolution(solution) {
  solution.bestQuality = solution.quality;
  solution.bestLevel = solution.sumLevel;
  solution.bestCost = solution.sumCost;
  solution.bestGoldCost = solution.sumGoldCost;
  solution.bestSteps = JSON.parse(JSON.stringify(solution.steps));
  solution.bestCombos = solution.combos;
  solution.troopCounts = [...solution.troopTotals];
}

function calculateStats(solution) {
  let step = solution.steps[solution.lastInsert];
  let prevQuality, prevXp, prevLevel, prevCost, prevGoldCost;
  if (solution.lastInsert == 0) {
    prevQuality = solution.initialQuality;
    prevXp = levelXp[solution.initialLevel] + solution.initialXp;
    prevLevel = solution.initialLevel;
    prevCost = 0;
    prevGoldCost = 0;
  } else {
    let prevStep = solution.steps[solution.lastInsert - 1];
    prevQuality = prevStep.quality;
    prevXp = prevStep.sumXp;
    prevLevel = prevStep.level;
    prevCost = prevStep.sumCost;
    prevGoldCost = prevStep.sumGoldCost;
  }
  step.quality = prevQuality;
  if (solution.combos[step.combo].percent >= 100 && prevQuality < 10) {
    step.quality++;
  }
  step.sumXp = prevXp + solution.combos[step.combo].xp;
  step.level = getLevel(prevLevel, step.sumXp);
  step.cost = getCost(prevLevel, solution.combos[step.combo].troops.length);

  step.troopCost = getTroopCost(solution.combos[step.combo].troops) * solution.troopCostFactor;
  step.sumCost = prevCost + step.cost + step.troopCost;
  step.sumGoldCost = prevGoldCost + step.cost;
  step.extraXp = step.sumXp - levelXp[step.level];
  solution.quality = step.quality;
  solution.sumXp = step.sumXp;
  solution.sumLevel = step.level;
  solution.sumCost = step.sumCost;
  solution.sumGoldCost = step.sumGoldCost;
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

// Resorting
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function resortSolution(solution) {
  let permutations = permute(solution.bestSteps);
  let bestCost = MAX_GOLD;
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
  solution.bestGoldCost = bestCost;
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
  for (let i = 0; i < 1000; i++) {
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

function getTroopCost(troopArray) {
  return troopArray.reduce(function(total, troop) {
    return total + TROOPS[troop].value;
  }, 0);
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
      if (template[1] <= refinementLevel) {
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
