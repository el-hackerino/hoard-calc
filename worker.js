/* eslint-disable no-undef */
importScripts("common.js");

const BUDGET_MAX = [0, 10, 35, 45, 40, 18];
const BUDGET_ADJUSTMENT = [0, 6, 17, 25, 6, 3];
const INITIAL_GOLD = 1000000000;
const MAX_DEPTH = 9;
// const SEND_INTERMEDIATE_UPDATES = 0; // Doesn't make sense as long as the intermediate solutions may be worse than a previous one
// const UPDATE_INTERVAL = 1000;
// var lastUpdateTime;
const TIME_LIMIT = 5000;
const TIME_LIMIT_2 = 10000;
var levelXp = [];
var allCombos = [];
var savedSolution;
const SEARCH_OPTIONS = {maxLevel: 1, resort: 0};
const RNG_MIN = [0, 0, 0, 0, 0, 0];
const RNG_MAX = [0, 100, 200, 200, 100, 30];
const RNG_IN_LEVEL_MIN = 1;
const RNG_IN_LEVEL_MAX = 60;
const RNG_TARGET_LEVEL_MIN = 100;
const RNG_TARGET_LEVEL_MAX = 200;
const RNG_IN_QUALITY_MIN = 1;
const RNG_IN_QUALITY_MAX = 5;

fillXpTable();
makeCombos();

onmessage = function(message) {
  if (DEBUG) console.log("Worker received request:");
  if (DEBUG) console.log(message.data);
  for (let i = 0; i < (message.data.runTests ? message.data.numTests : 1); i++) {
    runTestIteration(message.data, i);
  }
};

function runTestIteration(solution, i) {
  if (DEBUG) console.log("Running iteration " + i + "...");
  solution.id = i;
  randomize(solution);
  resetSolution(solution);
  // Step 1 -----------------------------------------------------------------------------
  startMethod(solution, 1);
  stringModeSearch(solution);
  finalizeMethod(solution);
  savedSolution = JSON.parse(JSON.stringify(solution));
  // Step 2 -----------------------------------------------------------------------------
  startMethod(solution, 2);
  // *** Reset: budget, bestCost, troopTotals, steps
  solution.steps = [];
  solution.troopTotals = [0, 0, 0, 0, 0, 0];
  if (solution.reachedLevel && solution.bestSteps.length < 12) {
    // We can't apply this method if !reachedLevel because it goes for quality first
    // And it is too slow at length > 11
    solution.bestCost = INITIAL_GOLD;
    solution.budget = [...solution.troopCounts];
    for (let [i, value] of solution.budget.entries()) {
      solution.budget[i] = Math.min(solution.initialBudget[i], Number(value) + 5); // Allow up to N additional troops of each type
    }
    // Special case: excess STs
    if (!solution.reachedQuality && solution.initialBudget[5] >= 18 && solution.budget[5] < 18) {
      solution.budget[5] = 18;
    }
    solution.preadjustedBudget = [...solution.budget];
    makeCombosFromDraft(solution);
    bruteForceSearch(solution, SEARCH_OPTIONS, solution.bestSteps.length + (solution.targetQuality - solution.bestQuality), TIME_LIMIT);
  } else {
    if (DEBUG) console.log("SKIPPING method 2, conditions not met");
    solution.final = "skipped";
  }
  finalizeMethod(solution);
  savedSolution = JSON.parse(JSON.stringify(compareSolutions(savedSolution, solution)));
  // TODO If solution got worse, keep old solution!! (does this still happen?)
  // Step 3 -----------------------------------------------------------------------------
  startMethod(solution, 3);
  if (solution.bestSteps.length <= MAX_DEPTH) {
    // *** Reset: budget, reachedLevel, bestLevel, steps
    // Optimization: use previous result as an approximation of the required budget
    for (let i = 0; i < solution.budget.length; i++) {
      solution.budget[i] = Math.min(solution.preadjustedBudget[i] + BUDGET_ADJUSTMENT[i], solution.initialBudget[i], BUDGET_MAX[i]);
    }
    solution.reachedLevel = solution.initialLevel >= solution.targetLevel;
    solution.bestLevel = solution.initialLevel;
    solution.steps = [];
    solution.combos = allCombos;
    bruteForceSearch(solution, SEARCH_OPTIONS, MAX_DEPTH, TIME_LIMIT_2);
  } else {
    if (DEBUG) console.log("SKIPPING method 3, conditions not met");
    solution.final = "skipped";
  }
  savedSolution = compareSolutions(savedSolution, solution);
  solution.bestMethod = savedSolution.method;
  finalizeMethod(solution);
  // ------------------------------------------------------------------------------------
  // Production mode: Only return the best solution
  if (!solution.runTests && !DEBUG_SINGLE_SOLUTION) postMessage(savedSolution);
}

