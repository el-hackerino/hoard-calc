/* eslint-disable no-undef */
const TEST_ITERATIONS = 10000;
const RUN_SECONDARY_SEARCH = 1;
const DETAILS_FROM_SOLUTION_TYPE = 3;
const COMPARE_SOLUTION_TYPE_1 = 2;
const COMPARE_SOLUTION_TYPE_2 = 3;
const RENDER_DIFF_ONLY = 0;

const INITIAL_XP = 0;

const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
var TEST_TABLE_COLUMNS, TEST_TABLE_ATTRIBUTES;
if (RUN_SECONDARY_SEARCH) {
  TEST_TABLE_COLUMNS = ["Budget", "In L", "In Q", "Target L", "Gold", "L",
    "Q", "Time", "Gold 2", "L 2", "Q 2", "Time 2", "Diff", "Diff %", "Combos", "Length"];
  TEST_TABLE_ATTRIBUTES = ["initialBudget", "initialLevel", "initialQuality", "targetLevel", "bestCost", "bestLevel",
    "bestQuality", "time", "bestCost2", "bestLevel2", "bestQuality2", "time2", "costDiff", "diffPercent", "combos2", "length"];
} else {
  TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Target Level", "Gold", "Level", "Quality", "Time", "Combos"];
  TEST_TABLE_ATTRIBUTES = ["initialBudget", "initialLevel", "initialQuality", "targetLevel", "bestCost", "bestLevel", "bestQuality", "time", "combos"];
}
const IMPROVED_QUALITY = "1";
const IMPROVED_LEVEL = "2";
let numSolutions = 0;
let currentSolutions = [];
let totalComboCounts = new Array(TEMPLATES.length).fill(0);
let totalTime = 0;
let totalsecondaryTime = 0;
let maxTroopCounts = [];

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
    initialBudget: [0, 0, 0, 0, 0, 0]
  };

  console.log("Calculating...");
  myWorker.postMessage(solution);
} else {
  console.log("Your browser doesn't support web workers.");
}

function render(message) {
  let solution = message.data;
  if (DEBUG) console.log("Received:");
  if (DEBUG) console.log(solution);
  if (!currentSolutions[solution.id]) currentSolutions[solution.id] = [];
  if (solution.final) {
    currentSolutions[solution.id][solution.testType] = solution;
  } else {
    if (DEBUG) console.log("Intermediate update, returning");
    return;
  }
  let solution1 = currentSolutions[solution.id][COMPARE_SOLUTION_TYPE_1];
  let solution2 = currentSolutions[solution.id][COMPARE_SOLUTION_TYPE_2];
  if (DEBUG) console.log("Received so far:");
  if (DEBUG) console.log(solution1);
  if (DEBUG) console.log(solution2);
  if (!solution1 || !solution2 || !solution1.final || !solution2.final) {
    if (DEBUG) console.log("Not done yet, returning");
    return;
  }
  if (DEBUG) console.log("Time: " + solution.time / 1000 + " s, " + solution.iterations + " iterations, best cost: " + solution.bestCost);
  numSolutions++;

  // Calculate differences
  if (solution1.bestQuality == solution2.bestQuality) {
    if (!solution1.reachedLevel) {
      if (solution2.bestLevel > solution1.bestLevel) {
        solution1.costDiff = IMPROVED_LEVEL;
      } else if (solution2.bestLevel == solution1.bestLevel) {
        solution1.costDiff = solution1.bestCost - solution2.bestCost;
      }
    } else if (solution2.reachedLevel) {
      solution1.costDiff = solution1.bestCost - solution2.bestCost;
    } else {
      solution1.costDiff = -1;
    }
  } else if (solution2.bestQuality >= solution1.bestQuality) {
    solution1.costDiff = IMPROVED_QUALITY;
  } else {
    solution1.costDiff = -1;
  }
  solution1.final2 = solution2.final;
  solution1.time2 = solution2.time;
  solution1.bestCost2 = solution2.bestCost;
  solution1.bestLevel2 = solution2.bestLevel;
  solution1.bestQuality2 = solution2.bestQuality;

  totalTime += solution1.time;
  totalsecondaryTime += solution2.time;

  // Gather statistics
  let detailsFromSolution = currentSolutions[solution.id][DETAILS_FROM_SOLUTION_TYPE];
  if (detailsFromSolution && (solution1.costDiff > 0 || solution1.costDiff == IMPROVED_QUALITY || solution1.costDiff == IMPROVED_LEVEL)) {
    // Count used combos
    let comboCounts = detailsFromSolution.bestComboCounts;
    for (let c = 0; c < comboCounts.length; c++) {
      if (comboCounts[c]) {
        totalComboCounts[c] = totalComboCounts[c]  ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
      }
    }
    if (DEBUG) console.log("Counted combos: " + totalComboCounts);
    // Save max troop counts
    if (DEBUG_MAXCOUNTS) {
      for (let t = 0; t < detailsFromSolution.troopCounts.length; t++) {
        if (detailsFromSolution.troopCounts[t]) {
          maxTroopCounts[t] = maxTroopCounts[t] ? Math.max(maxTroopCounts[t], detailsFromSolution.troopCounts[t]) : detailsFromSolution.troopCounts[t];
        }
      }
    }
  }

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
  sorttable.makeSortable(table);

  document.getElementById("Stats").textContent = numIterations + " iterations, avg time 1: " + parseInt(avgTime)
    + " ms, avg time 2: " + parseInt(avgSecondaryTime) + " ms" + ", max troop counts: " + maxTroopCounts;
}

