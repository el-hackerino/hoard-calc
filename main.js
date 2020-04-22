/* eslint-disable no-undef */
const SHOW_STOP_BUTTON_AFTER = 10000;

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
const ALL_INPUTS = [
  ...TROOP_INPUTS,
  INPUT_LEVEL,
  INPUT_QUALITY,
  INPUT_XP,
  INPUT_TARGET_LEVEL
];
const MAIN_TABLE_COLUMNS = ["Step", "Treasure", "Gold", "Level", "Quality"];
const MAIN_TABLE_ATTRIBUTES = ["nr", "troops", "cost", "level", "quality"];
var resultMessage;
var showingHelp = false;
var myWorker;

prepare();
processUrlParams();
calculate();

function prepare() {
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
  document.getElementById("StopButton").onclick = stop;

  // Init tables
  initTable("MainTable1", MAIN_TABLE_COLUMNS);
  if (DEBUG_SINGLE_SOLUTION) {
    initTable("MainTable2", MAIN_TABLE_COLUMNS);
    initTable("MainTable3", MAIN_TABLE_COLUMNS);
  } else {
    document.getElementById("Debug").style.display = "none";
  }
}

function processUrlParams() {
  let params;
  for (let i = 0; i < 2; i++) {
    params = window.location.search.slice(1).split(URL_SEPARATORS[i]);
    if (params && params.length == 10) {
      for (let [i, input] of ALL_INPUTS.entries()) {
        input.value = params[i];
      }
      break;
    }
  }
}

function calculate() {
  if (DEBUG) console.log("Calculating.........................................................");
  if (Number(INPUT_LEVEL.value) <= 0) INPUT_LEVEL.value = 1;
  if (Number(INPUT_LEVEL.value) > 1000) INPUT_LEVEL.value = 1000;
  if (Number(INPUT_TARGET_LEVEL.value) <= 0) INPUT_TARGET_LEVEL.value = 1;
  if (Number(INPUT_TARGET_LEVEL.value) > 1000) INPUT_TARGET_LEVEL.value = 1000;
  if (Number(INPUT_QUALITY.value) <= 0) INPUT_QUALITY.value = 1;
  if (Number(INPUT_QUALITY.value) > 10) INPUT_QUALITY.value = 10;
  if (Number(INPUT_XP.value) < 0) INPUT_XP.value = 0;
  if (Number(INPUT_XP.value) > Number(INPUT_LEVEL.value) + 1) INPUT_XP.value = Number(INPUT_LEVEL.value) + 1;
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
    initialBudget: budget,
    initialQuality: Number(INPUT_QUALITY.value),
    initialLevel: Number(INPUT_LEVEL.value),
    initialXp: Number(INPUT_XP.value),
    targetLevel: Number(INPUT_TARGET_LEVEL.value),
  };
  updatePermaLink(createUrlParams(solution));
  myWorker.postMessage(solution);
  showMessage("Calculating...", false, true, false);
  document.getElementById("Results").classList.add("blurred");
  document.getElementById("InterruptIndicator").classList.add("hidden");
}

function updatePermaLink(paramString) {
  document.getElementById("PermaLink").innerHTML = "<a href=\"" + window.location.href.split("?")[0] + "?" + paramString + "\">Link to this hoard</a>";
}

function stop() {
  if (myWorker) myWorker.terminate();
  showMessage(resultMessage, false, false, false);
  document.getElementById("InterruptIndicator").classList.remove("hidden");
}

