const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500 }
];
const TEMPLATES = [
  [2, 2, 2, 2, 2], // 100, 0
  [3, 2, 2, 2, 2], // 105, 1
  [3, 3, 2, 2, 1], // 100, 2
  [3, 3, 3, 2, 1], // 105, 3
  [3, 3, 3, 2, 2], // 115, 4
  [3, 3, 3, 3],   // 100, 5
  [4, 2, 2, 2, 1], // 100, 6
  [4, 3, 2, 2, 1], // 105, 7
  [4, 3, 3, 1, 1], // 100, 8
  [4, 3, 3, 2],   // 100, 9
  [4, 3, 3, 3],   // 105, 10
  [4, 4, 2, 1, 1], // 100, 11
  [4, 4, 2, 2],   // 100, 12
  [5, 2, 1, 1, 1], // 100, 13
  [5, 2, 2, 1],   // 100, 14
  [4, 4, 3, 1, 1], // 105, 15
  [4, 4, 3, 2],   // 105, 16
  [5, 3, 1, 1, 1], // 105, 17
  [4, 4, 3, 3],   // 110, 18
  [5, 3, 3],     // 100, 19
  [4, 4, 4, 1],   // 100, 20
  [5, 4, 1, 1],   // 100, 21
  [4, 4, 4, 2],   // 110, 22
  [5, 4, 2],     // 100, 23
  [4, 4, 4, 3],   // 115, 24
  [5, 4, 3],     // 105, 25
  [4, 4, 4, 4],   // 120, 26
  [5, 4, 4],     // 110, 27
  [5, 5],       // 100, 28
];
//const TEMPLATES_USELESS = [3, 8, 11, 19, 22, 23];
const TEMPLATES_QUICK = [0, 1, 3, 4, 5, 9, 10, 12, 14, 19, 20, 23, 25, 26, 27, 28];

const USE_QUICK_TEMPLATES = false;
const RNG_MIN = 0;
const RNG_MAX = [0, 4, 22, 22, 15, 15];
const RNG_LEVEL_MIN = 0;
const RNG_LEVEL_MAX = 40;
const RNG_QUALITY_MIN = 1;
const RNG_QUALITY_MAX = 5;
var levelXp = [];
var combos = [];
var quickCombos = [];

onmessage = function (e) {
  fillXpTable();
  makeCombos();
  //console.log('Worker: Message received from main script:');
  //console.log(e.data);
  for (let i = 0; i < e.data.iterations; i++) {
    let result = runTestIteration(e.data.settings);
    //console.log('Worker: Posting message back to main script');
    postMessage(result);
  }
}

function resetSolution(solution) {
  solution.steps = [];
  solution.bestSteps = [];
  solution.bestCost = 1000000;
  solution.troopTotals = [0, 0, 0, 0, 0, 0];
  solution.iterations = 0;
}

function runTestIteration(settings) {
  let solution = {
    initialLevel: settings.initialLevel,
    initialQuality: settings.initialQuality,
    initialXp : settings.initialXp,
    goalLevel: settings.goalLevel,
    goalQuality: settings.goalQuality,
    budget: settings.budget,
  };
  resetSolution(solution);
  
  if (settings.randomize) {
    for (let t = 0; t < settings.budget.length; t++) {
      solution.budget[t] = Math.floor((Math.random() * (RNG_MAX[t] - RNG_MIN)) + RNG_MIN);
    }
    solution.initialLevel = Math.floor((Math.random() * (RNG_LEVEL_MAX - RNG_LEVEL_MIN)) + RNG_LEVEL_MIN);
    solution.initialQuality = Math.floor((Math.random() * (RNG_QUALITY_MAX - RNG_QUALITY_MIN)) + RNG_QUALITY_MIN);
  }

  findSolution(solution, USE_QUICK_TEMPLATES);
  
  // Find slow combos
  solution.slow = "";
  for (let combo of solution.bestSteps) {
    if (!combo.quick) {
      solution.slow += combo.id + ", ";
    }
  }
  if (solution.slow) {
    let solutionQuick = Object.assign({}, solution);
    resetSolution(solutionQuick);
    findSolution(solutionQuick, true);
    solution.slow = (solutionQuick.bestCost - solution.bestCost) + " G in " + ((solution.time - solutionQuick.time) / 1000) + " s";
  }

  solution.comboCounts = countIds(solution.bestSteps);

  // Count used troops
  solution.troopCounts = [];
  for (let combo of solution.bestSteps) {
    for (let t = 0; t < TROOPS.length; t++) {
      if (combo.counts[t]) {
        solution.troopCounts[t] = solution.troopCounts[t] ? solution.troopCounts[t] + combo.counts[t] : combo.counts[t];
      }
    }
  }
  return solution;
}

