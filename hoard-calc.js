const RUN_TESTS = 0;
const TEST_ITERATIONS = 100000;
const DEBUG_EXHAUSTIVE_SINGLE_SOLUTION = 1;
const DEBUG_MAXCOUNTS = 0;

const TROOP_INPUTS = [
  document.querySelector('#t1'),
  document.querySelector('#t2'),
  document.querySelector('#t3'),
  document.querySelector('#t4'),
  document.querySelector('#t5'),
  document.querySelector('#t6'),
];
const INPUT_LEVEL = document.querySelector('#level');
const INPUT_QUALITY = document.querySelector('#quality');
const INPUT_XP = document.querySelector('#xp');
const INPUT_TARGET_LEVEL = document.querySelector('#targetLevel');
const INPUT_TARGET_QUALITY = document.querySelector('#targetQuality');
const INPUT_EXHAUSTIVE = document.querySelector('#exhaustive');
const ALL_INPUTS = [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP,
  INPUT_TARGET_LEVEL, INPUT_TARGET_QUALITY, INPUT_EXHAUSTIVE];

if (window.Worker) {
  let solutions = [];
  let totalComboCounts = [];
  let maxTroopCounts = [];
  let totalTime = 0;
  let totalSlowTime = 0;
  var myWorker;
  for (let input of ALL_INPUTS) {
    input.onchange = calculate;
  }
  calculate();

  function calculate() {
    console.log("Calculating...");
    if (Number(INPUT_QUALITY.value) >= Number(INPUT_TARGET_QUALITY.value)
      && Number(INPUT_LEVEL.value) >= Number(INPUT_TARGET_LEVEL.value)) {
        renderMessage("No need to upgrade!");
        return;
    }
    if (myWorker) myWorker.terminate();
    myWorker = new Worker("worker.js");
    myWorker.onmessage = render;
    var budget = [];
    for (let [i, input] of TROOP_INPUTS.entries()) {
      budget[i] = input.value;
    }
    let solution = {
      num_tests: RUN_TESTS ? TEST_ITERATIONS : 1,
      run_tests: RUN_TESTS,
      budget: budget,
      initialQuality: Number(INPUT_QUALITY.value),
      initialLevel: Number(INPUT_LEVEL.value),
      initialXp: Number(INPUT_XP.value),
      goalLevel: Number(INPUT_TARGET_LEVEL.value),
      goalQuality: Number(INPUT_TARGET_QUALITY.value)
    };
    if (RUN_TESTS) {
      myWorker.postMessage(solution);
    } else {
      solution.useQuickList = 1;
      myWorker.postMessage(solution);
      if (INPUT_EXHAUSTIVE.checked) {
        solution.useQuickList = 0;
        myWorker.postMessage(solution);
      }
    }
  }

  function render(message) {
    let solution = message.data;
    if (RUN_TESTS) {
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
    } else {
      renderSolution(solution);
      console.log("Time: " + (solution.time / 1000) + " s");
    }
  }
} else { // TODO
  console.log('Your browser doesn\'t support web workers.')
}

function renderTests(solutions, totalComboCounts, avgTime, avgslowTime) {
  removeElement('test-table');
  removeElement('combo-table');

  const comboTable = createTable(["Combo", "Troops", "Freq", "Slow"]);
  comboTable.id = 'combo-table';
  comboTable.classList.add('comboTable');
  document.body.appendChild(comboTable);

  for (let [key, value] of Object.entries(totalComboCounts).filter(([key, value]) => value > 0).sort(([key, value], [key2, value2]) => value < value2)) {
    let tr = comboTable.insertRow(-1);
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
  let tr = comboTable.insertRow(-1);
  let td = tr.insertCell(-1);
  td.colSpan = 4;
  td.textContent = solutions.length + " iterations, avg time: " + parseInt(avgTime) + " ms, avg slow time: " + parseInt(avgslowTime);

  const table = createTable(["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Slow", "Slow G", "Combos", "Slow Combos"]);
  table.id = 'test-table';
  table.classList.add('testTable');
  document.body.appendChild(table);
  // TODO sorttable.makeSortable(table);

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

function renderSolution(solution) {
  if (!solution.bestSteps.length) {
    renderMessage("Cannot find any useful steps!");
    return;
  }
  let tableId = DEBUG_EXHAUSTIVE_SINGLE_SOLUTION ? (solution.useQuickList ? "main-table" : "main-table-2") : "main-table";
  removeElement(tableId);
  const table = createTable(["Troops", "%", "XP", "Cost", "Level", "Quality", "Extra XP"]);
  table.id = tableId;
  table.classList.add('mainTable');
  document.body.appendChild(table);
  //sorttable.makeSortable(table);

  for (let step of solution.bestSteps) {
    let tr = table.insertRow(-1);
    for (let attribute of ['troops', 'percent', 'xp', 'cost', 'level', 'quality', 'extraXp']) {
      let td = tr.insertCell(-1);
      if (attribute == 'troops') {
        td.textContent = '';
        for (let troop of step.troops) {
          td.textContent += TROOPS[troop].shortName;
        }
      } else {
        td.textContent = step[attribute];
      }
    }
  }

  let tr = table.insertRow(-1);
  let td = tr.insertCell(-1);
  td.colSpan = 7;
  td.textContent = solution.bestCost;
  tr = table.insertRow(-1);
  td = tr.insertCell(-1);
  td.colSpan = 7;
  td.textContent = solution.iterations;
}

function renderMessage(message) {
  removeElement('main-table');
  let msg = document.createElement('div');
  msg.textContent = message;
  msg.id = 'main-table';
  msg.classList.add('mainTable');
  document.body.appendChild(msg);
}

////////////////////////////////////////////////////////////////////////////////////////////////

function createTable(COLUMN_NAMES) {
  let table = document.createElement('table');
  // Headers
  let tr = table.insertRow(-1);
  COLUMN_NAMES.forEach(function (columnName, i) {
    let th = document.createElement('th');
    th.textContent = columnName;
    tr.appendChild(th);
  });
  return table;
}

function removeElement(id) {
  if (document.getElementById(id)) {
    const oldElement = document.getElementById(id);
    oldElement.parentNode.removeChild(oldElement);
  }
}

function sortFn(attribute) {
	return function(a, b) {
		if (a[attribute] === b[attribute]) {
			return 0;
		} else {
			return (a[attribute] < b[attribute]) ? -1 : 1;
		};
	};
}