function render(workerMessage) {
  let solution = workerMessage.data;
  if (DEBUG) console.log("Time: " + solution.time / 1000 + " s, " + solution.iterations + " iterations, best cost: " + solution.bestCost);
  if (!solution.bestSteps.length) {
    if (solution.final) showMessage("Cannot find any useful steps!", true, false, false);
    return;
  }

  showMessage("Refining...", false, true, solution.time > SHOW_STOP_BUTTON_AFTER);
  document.getElementById("Results").classList.remove("blurred");

  updateResultMessage(solution);
  if (solution.final) {
    showMessage(resultMessage, false, false, false);
  }

  const troopCountDivId = "TroopCounts" + (DEBUG_SINGLE_SOLUTION ? solution.method : "1");
  let troopCountDiv = document.getElementById(troopCountDivId);
  troopCountDiv.innerHTML = "";
  for (let [i, count] of solution.troopCounts.entries()) {
    if (!count) continue;
    let card = document.createElement("div");
    card.classList.add("card", "card" + i, "troop-entry");
    troopCountDiv.appendChild(card);
    troopCountDiv.innerHTML += " x " + count + "&nbsp;&nbsp;&nbsp;";
  }

  const tableId = "MainTable" + (DEBUG_SINGLE_SOLUTION ? solution.method : "1");
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

  const totalCostId = "TotalCost" + (DEBUG_SINGLE_SOLUTION ? solution.method : "1");
  document.getElementById(totalCostId).innerHTML = solution.bestCost;
}

function updateResultMessage(solution) {
  if (solution.initialQuality >= solution.targetQuality) {
    if (solution.bestLevel >= solution.targetLevel) {
      resultMessage = "Reached level " + solution.targetLevel + "!";
    } else {
      resultMessage = "Could not reach level " + solution.targetLevel + " :(";
    }
  } else if (solution.bestQuality >= solution.targetQuality) {
    resultMessage = "Reached quality " + TARGET_QUALITY;
    if (solution.initialLevel >= solution.targetLevel) {
      resultMessage += "!";
    } else if (solution.bestLevel >= solution.targetLevel) {
      resultMessage += " and level " + solution.targetLevel + "!";
    } else {
      resultMessage += " but couldn't reach level " + solution.targetLevel + " :(";
    }
  } else {
    if (solution.bestLevel >= solution.targetLevel) {
      resultMessage = "Reached level " + solution.targetLevel + " but couldn't reach quality " + TARGET_QUALITY + " :(";
    } else {
      resultMessage = "Could not reach quality " + TARGET_QUALITY + " or level " + solution.targetLevel + " :(";
    }
  }
}

function showMessage(message, hideTable, showSpinner, showStopButton) {
  if (message) document.getElementById("Message").innerHTML = message;
  toggleElement("Results", !hideTable && !showingHelp);
  toggleElement("StopButton", showStopButton);
  document.getElementById("Spinner").style.display = showSpinner ? "inline-block" : "none";
}

function toggleElement(elementId, status) {
  if (status) {
    document.getElementById(elementId).classList.remove("hidden");
  } else {
    document.getElementById(elementId).classList.add("hidden");
  }
}

function hideMessage() {
  showMessage("&nbsp;", false, false);
}

function showHelp() {
  document.getElementById("MainForm").classList.add("hidden");
  document.getElementById("MessageContainer").classList.add("hidden");
  document.getElementById("Results").classList.add("hidden");
  document.getElementById("PermaLink").classList.add("hidden");
  document.getElementById("Footer").classList.add("hidden");
  document.getElementById("HelpButton").classList.add("hidden");
  document.getElementById("CloseButton").classList.remove("hidden");
  document.getElementById("Help").classList.remove("hidden");
  document.body.addEventListener("click", hideHelp, true);
  showingHelp = true;
}

function hideHelp() {
  document.getElementById("MainForm").classList.remove("hidden");
  document.getElementById("MessageContainer").classList.remove("hidden");
  document.getElementById("Results").classList.remove("hidden");
  document.getElementById("PermaLink").classList.remove("hidden");
  document.getElementById("Footer").classList.remove("hidden");
  document.getElementById("HelpButton").classList.remove("hidden");
  document.getElementById("CloseButton").classList.add("hidden");
  document.getElementById("Help").classList.add("hidden");
  document.body.removeEventListener("click", hideHelp, true);
  showingHelp = false;
}
