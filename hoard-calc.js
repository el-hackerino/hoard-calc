/* eslint-disable no-undef */
const DEBUG_EXHAUSTIVE_SINGLE_SOLUTION = 0;
const DEBUG_GENERAL = 0;
const SHOW_ADVANCED_OPTIONS = 0;

const TROOP_COST_FACTORS = [0, 1, 1.5, 2, 3, 5, 10, 50];
const TROOP_INPUTS = [
  // document.querySelector("#t1"),
  document.querySelector("#t2"),
  document.querySelector("#t3"),
  document.querySelector("#t4"),
  document.querySelector("#t5"),
  document.querySelector("#t6"),
];
const INPUT_LEVEL = document.querySelector("#level");
const INPUT_QUALITY = document.querySelector("#quality");
const INPUT_XP = document.querySelector("#xp");
const INPUT_TARGET_LEVEL = document.querySelector("#targetLevel");
const INPUT_TARGET_QUALITY = document.querySelector("#targetQuality");
const INPUT_TROOP_COST_FACTOR = document.querySelector("#troopCostFactor");
const INPUT_EXHAUSTIVE = document.querySelector("#exhaustive");
const ALL_INPUTS = [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP,
  INPUT_TARGET_LEVEL, INPUT_TARGET_QUALITY, INPUT_TROOP_COST_FACTOR, INPUT_EXHAUSTIVE
];
const MAIN_TABLE_COLUMNS = ["Step", "Treasure", "Gold", "Level", "Quality"];
const MAIN_TABLE_ATTRIBUTES = ["nr", "troops", "cost", "level", "quality"];
const EXPENSIVENESS_THRESHOLD = 500000;

if (!window.Worker) {
  showMessage("Your browser does not support web workers :(", true);
  document.getElementById("main-form").classList.add("hidden");
  document.getElementById("results").classList.add("hidden");
  throw new Error("Your browser does not support web workers :(");
}

// Hide unused elements
document.getElementById("targetLevel-div").classList.add("hidden");
document.getElementById("targetQuality-div").classList.add("hidden");
if (!SHOW_ADVANCED_OPTIONS) {
  document.getElementById("optionCheckbox").classList.add("hidden");
}
document.getElementById("close-button").classList.add("hidden");

// Prevent form submission
var buttons = document.querySelectorAll("form button:not([type=\"submit\"])");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function (e) {
    e.preventDefault();
  });
}

// Set event handlers
document.getElementById("help-button").addEventListener("click", function () {
  showHelp();
});
for (let input of ALL_INPUTS) {
  input.onchange = calculate;
}
INPUT_TROOP_COST_FACTOR.oninput = calculate;
for (let input of [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP]) {
  input.previousElementSibling.addEventListener("click", function () {
    this.parentNode.querySelector("input[type=number]").stepDown();
    calculate();
  });
  input.nextElementSibling.addEventListener("click", function () {
    this.parentNode.querySelector("input[type=number]").stepUp();
    calculate();
  });
  input.previousElementSibling.tabIndex = -1;
  input.nextElementSibling.tabIndex = -1;
}
initTable("main-table", MAIN_TABLE_COLUMNS);
if (DEBUG_EXHAUSTIVE_SINGLE_SOLUTION) {
  initTable("main-table-2", MAIN_TABLE_COLUMNS);
}
var exhaustiveSearchDone = false;
var myWorker;
calculate();