function renderTestResults(solution1, solution2) {
  if (!solution1 || (RENDER_DIFF_ONLY && solution1.costDiff <= 0 && solution1.costDiff != IMPROVED_QUALITY && solution1.costDiff != IMPROVED_LEVEL)) return;
  let table = document.getElementById("TestTable");
  let tr = table.insertRow(-1);
  for (let attribute of TEST_TABLE_ATTRIBUTES) {
    let td = tr.insertCell(-1);
    if (attribute == "initialBudget") {
      td.innerHTML = "<a href=\"" + window.location.href.split("?")[0].replace("test", "index") + "?"
        + createUrlParams(solution1) + "\">" + solution1.initialBudget + "</a>";
    } else if (attribute == "combos") {
      td.innerHTML = "";
      // for (let step of solution.bestSteps) {
      //   let comboString = "<span>" + step.comboId + " </span>";
      //   td.innerHTML += comboString;
      // }
    } else if (attribute == "combos2" && solution2.bestMethod == "brute") {
      td.innerHTML = "";
      for (let step of solution2.bestSteps) {
        let comboString = "<span";
        if (TEMPLATES[Number(step.comboId)][1].includes(2)) {
          comboString += " class='highlightRed'";
        }
        comboString += ">" + step.comboId + " </span>";
        td.innerHTML += comboString;
      }
    } else if (attribute == "diffPercent" && solution1.costDiff > 0) {
      td.textContent = parseInt((solution1.costDiff / solution2.bestCost) * 100);
    } else if (attribute == "length") {
      td.textContent = solution2.bestSteps.length;
    } else {
      td.textContent = solution1[attribute];
    }
    if (["bestCost2", "bestLevel2", "bestQuality2", "time2", "costDiff", "diffPercent", "combos2"].includes(attribute)) {
      if (solution1.costDiff <= 0) {
        td.classList.add("lowlight");
      } else {
        td.classList.add("highlightBlue");
      } 
    }
    if (attribute == "bestQuality2" && solution1.bestQuality < solution2.bestQuality
      || attribute == "costDiff" && solution1.costDiff > 1) {
      td.classList.remove("highlightBlue");
      td.classList.add("highlightGreen");
    }
    if (attribute == "time" && solution1.final == "timeout"
      || attribute == "time2" && solution1.final2 == "timeout"
      || attribute == "level" && solution1.reachedLevel == false
      || attribute == "quality" && solution1.reachedQuality == false) {
      td.classList.remove("highlightBlue");
      td.classList.remove("highlightGreen");
      td.classList.remove("lowlight");
      td.classList.add("highlightRed");
    }
  }
  sorttable.makeSortable(table);
}