// TODO constants?
const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500 }
];
const TEMPLATES = [
  [2, 2, 2, 2, 2], // 100, 0
  [3, 2, 2, 2, 2], // 105, 1
  [3, 3, 2, 2, 1], // 100, 2
  [3, 3, 3, 2, 1], // 105, 3
  [3, 3, 3, 2, 2], // 115, 4
  [3, 3, 3, 3],   // 100, 5
  [4, 2, 2, 2, 1], // 100, 6
  [4, 3, 2, 2, 1], // 105, 7
  [4, 3, 3, 1, 1], // 100, 8
  [4, 3, 3, 2],   // 100, 9
  [4, 3, 3, 3],   // 105, 10
  [4, 4, 2, 1, 1], // 100, 11
  [4, 4, 2, 2],   // 100, 12
  [5, 2, 1, 1, 1], // 100, 13
  [5, 2, 2, 1],   // 100, 14
  [4, 4, 3, 1, 1], // 105, 15
  [4, 4, 3, 2],   // 105, 16
  [5, 3, 1, 1, 1], // 105, 17
  [4, 4, 3, 3],   // 110, 18
  [5, 3, 3],     // 100, 19
  [4, 4, 4, 1],   // 100, 20
  [5, 4, 1, 1],   // 100, 21
  [4, 4, 4, 2],   // 110, 22
  [5, 4, 2],     // 100, 23
  [4, 4, 4, 3],   // 115, 24
  [5, 4, 3],     // 105, 25
  [4, 4, 4, 4],   // 120, 26
  [5, 4, 4],     // 110, 27
  [5, 5],       // 100, 28
];
const TEMPLATES_QUICK = [0, 1, 3, 4, 5, 9, 10, 12, 14, 19, 20, 23, 25, 26, 27, 28];

const RUN_ITERATIONS = 1000;
const RANDOMIZE = 0;

var AMOUNTS = [0, 5, 2, 18, 11, 4];
var INITIAL_QUALITY = 1;
var INITIAL_LEVEL = 6;
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
    let totalSlowTime = 0;
    const myWorker = new Worker("worker.js");
    let solution = {
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
    };
    if (RANDOMIZE) {
      myWorker.postMessage(solution);
    } else {
      solution.settings.useQuickList = true;
      myWorker.postMessage(solution);
      solution.settings.useQuickList = false;
      myWorker.postMessage(solution);
    }

    myWorker.onmessage = function(e) {
      let solution = e.data;
      if (RANDOMIZE) {
        solutions.push(solution);
        // Count used combos
        let comboCounts = solution.slowSolution.comboCounts;
        for (let c = 0; c < comboCounts.length; c++) {
          if (comboCounts[c]) {
              totalComboCounts[c] = totalComboCounts[c] ? totalComboCounts[c] + comboCounts[c] : comboCounts[c];
          }
        }
        let solutionTroopCounts = solution.troopCounts;
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
}

function renderTests(solutions, totalComboCounts, avgTime, avgslowTime) {
  removeElement('main-table');
  removeElement('combo-table');

  const comboTable = createTable(["Combo", "Troops", "Freq", "Slow"]);
  comboTable.id = 'combo-table';
	comboTable.classList.add('mainTable');
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
	table.id = 'main-table';
	table.classList.add('mainTable');
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
