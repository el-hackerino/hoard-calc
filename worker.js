/* eslint-disable no-undef */
importScripts("constants.js");

const DEBUG = 0;
const BUDGET_MAX = [10, 10, 105, 80, 50, 18];
const RNG_MIN = [10, 10, 20, 4, 2, 0];
const RNG_MAX = [10, 10, 60, 40, 12, 8];
const RNG_LEVEL_MIN = 30;
const RNG_LEVEL_MAX = 100;
const RNG_QUALITY_MIN = 3;
const RNG_QUALITY_MAX = 7;
const MAX_GOLD = 10000000;
const MAX_DEPTH = 21;
var levelXp = [];
var allCombos = [];
var quickCombos = [];
const QUICK_SEARCH_OPTIONS = {quick: true, toLevel: true, resort: false};
const SLOW_SEARCH_OPTIONS = {quick: false, toLevel: true, resort: false};

fillXpTable();
makeCombos();

onmessage = function (message) {
  for (let i = 0; i < (message.data.run_tests ? message.data.num_tests : 1); i++) {
    let result = runTestIteration(message.data);
    postMessage(result);
  }
};

function resetSolution(solution) {
  solution.reachedQuality = false;
  solution.reachedLevel = false;
  solution.steps = [];
  solution.bestSteps = [];
  solution.bestCost = MAX_GOLD;
  solution.bestLevel = solution.initialLevel;
  solution.bestQuality = solution.initialQuality;
  solution.troopTotals = [0, 0, 0, 0, 0, 0];
  solution.iterations = 0;
  for (let [i, value] of solution.budget.entries()) {
    solution.budget[i] = Math.min(BUDGET_MAX[i], Number(value));
  }
}

function runTestIteration(solution) {
  resetSolution(solution);

  // Randomize values
  if (solution.run_tests) {
    for (let t = 0; t < solution.budget.length; t++) {
      solution.budget[t] = Math.floor((Math.random() * (RNG_MAX[t] - RNG_MIN[t])) + RNG_MIN[t]);
    }
    solution.initialQuality = Math.floor((Math.random() * (RNG_QUALITY_MAX - RNG_QUALITY_MIN)) + RNG_QUALITY_MIN);
    // Get rid of unrealistically low initial level values
    let iq = solution.initialQuality;
    let minLevel = Math.max(-.35 * iq * iq + 10 * iq + 5, RNG_LEVEL_MIN);
    solution.initialLevel = Math.floor((Math.random() * (RNG_LEVEL_MAX - minLevel)) + minLevel);
  }

  findSolution(solution, solution.run_tests ? QUICK_SEARCH_OPTIONS : (solution.quickSearch ? QUICK_SEARCH_OPTIONS : SLOW_SEARCH_OPTIONS));

  if (!solution.run_tests) {
    return solution;
  }

  let slowSolution = Object.assign({}, solution);
  resetSolution(slowSolution);
  findSolution(slowSolution, SLOW_SEARCH_OPTIONS); // TODO toLevel is simply too expensive with the full combo list, maybe offer it as an option with quick list
  solution.slowSolution = slowSolution;
  solution.slowTime = slowSolution.time;
  if (solution.bestQuality >= slowSolution.bestQuality && solution.bestLevel >= slowSolution.bestLevel) {
    solution.quickCostDiff = solution.bestCost - slowSolution.bestCost;
  } else {
    solution.quickCostDiff = solution.bestQuality + "->" + slowSolution.bestQuality +
      ", " + solution.bestLevel + "->" + slowSolution.bestLevel +
      ", " + solution.bestCost + "->" + slowSolution.bestCost;
  }

  return solution;
}

function findSolution(solution, options) {
  let startTime = new Date().getTime();
  let combos = options.quick ? quickCombos : allCombos;
  search(0, 0, solution, combos, options);
  if (options.resort) resortSolution(solution, combos);
  // Copy combo attributes to step for simpler rendering
  for (let step of solution.bestSteps) {
    for (var prop in combos[step.combo]) {
      if (Object.prototype.hasOwnProperty.call(combos[step.combo], prop)) {
        step[prop] = combos[step.combo][prop];
      }
    }
  }
  setTroopCounts(solution);
  if (solution.bestCost == MAX_GOLD) {
    resetSolution(solution);
  }
  solution.comboCounts = countIds(solution.bestSteps);
  solution.time = (new Date().getTime() - startTime);
}

