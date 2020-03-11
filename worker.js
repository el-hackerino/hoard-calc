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
const TEMPLATES_QUICK = [0, 3, 4, 5, 9, 10, 12, 18, 19, 20, 23, 24, 26, 27, 28];

const RNG_MIN = 0;
//const RNG_MAX = [0, 5, 26, 22, 18, 18];
const RNG_MAX = [0, 10, 36, 28, 20, 18]; // at least 9,36,28,20,18
const RNG_LEVEL_MIN = 0;
const RNG_LEVEL_MAX = 90;
const RNG_QUALITY_MIN = 1;
const RNG_QUALITY_MAX = 9;
var levelXp = [];
var allCombos = [];
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
  solution.bestLevel = solution.initialLevel;
  solution.bestQuality = solution.initialQuality;
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

  findSolution(solution, 0);
  
  let solutionQuick = Object.assign({}, solution);
  resetSolution(solutionQuick);
  findSolution(solutionQuick, 1);
  solution.quickTime = solutionQuick.time;
  solution.quickCostDiff = solutionQuick.bestCost - solution.bestCost;

  solution.comboCounts = countIds(solution.bestSteps);

  // Count used troops
  let combos = allCombos;
  solution.troopCounts = [];
  for (let step of solution.bestSteps) {
    for (let t = 0; t < TROOPS.length; t++) {
      if (combos[step.combo].counts[t]) {
        solution.troopCounts[t] = solution.troopCounts[t] ? solution.troopCounts[t] + combos[step.combo].counts[t] : combos[step.combo].counts[t];
      }
    }
  }

  // Convert steps to old form as expected by the render methods
  for (let step of solution.bestSteps) {
    for (var prop in combos[step.combo]) {
      if (Object.prototype.hasOwnProperty.call(combos[step.combo], prop)) {
          step[prop] = combos[step.combo][prop];
      }
    }
  }
  return solution;
}

function findSolution(solution, quick) {
  let solTime = new Date().getTime();
  search(0, 0, solution, quick ? quickCombos : allCombos);
  solution.time = (new Date().getTime() - solTime);
}

function search(startCombo, depth, solution, combos) {
  for (let c = startCombo; c < combos.length; c++) {
    solution.iterations++;
    if (solution.iterations % 100000 == 0) {
    }
    if (solution.steps[depth]) {
      subtractFromTotal(solution, combos[solution.steps[depth].combo]);
      if (solution.iterations % 100000 == 0) {
      }
    }
    solution.steps[depth] = {combo: c};
    solution.lastInsert = depth;
    addToTotal(solution, combos[c]);
    if (solution.iterations % 100000 == 0) {
    }
    if (budgetFits(solution)) {
      calculateStats(solution, combos);
      if (solution.quality > solution.bestQuality) {
        //console.log("New best quality: " + solution.quality);
        saveBestSolution(solution);
      } else if (solution.quality == solution.bestQuality) {
        if (solution.sumLevel > solution.bestLevel && solution.bestLevel < solution.goalLevel) {
          //console.log("New best level: " + solution.sumLevel);
          saveBestSolution(solution);
        } else if (solution.sumLevel >= solution.goalLevel) {
          if (solution.sumCost < solution.bestCost) {
            //console.log("New best cost: " + solution.bestCost);
            saveBestSolution(solution);
          }
        }
      }
      if (solution.quality < solution.goalQuality) {
        search(c, depth + 1, solution, combos);
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
  solution.bestSteps = JSON.parse(JSON.stringify(solution.steps));
  //console.log(solution);
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

function calculateStats(solution, combos) {
  let step = solution.steps[solution.lastInsert];
  solution.quality = solution.initialQuality + solution.lastInsert + 1;
  step.quality = solution.quality;
  let prevXp, prevLevel, prevCost;
  if (solution.lastInsert == 0) {
    prevXp = levelXp[solution.initialLevel] + solution.initialXp;
    prevLevel = solution.initialLevel;
    prevCost = 0;
  } else {
    let prevStep = solution.steps[solution.lastInsert - 1];
    prevXp = prevStep.sumXp;
    prevLevel = prevStep.level;
    prevCost = prevStep.sumCost;
  }
  step.sumXp = prevXp + combos[step.combo].xp;
  step.level = getLevel(prevLevel, step.sumXp);
  step.cost = getCost(prevLevel, combos[step.combo].troops.length);
  step.sumCost = prevCost + step.cost;
  step.extraXp = step.sumXp - levelXp[step.level];
  solution.sumXp = step.sumXp;
  solution.sumLevel = step.level;
  solution.sumCost = step.sumCost;
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

function getLevel(level, newXp) {
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
    combo.troops = template;
    combo.percent = combo.troops.reduce(sumPercent, 0);
    combo.xp = combo.troops.reduce(sumXp, 0);
    combo.counts = countTroops(combo.troops);
    if (TEMPLATES_QUICK.includes(combo.id)) {
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
      result[arr[i].combo] ? result[arr[i].combo]++ : result[arr[i].combo] = 1;
    }
  }
  return result;
}
