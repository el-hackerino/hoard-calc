/* eslint-disable no-undef */
const DEBUG_EXHAUSTIVE_SINGLE_SOLUTION = 0;
const SHOW_ADVANCED_OPTIONS = 0;

const TROOP_COST_FACTORS = [0, 1, 1.5, 2, 5, 10];
const TROOP_INPUTS = [
  document.querySelector("#T1"),
  document.querySelector("#T2"),
  document.querySelector("#T3"),
  document.querySelector("#T4"),
  document.querySelector("#T5"),
  document.querySelector("#T6"),
];
const INPUT_LEVEL = document.querySelector("#Level");
const INPUT_QUALITY = document.querySelector("#Quality");
const INPUT_XP = document.querySelector("#Xp");
const INPUT_TARGET_LEVEL = document.querySelector("#TargetLevel");
const INPUT_TARGET_QUALITY = document.querySelector("#TargetQuality");
const INPUT_TROOP_COST_FACTOR = document.querySelector("#TroopCostFactor");
const INPUT_EXHAUSTIVE = document.querySelector("#Exhaustive");
const ALL_INPUTS = [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP,
  INPUT_TARGET_LEVEL, INPUT_TARGET_QUALITY, INPUT_TROOP_COST_FACTOR, INPUT_EXHAUSTIVE
];
const MAIN_TABLE_COLUMNS = ["Step", "Treasure", "Gold", "Level", "Quality"];
const MAIN_TABLE_ATTRIBUTES = ["nr", "troops", "cost", "level", "quality"];
const EXPENSIVENESS_THRESHOLD = 500000;

if (!window.Worker) {
  showMessage("Your browser does not support web workers :(", true);
  document.getElementById("MainForm").classList.add("hidden");
  document.getElementById("Results").classList.add("hidden");
  throw new Error("Your browser does not support web workers :(");
}

if (!SHOW_ADVANCED_OPTIONS) {
  document.getElementById("OptionCheckbox").classList.add("hidden");
}
document.getElementById("CloseButton").classList.add("hidden");

// Prevent form submission
var buttons = document.querySelectorAll("form button:not([type=\"submit\"])");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function (e) {
    e.preventDefault();
  });
}

// Set event handlers
document.getElementById("HelpButton").addEventListener("click", function () {
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

initTable("MainTable", MAIN_TABLE_COLUMNS);
if (DEBUG_EXHAUSTIVE_SINGLE_SOLUTION) {
  initTable("MainTable2", MAIN_TABLE_COLUMNS);
}
var exhaustiveSearchDone = false;
var myWorker;
calculate();

function calculate() {
  if (DEBUG) console.log("Calculating...");
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
  if (DEBUG) console.log("Time: " + (solution.time / 1000) + " s");
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

  let troopCountDiv = document.getElementById("TroopCounts");
  troopCountDiv.innerHTML = "";
  for (let [i, count] of solution.troopCounts.entries()) {
    if (!count) continue;
    let card = document.createElement("div");
    card.classList.add("card", "card" + i, "troop-entry");
    troopCountDiv.appendChild(card);
    troopCountDiv.innerHTML += " x " + count + "&nbsp;&nbsp;&nbsp;";
  }

  const tableId = DEBUG_EXHAUSTIVE_SINGLE_SOLUTION ? (solution.quickSearch ? "MainTable" : "MainTable2") : "MainTable";
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

  document.getElementById("TotalCost").innerHTML = solution.bestGoldCost;
  if (solution.bestGoldCost < EXPENSIVENESS_THRESHOLD) {
    document.getElementById("TotalCost").classList.add("totalCostOk");
    document.getElementById("TotalCost").classList.remove("totalCostExpensive");
  } else {
    document.getElementById("TotalCost").classList.remove("totalCostOk");
    document.getElementById("TotalCost").classList.add("totalCostExpensive");
  }
}

function showMessage(message, hideTable) {
  document.getElementById("Message").innerHTML = message;
  if (hideTable) {
    document.getElementById("MainTable").classList.add("hidden");
    document.getElementById("MainTable2").classList.add("hidden");
    document.getElementById("TroopCountContainer").classList.add("hidden");
  } else {
    document.getElementById("MainTable").classList.remove("hidden");
    document.getElementById("MainTable2").classList.remove("hidden");
    document.getElementById("TroopCountContainer").classList.remove("hidden");
  }
}

function hideMessage() {
  showMessage("&nbsp;", false);
}

function showHelp() {
  document.getElementById("MainForm").classList.add("hidden");
  document.getElementById("Message").classList.add("hidden");
  document.getElementById("Results").classList.add("hidden");
  document.getElementById("HelpButton").classList.add("hidden");
  document.getElementById("CloseButton").classList.remove("hidden");
  document.getElementById("Help").classList.remove("hidden");
  document.body.addEventListener("click", hideHelp, true);
}

function hideHelp() {
  document.getElementById("MainForm").classList.remove("hidden");
  document.getElementById("Message").classList.remove("hidden");
  document.getElementById("Results").classList.remove("hidden");
  document.getElementById("HelpButton").classList.remove("hidden");
  document.getElementById("CloseButton").classList.add("hidden");
  document.getElementById("Help").classList.add("hidden");
  document.body.removeEventListener("click", hideHelp, true);
}