function startMethod(solution, method) {
  if (DEBUG) console.log("Running method " + method);
  solution.final = 0;
  solution.method = method;
}

function finalizeMethod(solution) {
  if (!solution.final)
    solution.final = "complete";
  if (DEBUG) {
    console.log("Done with method " + solution.method + ", result:");
    console.log(solution);
  }
  if (solution.runTests || DEBUG_SINGLE_SOLUTION) postMessage(solution);
}

function compareSolutions(solution1, solution2) {
  if (solution1.bestQuality == solution2.bestQuality) {
    if (!solution1.reachedLevel) {
      if (solution2.bestLevel > solution1.bestLevel) {
        return solution2; // s2 has improved level, reached goal or not is irrelevant
      } else if (solution2.bestLevel == solution1.bestLevel) {
        // Both at same level short of target, go for cheaper one
        return (solution1.bestCost - solution2.bestCost) <= 0 ? solution1 : solution2;
      } else {
        return solution1; // s2 has lower level
      }
    } else if (solution2.reachedLevel) {
      // Both reached target level, go for cheaper one
      return (solution1.bestCost - solution2.bestCost) <= 0 ? solution1 : solution2;
    } else {
      return solution1; // s2 has lower level
    }
  } else if (solution2.bestQuality >= solution1.bestQuality) {
    return solution2; // s2 has improved quality
  } else {
    return solution1; // s2 has lower quality
  }
}

function makeCombosFromDraft(solution) {
  let id = 0;
  solution.combos = [];
  let lastTroopBatch = 0;
  if (solution.bestSteps.length == 1) {
    let combo = makeCombo(solution.bestSteps[0].troops, id);
    if (DEBUG) console.log("adding only combo: " + combo.troops);
    solution.combos.push(combo);
    return;
  }
  for (let step of solution.bestSteps) {
    exactComboAdded = false;
    if (step.troops[0] > lastTroopBatch) {
      while (lastTroopBatch < step.troops[0] - 1) {
        ({ lastTroopBatch, id } = addBatchCombos(lastTroopBatch, id, solution));
      } 
      if (arrayIsDiverse(step.troops)) {
        let combo = makeCombo(step.troops, id);
        if (DEBUG) console.log("adding combo: " + combo.troops);
        solution.combos.push(combo);
      }
    }
  }
  addBatchCombos(lastTroopBatch, id, solution);
}

function addBatchCombos(lastTroopBatch, id, solution) {
  lastTroopBatch++;
  let amount = 5;
  do {
    let combo = makeCombo(new Array(amount).fill(lastTroopBatch), id);
    if (DEBUG) console.log("adding batch combo: " + combo.troops);
    solution.combos.push(combo);
    id++;
    amount--;
  } while (amount > (6 - lastTroopBatch) || lastTroopBatch > 2 && amount > (4 - lastTroopBatch) && amount > 0);
  return { lastTroopBatch, id };
}

function arrayIsDiverse(array) {
  let set = new Set(array);
  return set.size > 1;
}

function makeCombo(troops, id) {
  let combo = {};
  combo.id = id;
  combo.troops = troops;
  combo.percent = combo.troops.reduce(sumPercent, 0);
  combo.xp = combo.troops.reduce(sumXp, 0);
  combo.counts = countTroops(combo.troops);
  return combo;
}

