// TODO constants?
const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500 }
];
const TEMPLATES_QUICK = [0, 1, 3, 4, 5, 9, 10, 12, 14, 19, 20, 23, 25, 26, 27, 28];

const RUN_ITERATIONS = 100;
const RANDOMIZE = 0;

var AMOUNTS = [0, 10, 25, 25, 5, 4];
var INITIAL_QUALITY = 2;
var INITIAL_LEVEL = 24;
var INITIAL_XP = 0; // leftover
var GOAL_LEVEL = 100;
var GOAL_QUALITY = 10;

start();

function start() {
  console.log("Starting...");
  if (window.Worker) {
    let solutions = [];
    let totalComboCounts = [];
    let maxTroopCounts = [];
    let totalTime = 0;
    const myWorker = new Worker("worker.js");
    myWorker.postMessage({
      iterations: RANDOMIZE ? RUN_ITERATIONS : 1,
      settings: {
        randomize: RANDOMIZE,
        budget: AMOUNTS,
        initialQuality: INITIAL_QUALITY,
        initialLevel: INITIAL_LEVEL,
        initialXp: INITIAL_XP,
        goalLevel: GOAL_LEVEL,
        goalQuality: GOAL_QUALITY
      }
    });
    //console.log('Message posted to worker');

    myWorker.onmessage = function(e) {
      //console.log('Message received from worker:');
      //console.log(e);
      let solution = e.data;
      solutions.push(solution);
      // Count used combos
      let comboCounts = solution.comboCounts;
      for (let c = 0; c < comboCounts.length; c++) {
        if (comboCounts[c]) {
            totalComboCounts[c] = totalComboCounts[c] ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
        }
      }
      let solutionTroopCounts = solution.solutionTroopCounts;
      // Save max troop counts
      for (let t = 0; t < solution.troopCounts.length; t++) {
        if (solution.troopCounts[t]) {
            maxTroopCounts[t] = maxTroopCounts[t] ? Math.max(maxTroopCounts[t], solution.troopCounts[t]) : solution.troopCounts[t];
        }
      }
      totalTime += solution.time;
      if (RANDOMIZE) {
        renderTests(solutions, totalComboCounts, totalTime / solutions.length);
        console.log("Max troop counts: " + maxTroopCounts);
      } else {
        renderSolution(solutions[0]);
        console.log("Time: " + (solutions[0].time / 1000) + " s");
      }
    }
  } else {
    console.log('Your browser doesn\'t support web workers.')
  }
}

function renderTests(solutions, totalComboCounts, avgTime) {
  removeElement('main-table');
  removeElement('combo-table');

  const comboTable = createTable(["Combo", "Frequency", "Slow"]);
  comboTable.id = 'combo-table';
	comboTable.classList.add('mainTable');
  document.body.appendChild(comboTable);

  for (let [key, value] of Object.entries(totalComboCounts).filter(([key, value]) => value > 0)) {
    let tr = comboTable.insertRow(-1);
    let td = tr.insertCell(-1);
    td.textContent = key;
    td = tr.insertCell(-1);
    td.textContent = value;
    td = tr.insertCell(-1);
    td.textContent = TEMPLATES_QUICK.includes(Number(key)) ? '' : 'X';
  }

  let tr = comboTable.insertRow(-1);
  let td = tr.insertCell(-1);
  td.textContent = "Avg time: " + parseInt(avgTime) / 1000 + " s";

	const table = createTable(["Budget", "XP Budget", "Gold", "Time", "Slow", "Combos", "In Level", "In Quality"]);
	table.id = 'main-table';
	table.classList.add('mainTable');
  document.body.appendChild(table);
  // TODO sorttable.makeSortable(table);

  for (let solution of solutions) {
    if (!solution) continue;
    let tr = table.insertRow(-1);
		for (let attribute of ['budget', 'xpBudget', 'bestCost', 'time', 'slow', 'comboCounts', 'initialLevel', 'initialQuality']) {
			let td = tr.insertCell(-1);
			if (attribute === 'budget') {
        td.textContent = '';
        for (let troopNr of solution.budget) {
          td.textContent += troopNr += ", ";
        }
      } else if (attribute === 'comboCounts') {
        td.textContent = '';
        for (let [comboId, count] of solution.comboCounts.entries()) {
          if (count) td.textContent += comboId += " ";
        }
      } else {
        td.textContent = solution[attribute];
      }
		}
  }
}

function renderSolution(solution) {
	const table = createTable(["Troops", "%", "XP", "Cost", "Level", "Quality", "Extra XP"]);
	table.id = 'main-table';
	table.classList.add('mainTable');
  document.body.appendChild(table);
  //sorttable.makeSortable(table);

  for (let step of solution.bestSteps) {
    let tr = table.insertRow(-1);
		for (let attribute of ['troops', 'percent', 'xp', 'cost', 'level', 'quality', 'extraXp']) {
			let td = tr.insertCell(-1);
			if (attribute === 'troops') {
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
  td.textContent = solution.bestCost;
}

function createTable(COLUMN_NAMES) {
  let table = document.createElement('table');
	// Headers
	let tr = table.insertRow(-1);
	COLUMN_NAMES.forEach(function(columnName, i) {
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

function reset() {
  iterations = 0;
}
