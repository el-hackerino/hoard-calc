/* eslint-disable no-undef */
const DEBUG_SINGLE_SOLUTION = 0;
const TARGET_QUALITY = 10;

const TROOP_COST_FACTORS = [0, 100, 150, 200, 500, 1000, 5000, 20000, 100000];
const TROOP_INPUTS = [
  document.querySelector("#T1"),
  document.querySelector("#T2"),
  document.querySelector("#T3"),
  document.querySelector("#T4"),
  document.querySelector("#T5"),
  document.querySelector("#T6")
];
const INPUT_LEVEL = document.querySelector("#Level");
const INPUT_QUALITY = document.querySelector("#Quality");
const INPUT_XP = document.querySelector("#Xp");
const INPUT_TARGET_LEVEL = document.querySelector("#TargetLevel");
const INPUT_TROOP_COST_FACTOR = document.querySelector("#TroopCostFactor");
const ALL_INPUTS = [
  ...TROOP_INPUTS,
  INPUT_LEVEL,
  INPUT_QUALITY,
  INPUT_XP,
  INPUT_TARGET_LEVEL,
  INPUT_TROOP_COST_FACTOR,
];
const MAIN_TABLE_COLUMNS = ["Step", "Treasure", "Gold", "Level", "Quality"];
const MAIN_TABLE_ATTRIBUTES = ["nr", "troops", "cost", "level", "quality"];

if (!window.Worker) {
  showMessage("Your browser does not support web workers :(", true, false);
  document.getElementById("MainForm").classList.add("hidden");
  document.getElementById("Results").classList.add("hidden");
  throw new Error("Your browser does not support web workers :(");
}

document.getElementById("CloseButton").classList.add("hidden");

// Prevent form submission
var buttons = document.querySelectorAll("form button:not([type=\"submit\"])");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function(e) {
    e.preventDefault();
  });
}

// Set event handlers
document.getElementById("HelpButton").addEventListener("click", function() {
  showHelp();
});
for (let input of ALL_INPUTS) {
  input.onchange = calculate;
}
INPUT_TROOP_COST_FACTOR.oninput = calculate;
for (let input of [...TROOP_INPUTS, INPUT_LEVEL, INPUT_QUALITY, INPUT_XP, INPUT_TARGET_LEVEL]) {
  input.previousElementSibling.addEventListener("click", function() {
    this.parentNode.querySelector("input[type=number]").stepDown();
    calculate();
  });
  input.nextElementSibling.addEventListener("click", function() {
    this.parentNode.querySelector("input[type=number]").stepUp();
    calculate();
  });
  input.previousElementSibling.tabIndex = -1;
  input.nextElementSibling.tabIndex = -1;
}

initTable("MainTable", MAIN_TABLE_COLUMNS);
if (DEBUG_SINGLE_SOLUTION) {
  initTable("MainTable2", MAIN_TABLE_COLUMNS);
}
var myWorker;
// var timeouts = [];
calculate();

function calculate() {
  if (DEBUG) console.log("Calculating.........................................................");
  // for (let timeout of timeouts) {
  //   clearTimeout(timeout);
  // }
  // timeouts = [];
  if (Number(INPUT_QUALITY.value) >= TARGET_QUALITY
    && Number(INPUT_LEVEL.value) >= Number(INPUT_TARGET_LEVEL.value)) {
    showMessage("No need to upgrade!", true, false);
    return;
  } else {
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
    runTests: false,
    budget: budget,
    initialQuality: Number(INPUT_QUALITY.value),
    initialLevel: Number(INPUT_LEVEL.value),
    initialXp: Number(INPUT_XP.value),
    targetLevel: Number(INPUT_TARGET_LEVEL.value),
    targetQuality: TARGET_QUALITY,
    troopCostFactor: TROOP_COST_FACTORS[Number(INPUT_TROOP_COST_FACTOR.value)]
  };
  myWorker.postMessage(solution);
  // timeouts.push(setTimeout(function() {
  //   if (DEBUG) console.log("Timeout!");
  //   if (!primarySearchDone) {
  //     if (DEBUG) console.log("Low fidelity!");
  //     if (myWorker) myWorker.terminate();
  //     myWorker = new Worker("worker.js");
  //     myWorker.onmessage = render;
  //     solution.secondarySearch = 1;
  //     myWorker.postMessage(solution);
  //   }
  // }, LOW_FIDELITY_TIMEOUT));
  showMessage("Calculating...", false, true);
  document.getElementById("Results").classList.add("blurred");
}

function render(workerMessage) {
  let solution = workerMessage.data;
  if (DEBUG) console.log("Time: " + solution.time / 1000 + " s, " + solution.iterations + " iterations, best cost: " + solution.bestGoldCost);
  if (!solution.bestSteps.length) {
    showMessage("Cannot find any useful steps!", true, false);
    return;
  }

  showMessage("Refining...", false, true);
  document.getElementById("Results").classList.remove("blurred");

  if (solution.final) {
    primarySearchDone = true;
    if (solution.bestQuality >= solution.targetQuality) {
      if (solution.bestLevel >= solution.targetLevel) {
        if (
          solution.bestSteps.length > 1 &&
          solution.bestSteps[solution.bestSteps.length - 2].quality == 10
        ) {
          showMessage("Reached quality 10 and level " + solution.targetLevel + ", needed extra steps after quality 10", false, false);
        } else {
          showMessage("Reached quality 10 and level " + solution.targetLevel + "!", false, false);
        }
      } else {
        showMessage("Reached quality 10 but couldn't reach level " + solution.targetLevel + " :(", false, false);
      }
    } else {
      if (solution.bestLevel >= solution.targetLevel) {
        showMessage("Reached level " + solution.targetLevel + " but couldn't reach quality 10 :(", false, false);
      } else {
        showMessage("Could not reach quality 10 or level " + solution.targetLevel + " :(", false, false);
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

  const tableId = DEBUG_SINGLE_SOLUTION ? solution.secondarySearch ? "MainTable2" : "MainTable" : "MainTable";
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

  document.getElementById("TotalCostContainer").classList.remove("hidden");
  document.getElementById("TotalCost").innerHTML = solution.bestGoldCost;
  if (solution.lowFidelity) {
    document.getElementById("LowFidelityIndicator").classList.remove("hidden");
  } else {
    document.getElementById("LowFidelityIndicator").classList.add("hidden");
  }
}

function showMessage(message, hideTable, showSpinner) {
  if (message) document.getElementById("Message").innerHTML = message;
  if (hideTable) {
    document.getElementById("Results").classList.add("hidden");
  } else {
    document.getElementById("Results").classList.remove("hidden");
  }
  if (showSpinner) {
    document.getElementById("Spinner").style.display = "inline-block";
  } else {
    document.getElementById("Spinner").style.display = "none";
  }
}

function hideMessage() {
  showMessage("&nbsp;", false, false);
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
