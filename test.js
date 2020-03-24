/* eslint-disable no-undef */
const TEST_ITERATIONS = 100000;
const DEBUG_MAXCOUNTS = 0;
const RENDER_DIFF_ONLY = 0;

const INITIAL_XP = 0;
const TROOP_COST_FACTOR = 1;
const GOAL_QUALITY = 10;
const GOAL_LEVEL = 100;

const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
const TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Slow", "Diff", "Diff %", "Combos", "Slow Combos"];
const TEST_TABLE_ATTRIBUTES = ["budget", "initialLevel", "initialQuality", "bestCost", "bestLevel", "bestQuality", "time", "slowTime", "quickCostDiff", "diffPercent", "combos", "slowCombos"];

let solutions = [];
let totalComboCounts = new Array(TEMPLATES.length).fill(0);
let maxTroopCounts = [];
let totalTime = 0;
let totalSlowTime = 0;

if (window.Worker) {
  initTable("ComboTable", COMBO_TABLE_COLUMNS);
  initTable("TestTable", TEST_TABLE_COLUMNS);
  // TODO sorttable.makeSortable(table);

  const myWorker = new Worker("worker.js");
  myWorker.onmessage = render;
  let solution = {
    run_tests: 1,
    num_tests: TEST_ITERATIONS,
    initialXp: INITIAL_XP,
    goalLevel: GOAL_LEVEL,
    goalQuality: GOAL_QUALITY,
    troopCostFactor: TROOP_COST_FACTOR,
    budget: [0, 0, 0, 0, 0, 0]
  };
  console.log("Calculating...");
  myWorker.postMessage(solution);
} else {
  console.log("Your browser doesn't support web workers.");
}

function render(message) {
  let solution = message.data;
  solutions.push(solution);
  // Count used combos
  let comboCounts = solution.slowSolution.comboCounts;
  for (let c = 0; c < comboCounts.length; c++) {
    if (comboCounts[c]) {
      totalComboCounts[c] = totalComboCounts[c] ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
    }
  }
  if (DEBUG_MAXCOUNTS) {
    // Save max troop counts
    for (let t = 0; t < solution.troopCounts.length; t++) {
      if (solution.troopCounts[t]) {
        maxTroopCounts[t] = maxTroopCounts[t] ? Math.max(maxTroopCounts[t], solution.troopCounts[t]) : solution.troopCounts[t];
      }
    }
  }
  totalTime += solution.time;
  totalSlowTime += solution.slowTime;
  renderComboStats(solutions, totalComboCounts, totalTime / solutions.length, totalSlowTime / solutions.length);
  renderTestResults(solution);
  if (DEBUG_MAXCOUNTS) console.log("Max troop counts: " + maxTroopCounts);
}

function renderComboStats(solutions, totalComboCounts, avgTime, avgslowTime) {
  let tableId = "ComboTable";
  let table = clearTable(tableId);

  // eslint-disable-next-line no-unused-vars
  for (let [key, value] of Object.entries(totalComboCounts).sort(([key, value], [key2, value2]) => value < value2)) {
    let tr = table.insertRow(-1);
    let td = tr.insertCell(-1);
    td.textContent = key;
    td = tr.insertCell(-1);
    td.textContent = "";
    for (let troop of TEMPLATES[key][0]) {
      td.textContent += TROOPS[troop].shortName;
    }
    td = tr.insertCell(-1);
    td.textContent = value;
    td = tr.insertCell(-1);
    td.textContent = TEMPLATES[Number(key)][1] ? "" : "x";
  }
  let tr = table.insertRow(-1);
  let td = tr.insertCell(-1);
  td.colSpan = 4;
  td.textContent = solutions.length + " iterations, avg time: " + parseInt(avgTime) + " ms, avg slow time: " + parseInt(avgslowTime);
}

function renderTestResults(solution) {
  if (!solution || RENDER_DIFF_ONLY && !solution.quickCostDiff) return;
  let table = document.getElementById("TestTable");
  let tr = table.insertRow(-1);
  for (let attribute of TEST_TABLE_ATTRIBUTES) {
    let td = tr.insertCell(-1);
    if (attribute == "budget") {
      td.textContent = "";
      for (let troopNr of solution.budget) {
        td.textContent += troopNr += ", ";
      }
    } else if (attribute == "combos") {
      td.innerHTML = "";
      for (let step of solution.bestSteps) {
        let comboString = "<span>" + step.comboId + " </span>";
        td.innerHTML += comboString;
      }
    } else if (attribute == "slowCombos") {
      td.innerHTML = "";
      for (let step of solution.slowSolution.bestSteps) {
        let comboString = "<span";
        if (!TEMPLATES[Number(step.comboId)][1]) {
          comboString += " class='highlight'";
        }
        comboString += ">" + step.comboId + " </span>";
        td.innerHTML += comboString;
      }
    } else if (attribute == "diffPercent" && solution.quickCostDiff > 0) {
      td.textContent = parseInt (solution.quickCostDiff / solution.slowSolution.bestGoldCost * 100) + "%";
    } else {
      td.textContent = solution[attribute];
    }
  }
}