function stringModeSearch(solution) {
  let targetXp = levelXp[solution.targetLevel] - levelXp[solution.initialLevel];
  //let availableXp = solution.budget.slice(1).reduce(( acc, cur, i ) => (acc + TROOPS[i + 1].xp * cur), 0);

  // Create a "string" of troops to use
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
  
  // Create the individual steps from the string
  let step = {troops: []};
  while(troopsToUse.length) {
    step.troops.unshift(troopsToUse.pop());
    solution.troopTotals[step.troops[0]] ++;
    if (step.troops.length == 5) {
      // if (DEBUG) console.log(step.troops);
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
  solution.reachedLevel = solution.bestLevel >= solution.targetLevel;
  solution.reachedQuality = solution.bestQuality >= solution.targetQuality;
  prepSolution(undefined, solution);
}

function bruteForceSearch(solution, options, maxDepth, timeLimit) {
  lastUpdateTime = solution.startTime;
  search(0, 0, solution, options, maxDepth, timeLimit);
  if (solution.bestCombos) prepSolution(SEARCH_OPTIONS, solution);
}

function search(startCombo, depth, solution, options, maxDepth, timeLimit) {
  // console.log("Search: " + startCombo + ", " + depth);
  if (solution.final) {
    if (DEBUG) console.log("Returning after timeout");
    return;
  }
  // if (new Date().getTime() - lastUpdateTime > UPDATE_INTERVAL) {
  //   lastUpdateTime = new Date().getTime();
  //   if (lastUpdateTime - solution.startTime > timeLimit) {
  //     solution.final = "timeout";
  //     if (DEBUG) console.log("Timeout!");
  //     return;
  //   } else if (SEND_INTERMEDIATE_UPDATES) {
  //     prepSolution(options, solution);
  //     postMessage(solution);
  //   }
  // }

  for (let comboNumber = startCombo; comboNumber < solution.combos.length; comboNumber++) {
    if (solution.final) {
      console.log("Returning after timeout");
      return;
    }
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
      // console.log("budget fits");
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
          if (DEBUG) console.log("Reached target level! Cost: " + solution.sumCost);
          solution.reachedLevel = true;
          saveBestSolution(solution);
        }
      }
      if (solution.quality > solution.bestQuality && solution.quality <= solution.targetQuality) {
        // Improved quality but didn't reach goal
        if (DEBUG) console.log("New quality: " + solution.quality);
        saveBestSolution(solution);
      } else if (options.maxLevel && solution.quality >= solution.bestQuality && !reachedLevel && solution.level > solution.bestLevel) {
        if (DEBUG) console.log("New Level: " + solution.level);
        saveBestSolution(solution);
      } else if (solution.sumCost < solution.bestCost
        && ((!reachedQuality && solution.quality >= solution.bestQuality) || reachedQuality)
        && (!options.maxLevel || (!reachedLevel && solution.level >= solution.bestLevel) || reachedLevel)
        // Improved cost, same or higher quality, no goal change
        && reachedQuality == solution.reachedQuality && reachedLevel == solution.reachedLevel) {
        if (DEBUG) console.log("New best cost at same goal status: " + solution.sumCost + ", level: " + solution.level);
        saveBestSolution(solution);

      }
      if ((!reachedQuality || !reachedLevel) && depth < maxDepth - 1) {
        search(comboNumber, depth + 1, solution, options, maxDepth, timeLimit);
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
  solution.bestMethod = solution.method;
}

function prepSolution(options, solution) {
  if (solution.bestMethod == 2 || solution.bestMethod == 3) {
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

  if (!solution.bestSteps) {
    console.log("No solution found so far");
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
    if (!prevStep) {
      console.log(solution);
      console.log(solution.lastInsert);
    }
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
    for (let t = 0; t < solution.initialBudget.length; t++) {
      solution.initialBudget[t] = Math.floor(Math.random() * (RNG_MAX[t] - RNG_MIN[t]) + RNG_MIN[t]);
    }
    solution.initialQuality = Math.floor(Math.random() * (RNG_IN_QUALITY_MAX - RNG_IN_QUALITY_MIN) + RNG_IN_QUALITY_MIN);
    //Get rid of unrealistically low initial level values
    let iq = solution.initialQuality - 1;
    let minLevel = Math.max(-0.35 * iq * iq + 10 * iq + 5, RNG_IN_LEVEL_MIN);
    solution.initialLevel = Math.floor(Math.random() * (RNG_IN_LEVEL_MAX - minLevel) + minLevel);
    // solution.initialLevel = Math.floor(
    //   Math.random() * (RNG_IN_LEVEL_MAX - RNG_IN_LEVEL_MIN) + RNG_IN_LEVEL_MIN
    // );
    solution.targetLevel = Math.floor(Math.random() * (RNG_TARGET_LEVEL_MAX - RNG_TARGET_LEVEL_MIN) + RNG_TARGET_LEVEL_MIN);
  }
}

function resetSolution(solution) {
  solution.targetQuality = TARGET_QUALITY;
  solution.budget = [...solution.initialBudget];
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
    allCombos.push(combo);
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