function calculate() {
  if (DEBUG_GENERAL) console.log("Calculating...");
  if (Number(INPUT_QUALITY.value) >= Number(INPUT_TARGET_QUALITY.value) &&
    Number(INPUT_LEVEL.value) >= Number(INPUT_TARGET_LEVEL.value)) {
    showMessage("No need to upgrade!", true);
    return;
  } else {
    exhaustiveSearchDone = false;
    hideMessage();
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
  solution.quickSearch = 1;
  myWorker.postMessage(solution);
  if (INPUT_EXHAUSTIVE.checked) {
    solution.quickSearch = 0;
    myWorker.postMessage(solution);
  }
  showMessage("Calculating...", false);
}

function render(workerMessage) {
  let solution = workerMessage.data;
  if (DEBUG_GENERAL) console.log("Time: " + (solution.time / 1000) + " s");
  if (!solution.bestSteps.length) {
    showMessage("Cannot find any useful steps!", true);
    return;
  }

  if (solution.quickSearch && INPUT_EXHAUSTIVE.checked && !exhaustiveSearchDone) {
    showMessage("Refining...", false);
  } else {
    exhaustiveSearchDone = true;
    if (solution.bestQuality >= Number(INPUT_TARGET_QUALITY.value)) {
      if (solution.bestLevel >= Number(INPUT_TARGET_LEVEL.value)) {
        if (solution.bestSteps.length > 1 && solution.bestSteps[solution.bestSteps.length - 2].quality == 10) {
          showMessage("Reached quality 10 and level 100, needed extra steps after quality 10");
        } else {
          showMessage("Reached quality 10 and level 100!");
        }
      } else {
        showMessage("Reached quality 10 but couldn't reach level 100 :(");
      }
    } else {
      if (solution.bestLevel >= Number(INPUT_TARGET_LEVEL.value)) {
        showMessage("Reached level 100 but couldn't reach quality 10 :(");
      } else {
        showMessage("Could not reach quality 10 or level 100 :(");
      }
    }
  }

  let troopCountDiv = document.getElementById("troop-counts");
  troopCountDiv.innerHTML = "";
  for (let [i, count] of solution.troopCounts.entries()) {
    if (!count) continue;
    let card = document.createElement("div");
    card.classList.add("card", "card" + i, "troop-entry");
    troopCountDiv.appendChild(card);
    troopCountDiv.innerHTML += " x " + count + "&nbsp;&nbsp;&nbsp;";
  }

  const tableId = DEBUG_EXHAUSTIVE_SINGLE_SOLUTION ? (solution.quickSearch ? "main-table" : "main-table-2") : "main-table";
  const table = clearTable(tableId);

  for (let [i, step] of solution.bestSteps.entries()) {
    let tr = table.insertRow(-1);
    for (let attribute of MAIN_TABLE_ATTRIBUTES) {
      let td = tr.insertCell(-1);
      if (attribute == "nr") {
        td.innerHTML = i + 1;
      } else if (attribute == "troops") {
        td.classList.add("fontSizeZero");
        for (let troop of step.troops) {
          let card = document.createElement("div");
          card.classList.add("card");
          card.classList.add("card" + troop);
          td.appendChild(card);
        }
      } else {
        td.innerHTML = step[attribute];
      }
    }
  }

  document.getElementById("totalCost").innerHTML = solution.bestGoldCost;
  if (solution.bestGoldCost < EXPENSIVENESS_THRESHOLD) {
    document.getElementById("totalCost").classList.add("totalCostOk");
    document.getElementById("totalCost").classList.remove("totalCostExpensive");
  } else {
    document.getElementById("totalCost").classList.remove("totalCostOk");
    document.getElementById("totalCost").classList.add("totalCostExpensive");
  }
}

function showMessage(message, hideTable) {
  document.getElementById("message").innerHTML = message;
  if (hideTable) {
    document.getElementById("main-table").classList.add("hidden");
    document.getElementById("main-table-2").classList.add("hidden");
    document.getElementById("troop-counts-container").classList.add("hidden");
  } else {
    document.getElementById("main-table").classList.remove("hidden");
    document.getElementById("main-table-2").classList.remove("hidden");
    document.getElementById("troop-counts-container").classList.remove("hidden");
  }
}

function hideMessage() {
  showMessage("&nbsp;", false);
}

function showHelp() {
  document.getElementById("main-form").classList.add("hidden");
  document.getElementById("message").classList.add("hidden");
  document.getElementById("results").classList.add("hidden");
  document.getElementById("help-button").classList.add("hidden");
  document.getElementById("close-button").classList.remove("hidden");
  document.getElementById("help").classList.remove("hidden");
  document.body.addEventListener("click", hideHelp, true);
}

function hideHelp() {
  document.getElementById("main-form").classList.remove("hidden");
  document.getElementById("message").classList.remove("hidden");
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("help-button").classList.remove("hidden");
  document.getElementById("close-button").classList.add("hidden");
  document.getElementById("help").classList.add("hidden");
  document.body.removeEventListener("click", hideHelp, true);
}