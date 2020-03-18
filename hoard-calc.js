const DEBUG_EXHAUSTIVE_SINGLE_SOLUTION = 0;
const DEBUG_MAXCOUNTS = 0;
const TROOP_COST_FACTORS = [0, 1, 2, 3, 5, 10, 50];

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
const INPUT_TROOP_COST_FACTOR = document.querySelector('#troopCostFactor');
const INPUT_EXHAUSTIVE = document.querySelector('#exhaustive');
const ALL_INPUTS = [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP,
  INPUT_TARGET_LEVEL, INPUT_TARGET_QUALITY, INPUT_TROOP_COST_FACTOR, INPUT_EXHAUSTIVE];
const MAIN_TABLE_COLUMNS = ["Step", "Troops", "Gold", "Level", "Quality"];
const MAIN_TABLE_ATTRIBUTES = ['nr', 'troops', 'cost', 'level', 'quality'];

document.getElementById('targetLevel-div').classList.add("hidden");
document.getElementById('targetQuality-div').classList.add("hidden");
var buttons = document.querySelectorAll('form button:not([type="submit"])');
for (i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('click', function(e) {
    e.preventDefault();
  });
}

if (window.Worker) {
  var exhaustiveSearchDone = false;
  var myWorker;
  for (let input of ALL_INPUTS) {
    input.onchange = calculate;
  }
  for (let input of [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP]) {
    input.previousElementSibling.addEventListener('click', function() {this.parentNode.querySelector('input[type=number]').stepDown();calculate()});
    input.nextElementSibling.addEventListener('click', function() {this.parentNode.querySelector('input[type=number]').stepUp();calculate()});
  }
  INPUT_TROOP_COST_FACTOR.oninput = calculate;
  initTable("main-table", MAIN_TABLE_COLUMNS);
  if (DEBUG_EXHAUSTIVE_SINGLE_SOLUTION) {
    initTable("main-table-2", MAIN_TABLE_COLUMNS);
  }

  calculate();

  function calculate() {
    console.log("Calculating...");
    if (Number(INPUT_QUALITY.value) >= Number(INPUT_TARGET_QUALITY.value)
      && Number(INPUT_LEVEL.value) >= Number(INPUT_TARGET_LEVEL.value)) {
      renderMessage("No need to upgrade!", true);
      return;
    } else {
      exhaustiveSearchDone = false;
      renderMessage('&nbsp;', false);
    }
    if (myWorker) myWorker.terminate();
    myWorker = new Worker("worker.js");
    myWorker.onmessage = render;
    var budget = [];
    for (let [i, input] of TROOP_INPUTS.entries()) {
      budget[i] = input.value;
    }
    let solution = {
      run_tests: false,
      budget: budget,
      initialQuality: Number(INPUT_QUALITY.value),
      initialLevel: Number(INPUT_LEVEL.value),
      initialXp: Number(INPUT_XP.value),
      goalLevel: Number(INPUT_TARGET_LEVEL.value),
      goalQuality: Number(INPUT_TARGET_QUALITY.value),
      troopCostFactor: TROOP_COST_FACTORS[Number(INPUT_TROOP_COST_FACTOR.value)]
    };
    solution.useQuickList = 1;
    myWorker.postMessage(solution);
    if (INPUT_EXHAUSTIVE.checked) {
      solution.useQuickList = 0;
      myWorker.postMessage(solution);
    }
    renderMessage('Calculating...', false);
  }

  function render(message) {
    let solution = message.data;
    if (solution.useQuickList && INPUT_EXHAUSTIVE.checked && !exhaustiveSearchDone) {
      renderMessage('Refining...', false);
    } else {
      exhaustiveSearchDone = true;
      renderMessage('&nbsp;', false);
    } 
    renderSolution(solution);
    console.log("Time: " + (solution.time / 1000) + " s");
  }
} else {
  renderMessage('Your browser does not support web workers :(', true);
}

function renderSolution(solution) {
  if (!solution.bestSteps.length) {
    renderMessage("Cannot find any useful steps!", true);
    return;
  }
  const tableId = DEBUG_EXHAUSTIVE_SINGLE_SOLUTION ? (solution.useQuickList ? "main-table" : "main-table-2") : "main-table";
  const table = clearTable(tableId);

  for (let [i, step] of solution.bestSteps.entries()) {
    let tr = table.insertRow(-1);
    for (let attribute of MAIN_TABLE_ATTRIBUTES) {
      let td = tr.insertCell(-1);
      if (attribute == 'nr') {
        td.innerHTML = i + 1;
      } else if (attribute == 'troops') {
        td.classList.add('fontSizeZero');
        for (let troop of step.troops) {
          let card = document.createElement('div');
          card.classList.add('card');
          card.classList.add('card' + troop);
          td.appendChild(card);
        }
      } else {
        td.innerHTML = step[attribute];
      }
    }
  }

  document.getElementById('totalCost').innerHTML = solution.bestGoldCost;
}

function renderMessage(message, hideTable) {
  document.getElementById('message').innerHTML = message;
  if (hideTable) {
    document.getElementById('main-table').classList.add('hidden');
    document.getElementById('main-table-2').classList.add('hidden');
  } else {
    document.getElementById('main-table').classList.remove('hidden');
    document.getElementById('main-table-2').classList.remove('hidden');
  }
}

function hideMessage() {
  renderMessage('&nbsp;', false);
}