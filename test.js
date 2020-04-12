/* eslint-disable no-undef */
const TEST_ITERATIONS = 1;
const RUN_SECONDARY_SEARCH = 1;
const DETAILS_FROM_SOLUTION_TYPE = 3;
const COMPARE_SOLUTION_TYPE_1 = 2;
const COMPARE_SOLUTION_TYPE_2 = 3;
const RENDER_DIFF_ONLY = 0;

const INITIAL_XP = 0;

const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
var TEST_TABLE_COLUMNS, TEST_TABLE_ATTRIBUTES;
if (RUN_SECONDARY_SEARCH) {
  TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Target Level", "Gold", "Level",
    "Quality", "Time", "Gold 2", "Level 2", "Quality 2", "Time 2", "Diff", "Diff %", "Combos", "Combos 2", "Result", "Result 2"];
  TEST_TABLE_ATTRIBUTES = ["initialBudget", "initialLevel", "initialQuality", "targetLevel", "bestCost", "bestLevel",
    "bestQuality", "time", "bestCost2", "bestLevel2", "bestQuality2", "time2", "costDiff", "diffPercent", "combos",
    "slowCombos", "final", "final2"];
} else {
  TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Target Level", "Gold", "Level", "Quality", "Time", "Combos"];
  TEST_TABLE_ATTRIBUTES = ["initialBudget", "initialLevel", "initialQuality", "targetLevel", "bestCost", "bestLevel", "bestQuality", "time", "combos"];
}
let numSolutions = 0;
let currentSolutions = [];
let totalComboCounts = new Array(TEMPLATES.length).fill(0);
let totalTime = 0;
let totalsecondaryTime = 0;

if (window.Worker) {
  initTable("ComboTable", COMBO_TABLE_COLUMNS);
  sorttable.makeSortable(initTable("TestTable", TEST_TABLE_COLUMNS));

  const myWorker = new Worker("worker.js");
  myWorker.onmessage = render;

  let solution = {
    runTests: true,
    numTests: TEST_ITERATIONS,
    runSecondarySearch: RUN_SECONDARY_SEARCH,
    initialXp: INITIAL_XP,
    budget: [0, 0, 0, 0, 0, 0]
  };

  console.log("Calculating...");
  myWorker.postMessage(solution);
} else {
  console.log("Your browser doesn't support web workers.");
}

function render(message) {
  let solution = message.data;
  console.log("Received:");
  console.log(solution);
  if (!currentSolutions[solution.id]) currentSolutions[solution.id] = [];
  if (solution.final) {
    currentSolutions[solution.id][solution.testType] = solution;
  } else {
    console.log("Intermediate update, returning");
    return;
  }
  let solution1 = currentSolutions[solution.id][COMPARE_SOLUTION_TYPE_1];
  let solution2 = currentSolutions[solution.id][COMPARE_SOLUTION_TYPE_2];
  console.log("Received so far:");
  console.log(solution1);
  console.log(solution2);
  if (!solution1 || !solution2 || !solution1.final || !solution2.final) {
    console.log("Not done yet, returning");
    return;
  }
  if (DEBUG) console.log("Time: " + solution.time / 1000 + " s, " + solution.iterations + " iterations, best cost: " + solution.bestCost);
  numSolutions++;
  // Count used combos
  let detailsFromSolution = currentSolutions[solution.id][DETAILS_FROM_SOLUTION_TYPE];
  if (detailsFromSolution) {
    let comboCounts = detailsFromSolution.bestComboCounts;
    for (let c = 0; c < comboCounts.length; c++) {
      if (comboCounts[c]) {
        totalComboCounts[c] = totalComboCounts[c]  ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
      }
    }
  }

  // Calculate differences

  if (solution1.bestQuality >= solution2.bestQuality
    && (solution1.bestLevel >= solution1.targetLevel || solution1.bestLevel >= solution2.bestLevel)) {
    solution1.costDiff = solution1.bestCost - solution2.bestCost;
  } else {
    solution1.costDiff =
      solution1.bestQuality + "->" + solution2.bestQuality + ", "
      + solution1.bestLevel + "->" + solution2.bestLevel + ", "
      + solution1.bestCost + "->" + solution2.bestCost;
  }
  solution1.final2 = solution2.final;
  solution1.time2 = solution2.time;
  solution1.bestCost2 = solution2.bestCost;
  solution1.bestLevel2 = solution2.bestLevel;
  solution1.bestQuality2 = solution2.bestQuality;

  totalTime += solution1.time;
  totalsecondaryTime += solution2.time;

  renderComboStats(
    numSolutions,
    totalComboCounts,
    totalTime / numSolutions,
    totalsecondaryTime / numSolutions
  );
  renderTestResults(solution1, solution2);
}

function renderComboStats(numIterations, totalComboCounts, avgTime, avgSecondaryTime) {
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
  td.textContent = numIterations + " iterations, avg time: " + parseInt(avgTime) + " ms, avg slow time: " + parseInt(avgSecondaryTime);
  tfoot.appendChild(td);
  table.appendChild(tfoot);

  sorttable.makeSortable(table);
}

function renderTestResults(solution1, solution2) {
  if (!solution1 || (RENDER_DIFF_ONLY && !solution1.costDiff)) return;
  let table = document.getElementById("TestTable");
  let tr = table.insertRow(-1);
  for (let attribute of TEST_TABLE_ATTRIBUTES) {
    let td = tr.insertCell(-1);
    if (attribute == "budget") {
      td.textContent = "";
      for (let troopNr of solution1.budget) {
        td.textContent += troopNr += ", ";
      }
    } else if (attribute == "combos") {
      td.innerHTML = "";
      // for (let step of solution.bestSteps) {
      //   let comboString = "<span>" + step.comboId + " </span>";
      //   td.innerHTML += comboString;
      // }
    } else if (attribute == "slowCombos" && solution1.bestMethod == "brute") {
      td.innerHTML = "";
      for (let step of solution2.bestSteps) {
        let comboString = "<span";
        // if (!TEMPLATES[Number(step.comboId)][1]) {
        //   comboString += " class='highlight'";
        // }
        comboString += ">" + step.comboId + " </span>";
        td.innerHTML += comboString;
      }
    } else if (attribute == "diffPercent" && solution1.costDiff > 0) {
      td.textContent = parseInt((solution1.costDiff / solution2.bestCost) * 100);
    } else {
      td.textContent = solution1[attribute];
    }
    if (attribute == "bestLevel2" && solution1.bestLevel < solution2.bestLevel
      || attribute == "bestQuality2" && solution1.bestQuality < solution2.bestQuality) {
      td.classList.add("highlightGreen");
    }
    if (attribute == "final" && solution1[attribute] == "timeout"
      || attribute == "final2" && solution1[attribute] == "timeout") {
      td.classList.add("highlight");
    }
    if (solution1.costDiff == 0 && ["bestCost2", "bestLevel2", "bestQuality2", "slowCombos"].includes(attribute)) {
      td.classList.add("lowlight");
    }
  }
  sorttable.makeSortable(table);
}