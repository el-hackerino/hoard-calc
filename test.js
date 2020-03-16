const TEST_ITERATIONS = 100000;
const DEBUG_MAXCOUNTS = 0;

const INITIAL_XP = 0;
const GOAL_QUALITY = 10;
const GOAL_LEVEL = 100;

const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
const TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Slow", "Diff", "Combos", "Slow Combos"];

if (window.Worker) {
  let solutions = [];
  let totalComboCounts = [];
  let maxTroopCounts = [];
  let totalTime = 0;
  let totalSlowTime = 0;
  initTable("combo-table", COMBO_TABLE_COLUMNS);
  initTable("test-table", TEST_TABLE_COLUMNS);
  // TODO sorttable.makeSortable(table);

  const myWorker = new Worker("worker.js");
  myWorker.onmessage = render;
  let solution = {
    run_tests: 1,
    num_tests: TEST_ITERATIONS,
    initialXp: 0,
    goalLevel: GOAL_LEVEL,
    goalQuality: GOAL_QUALITY,
    budget: [0, 0, 0, 0, 0, 0]
  };
  console.log("Calculating...");
  myWorker.postMessage(solution);

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
    renderTests(solutions, totalComboCounts, totalTime / solutions.length, totalSlowTime / solutions.length);
    if (DEBUG_MAXCOUNTS) console.log("Max troop counts: " + maxTroopCounts);
  }
} else { // TODO
  console.log('Your browser doesn\'t support web workers.')
}

function renderTests(solutions, totalComboCounts, avgTime, avgslowTime) {
  let tableId = "combo-table";
  let table = clearTable(tableId);

  for (let [key, value] of Object.entries(totalComboCounts).filter(([key, value]) => value > 0).sort(([key, value], [key2, value2]) => value < value2)) {
    let tr = table.insertRow(-1);
    let td = tr.insertCell(-1);
    td.textContent = key;
    td = tr.insertCell(-1);
    td.textContent = '';
    for (let troop of TEMPLATES[key]) {
      td.textContent += TROOPS[troop].shortName;
    }
    td = tr.insertCell(-1);
    td.textContent = value;
    td = tr.insertCell(-1);
    td.textContent = TEMPLATES_QUICK.includes(Number(key)) ? '' : 'x';
  }
  let tr = table.insertRow(-1);
  let td = tr.insertCell(-1);
  td.colSpan = 4;
  td.textContent = solutions.length + " iterations, avg time: " + parseInt(avgTime) + " ms, avg slow time: " + parseInt(avgslowTime);

  tableId = "test-table";
  table = clearTable(tableId);

  for (let solution of solutions) {
    if (!solution) continue;
    let tr = table.insertRow(-1);
    for (let attribute of ['budget', 'initialLevel', 'initialQuality', 'bestCost', 'bestLevel', 'bestQuality', 'time', 'slowTime', 'quickCostDiff', 'combos', 'slowCombos']) {
      let td = tr.insertCell(-1);
      if (attribute == 'budget') {
        td.textContent = '';
        for (let troopNr of solution.budget) {
          td.textContent += troopNr += ", ";
        }
      } else if (attribute == 'combos') {
        td.innerHTML = '';
        for (let step of solution.bestSteps) {
          let comboString = '<span>' + step.comboId + " </span>";
          td.innerHTML += comboString;
        }
      } else if (attribute == 'slowCombos') {
        td.innerHTML = '';
        for (let step of solution.slowSolution.bestSteps) {
          let comboString = '<span';
          if (!TEMPLATES_QUICK.includes(Number(step.comboId))) {
            comboString += ' class=\'highlight\'';
          }
          comboString += '>' + step.comboId + " </span>";
          td.innerHTML += comboString;
        }
      } else {
        td.textContent = solution[attribute];
      }
    }
  }
}