function search(startCombo, depth, solution, combos, options) {
  for (let c = startCombo; c < combos.length; c++) {
    var reachedQuality = false;
    var reachedLevel = false;
    solution.iterations++;
    if (solution.steps[depth]) {
      subtractFromTotal(solution, combos[solution.steps[depth].combo]);
    }
    solution.steps[depth] = {
      combo: c,
      comboId: combos[c].id
    };
    solution.lastInsert = depth;
    addToTotal(solution, combos[c]);
    if (budgetFits(solution)) {
      calculateStats(solution, combos);
      if (solution.quality >= solution.goalQuality) {
        reachedQuality = true;
        if (!solution.reachedQuality) {
          if (DEBUG) console.log("Reached target quality!");
          solution.reachedQuality = true;
          saveBestSolution(solution);
        }
      }
      if (solution.sumLevel >= solution.goalLevel) {
        reachedLevel = true;
        if (!solution.reachedLevel) {
          if (DEBUG) console.log("Reached target level!");
          solution.reachedLevel = true;
          saveBestSolution(solution);
        }
      }
      // Improved quality but didn't reach goal
      if (solution.quality > solution.bestQuality && solution.quality <= solution.goalQuality) {
        if (DEBUG) console.log("New quality: " + solution.quality);
        saveBestSolution(solution);
      // Improved cost, same or higher quality, no goal change
      } else if ((solution.sumCost < solution.bestCost && solution.quality >= solution.bestQuality) &&
        reachedQuality == solution.reachedQuality && reachedLevel == solution.reachedLevel) {
        if (DEBUG) console.log("New best cost at same goal status: " + solution.sumCost);
        saveBestSolution(solution);
      }
      if (!reachedQuality || options.toLevel && !reachedLevel && depth < MAX_DEPTH) {
        search(c, depth + 1, solution, combos, options);
      }
    }
  }
  subtractFromTotal(solution, combos[solution.steps[depth].combo]);
  solution.steps.pop();
}

function saveBestSolution(solution) {
  solution.bestQuality = solution.quality;
  solution.bestLevel = solution.sumLevel;
  solution.bestCost = solution.sumCost;
  solution.bestGoldCost = solution.sumGoldCost;
  solution.bestSteps = JSON.parse(JSON.stringify(solution.steps));
  //console.log(solution);
}

function calculateStats(solution, combos) {
  let step = solution.steps[solution.lastInsert];
  solution.quality = solution.initialQuality + solution.lastInsert + 1;
  if (solution.quality > 10) solution.quality = 10;
  step.quality = solution.quality;
  let prevXp, prevLevel, prevCost, prevGoldCost;
  if (solution.lastInsert == 0) {
    prevXp = levelXp[solution.initialLevel] + solution.initialXp;
    prevLevel = solution.initialLevel;
    prevCost = 0;
    prevGoldCost = 0;
  } else {
    let prevStep = solution.steps[solution.lastInsert - 1];
    prevXp = prevStep.sumXp;
    prevLevel = prevStep.level;
    prevCost = prevStep.sumCost;
    prevGoldCost = prevStep.sumGoldCost;
  }
  step.sumXp = prevXp + combos[step.combo].xp;
  step.level = getLevel(prevLevel, step.sumXp);
  step.cost = getCost(prevLevel, combos[step.combo].troops.length);
  step.troopCost = getTroopCost(combos[step.combo].troops) * solution.troopCostFactor;
  step.sumCost = prevCost + step.cost + step.troopCost;
  step.sumGoldCost = prevGoldCost + step.cost;
  step.extraXp = step.sumXp - levelXp[step.level];
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

function setTroopCounts(solution) {
  solution.troopCounts = [];
  for (let step of solution.bestSteps) {
    for (let t = 0; t < TROOPS.length; t++) {
      if (allCombos[step.comboId].counts[t]) {
        solution.troopCounts[t] = solution.troopCounts[t] ? solution.troopCounts[t] + allCombos[step.comboId].counts[t] : allCombos[step.comboId].counts[t];
      }
    }
  }
}

function resortSolution(solution, combos) {
  let permutations = permute(solution.bestSteps);
  let bestCost = MAX_GOLD;
  let bestPerm;
  for (permutation of permutations) {
    let permCost = calculateCost(permutation, levelXp[solution.initialLevel] + solution.initialXp, solution.initialLevel, combos);
    if (permCost < bestCost) {
      bestCost = permCost;
      bestPerm = permutation;
    }
  }
  solution.bestSteps = bestPerm;
  solution.bestGoldCost = bestCost;
  recalculate(solution, combos);
}

function recalculate(solution, combos) {
  solution.steps = solution.bestSteps;
  for (let i = 0; i < solution.bestSteps.length; i++) {
    solution.lastInsert = i;
    calculateStats(solution, combos);
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
    k, p;
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

/////////////////////////////////////////////////////////////////////////

function countTroops(arr) {
  return arr.reduce(function (acc, curr) {
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
  return troopArray.reduce(function (total, troop) {
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
    if (template[1]) {
      quickCombos.push(combo);
    }
    allCombos.push(combo);
    id++;
  }
}

function countIds(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      result[arr[i].comboId] ? result[arr[i].comboId]++ : result[arr[i].comboId] = 1;
    }
  }
  return result;
}