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
const MAIN_TABLE_COLUMNS = ["Troops", "%", "XP", "Cost", "Level", "Quality", "Extra XP"];
const COMBO_TABLE_COLUMNS = ["Combo", "Troops", "Freq", "Slow"];
const TEST_TABLE_COLUMNS = ["Budget", "In Level", "In Quality", "Gold", "Level", "Quality", "Time", "Slow", "Slow G", "Combos", "Slow Combos"];

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
  initTable("main-table", MAIN_TABLE_COLUMNS);
  if (DEBUG_EXHAUSTIVE_SINGLE_SOLUTION) {
    initTable("main-table-2", MAIN_TABLE_COLUMNS);
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
    solution.useQuickList = 1;
    myWorker.postMessage(solution);
    if (INPUT_EXHAUSTIVE.checked) {
      solution.useQuickList = 0;
      myWorker.postMessage(solution);
    }
  }

  function render(message) {
    let solution = message.data;
    renderSolution(solution);
    console.log("Time: " + (solution.time / 1000) + " s");
  }
} else { // TODO
  console.log('Your browser doesn\'t support web workers.')
}

function renderSolution(solution) {
  if (!solution.bestSteps.length) {
    renderMessage("Cannot find any useful steps!");
    return;
  }
  const tableId = DEBUG_EXHAUSTIVE_SINGLE_SOLUTION ? (solution.useQuickList ? "main-table" : "main-table-2") : "main-table";
  const table = clearTable(tableId);

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