function findSolution(solution, quick) {
  let solTime = new Date().getTime();
  solution.xpBudget = solution.budget.reduce(function (accumulator, currentValue, currentIndex, array) {
    return accumulator + currentValue * TROOPS[currentIndex].xp
  });
  if (solution.initialLevel === 0 && solution.initialQuality === 1 && solution.initialXp === 0 && solution.xpBudget < 4300) {
    console.log("Skipping, XP budget: " + solution.xpBudget);
    return solution; // Skip hopeless budgets
  }
  let comboArr = quick ? quickCombos : combos;
  search(0, 0, solution, comboArr);
  solution.time = new Date().getTime() - solTime;
}


function search(startCombo, depth, solution, combos) {
  for (let c = startCombo; c < combos.length; c++) {
    //if (iterations > 1000 && iterations < 1100) console.log(JSON.parse(JSON.stringify(solution)));
    solution.iterations++;
    if (solution.steps[depth]) {
      subtractFromTotal(solution, solution.steps[depth]);
    }
    solution.steps[depth] = Object.assign({}, combos[c]);
    addToTotal(solution, combos[c]);
    calculateStats(solution);
    if (depth === solution.goalQuality - solution.initialQuality - 1) {
      if (solution.sumCost < solution.bestCost && solution.sumLevel >= solution.goalLevel && budgetFits(solution)) {
        solution.bestCost = solution.sumCost;
        solution.bestSteps = JSON.parse(JSON.stringify(solution.steps));
      }
    } else if (solution.sumCost < solution.bestCost && budgetFits(solution)) {
      search(c, depth + 1, solution, combos);
    }
  }
  subtractFromTotal(solution, solution.steps[depth]);
  solution.steps.pop();
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

function calculateStats(solution) {
  solution.quality = solution.initialQuality;
  solution.sumLevel = solution.initialLevel;
  solution.sumXp = levelXp[solution.initialLevel] + solution.initialXp;
  solution.sumCost = 0;
  for (let combo of solution.steps) {
    solution.quality++;
    combo.quality = solution.quality;
    combo.cost = getCost(solution.sumLevel, combo.troops.length);
    combo.level = getLevel(solution.sumLevel, solution.sumXp, combo.xp);
    combo.sumXp = solution.sumXp + combo.xp;
    combo.extraXp = combo.sumXp - levelXp[combo.level];
    solution.sumLevel = combo.level;
    solution.sumXp += combo.xp;
    solution.sumCost += combo.cost;
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

function getLevel(oldLevel, oldXp, xp) {
  let newXp = oldXp + xp;
  let level = oldLevel;
  let found = false;
  let counter = 1;
  while (!found && counter < 100) {
    level++;
    let nextLevelXp = levelXp[level];
    if (nextLevelXp > newXp) {
      level--;
      found = true;
    }
    counter++;
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
    combo.troops = template;
    combo.percent = combo.troops.reduce(sumPercent, 0);
    combo.xp = combo.troops.reduce(sumXp, 0);
    combo.counts = countTroops(combo.troops);
    if (TEMPLATES_QUICK.includes(combo.id)) {
      combo.quick = true;
      quickCombos.push(combo);
    }
    combos.push(combo);
    id++;
  }
}

function countIds(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      result[arr[i].id] ? result[arr[i].id]++ : result[arr[i].id] = 1;
    }
  }
  return result;
}
