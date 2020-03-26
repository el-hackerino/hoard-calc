/* eslint-disable no-undef */
const TEST_ITERATIONS = 10000;
const RUN_SECONDARY_SEARCH = false;
const RENDER_DIFF_ONLY = 0;

const INITIAL_XP = 0;
const TROOP_COST_FACTOR = 0;
const GOAL_QUALITY = 10;
const GOAL_LEVEL = 100;

const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
var TEST_TABLE_COLUMNS, TEST_TABLE_ATTRIBUTES;
if (RUN_SECONDARY_SEARCH) {
  TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Slow", "Diff", "Diff %", "Combos", "Slow Combos"];
  TEST_TABLE_ATTRIBUTES = ["budget", "initialLevel", "initialQuality", "bestCost", "bestLevel", "bestQuality", "time", "secondaryTime", "quickCostDiff", "diffPercent", "combos", "slowCombos"];
} else {
  TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Combos"];
  TEST_TABLE_ATTRIBUTES = ["budget", "initialLevel", "initialQuality", "bestCost", "bestLevel", "bestQuality", "time", "combos"];
}
let solutions = [];
let totalComboCounts = new Array(TEMPLATES.length).fill(0);
let totalTime = 0;
let totalsecondaryTime = 0;

if (window.Worker) {
  initTable("ComboTable", COMBO_TABLE_COLUMNS);
  sorttable.makeSortable(initTable("TestTable", TEST_TABLE_COLUMNS));

  const myWorker = new Worker("worker.js");
  myWorker.onmessage = render;
  let solution = {
    runTests: 1,
    numTests: TEST_ITERATIONS,
    runSecondarySearch: RUN_SECONDARY_SEARCH,
    initialXp: INITIAL_XP,
    targetLevel: GOAL_LEVEL,
    targetQuality: GOAL_QUALITY,
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
  let detailsFromSolution = RUN_SECONDARY_SEARCH ? solution.secondarySolution : solution;
  let comboCounts = detailsFromSolution.comboCounts;
  for (let c = 0; c < comboCounts.length; c++) {
    if (comboCounts[c]) {
      totalComboCounts[c] = totalComboCounts[c]  ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
    }
  }
  totalTime += solution.time;
  totalsecondaryTime += solution.secondaryTime;
  renderComboStats(
    solutions,
    totalComboCounts,
    totalTime / solutions.length,
    totalsecondaryTime / solutions.length
  );
  renderTestResults(solution);
}

function renderComboStats(solutions, totalComboCounts, avgTime, avgSecondaryTime) {
  let tableId = "ComboTable";
  let table = clearTable(tableId);
  
  // eslint-disable-next-line no-unused-vars
  for (let [key, value] of Object.entries(totalComboCounts).sort(
    ([key, value], [key2, value2]) => value < value2
  )) {
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

  let tfoot = document.createElement("tfoot");
  let td = document.createElement("td");
  td.colSpan = 4;
  td.textContent = solutions.length + " iterations, avg time: " + parseInt(avgTime) + " ms, avg slow time: " + parseInt(avgSecondaryTime);
  tfoot.appendChild(td);
  table.appendChild(tfoot);

  sorttable.makeSortable(table);
}

function renderTestResults(solution) {
  if (!solution || (RENDER_DIFF_ONLY && !solution.quickCostDiff)) return;
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
      for (let step of solution.secondarySolution.bestSteps) {
        let comboString = "<span";
        if (!TEMPLATES[Number(step.comboId)][1]) {
          comboString += " class='highlight'";
        }
        comboString += ">" + step.comboId + " </span>";
        td.innerHTML += comboString;
      }
    } else if (attribute == "diffPercent" && solution.quickCostDiff > 0) {
      td.textContent = parseInt((solution.quickCostDiff / solution.secondarySolution.bestGoldCost) * 100) + "%";
    } else {
      td.textContent = solution[attribute];
    }
  }
}