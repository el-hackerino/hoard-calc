const RUN_TESTS = 0;
const TEST_ITERATIONS = 1000;

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
    if (myWorker) myWorker.terminate();
    myWorker = new Worker("worker.js");
    myWorker.onmessage = render;
    var budget = [];
    for (let [i, input] of TROOP_INPUTS.entries()) {
      budget[i] = input.value;
    }
    let solution = {
      iterations: RUN_TESTS ? TEST_ITERATIONS : 1,
      settings: {
        randomize: RUN_TESTS,
        budget: budget,
        initialQuality: Number(INPUT_QUALITY.value),
        initialLevel: Number(INPUT_LEVEL.value),
        initialXp: Number(INPUT_XP.value),
        goalLevel: Number(INPUT_TARGET_LEVEL.value),
        goalQuality: Number(INPUT_TARGET_QUALITY.value)
      }
    };
    if (RUN_TESTS) {
      myWorker.postMessage(solution);
    } else {
      solution.settings.useQuickList = 1;
      myWorker.postMessage(solution);
      if (INPUT_EXHAUSTIVE.checked) {
        solution.settings.useQuickList = 0;
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
      // Save max troop counts
      for (let t = 0; t < solution.troopCounts.length; t++) {
        if (solution.troopCounts[t]) {
          maxTroopCounts[t] = maxTroopCounts[t] ? Math.max(maxTroopCounts[t], solution.troopCounts[t]) : solution.troopCounts[t];
        }
      }
      totalTime += solution.time;
      totalSlowTime += solution.slowTime;
      renderTests(solutions, totalComboCounts, totalTime / solutions.length, totalSlowTime / solutions.length);
      console.log("Max troop counts: " + maxTroopCounts);
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

  for (let [key, value] of Object.entries(totalComboCounts).filter(([key, value]) => value > 0)) {
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

  const table = createTable(["Budget", "Gold", "Level", "Quality", "Time", "Slow", "Slow G", "Combos", "Slow Combos", "In Level", "In Quality"]);
  table.id = 'test-table';
  table.classList.add('testTable');
  document.body.appendChild(table);
  // TODO sorttable.makeSortable(table);

  for (let solution of solutions) {
    if (!solution) continue;
    let tr = table.insertRow(-1);
    for (let attribute of ['budget', 'bestCost', 'bestLevel', 'bestQuality', 'time', 'slowTime', 'quickCostDiff', 'combos', 'slowCombos', 'initialLevel', 'initialQuality']) {
      let td = tr.insertCell(-1);
      if (attribute == 'budget') {
        td.textContent = '';
        for (let troopNr of solution.budget) {
          td.textContent += troopNr += ", ";
        }
      } else if (attribute == 'combos') {
        td.innerHTML = '';
        for (let step of solution.bestSteps) {
          let comboString = '<span>' + step.combo + " </span>";
          td.innerHTML += comboString;
        }
      } else if (attribute == 'slowCombos') {
        td.innerHTML = '';
        for (let step of solution.slowSolution.bestSteps) {
          let comboString = '<span';
          if (!TEMPLATES_QUICK.includes(Number(step.combo))) {
            comboString += ' class=\'highlight\'';
          }
          comboString += '>' + step.combo + " </span>";
          td.innerHTML += comboString;
        }
      } else {
        td.textContent = solution[attribute];
      }
    }
  }
}

function renderSolution(solution) {
  removeElement('main-table');
  const table = createTable(["Troops", "%", "XP", "Cost", "Level", "Quality", "Extra XP"]);
  table.id = 'main-table';
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
