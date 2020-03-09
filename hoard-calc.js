const TEMPLATES_QUICK = [0, 1, 3, 4, 5, 9, 10, 12, 14, 19, 20, 23, 25, 26, 27, 28];

const RUN_TESTS = 1;
const RUN_ITERATIONS = 100;

start();

function start() {
  console.log("Starting...");
  let result;
  let time = new Date().getTime();
  if (RUN_TESTS) {
    runTests();
  } else {
    calculate();
  }
  let elapsed = new Date().getTime() - time;
  console.log("Done! Time: " + elapsed + " ms");
}

function calculate() {
  //let bestSolution = findSolution(USE_QUICK_TEMPLATES);
  //console.log("Iterations: " + iterations);
  //return renderSolution(bestSolution);
}

function runTests() {
  if (window.Worker) {
    let bestSolutions = [];
    let totalComboCounts = [];
    let maxTroopCounts = [];
    let numSolutions = 0;
    let totalTime = 0;
    const myWorker = new Worker("worker.js");
    myWorker.postMessage(RUN_ITERATIONS);
    //console.log('Message posted to worker');

    myWorker.onmessage = function(e) {
      //console.log('Message received from worker:');
      //console.log(e);
      let solution = e.data;
      bestSolutions.push(solution);
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
      numSolutions++;
      totalTime += solution.time;
      console.log("Avg time: " + totalTime / numSolutions);
      renderTests(bestSolutions, totalComboCounts);
    }
    console.log(maxTroopCounts);
  } else {
    console.log('Your browser doesn\'t support web workers.')
  }
}

function renderTests(bestSolutions, totalComboCounts) {
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

	const table = createTable(["Budget", "XP Budget", "Gold", "Time", "Iterations", "Slow", "Combos"]);
	table.id = 'main-table';
	table.classList.add('mainTable');
  document.body.appendChild(table);
  //sorttable.makeSortable(table);

  for (let solution of bestSolutions) {
    if (!solution) continue;
    let tr = table.insertRow(-1);
		for (let attribute of ['budget', 'xpBudget', 'bestCost', 'time', 'iterations', 'slow', 'comboCounts']) {
			let td = tr.insertCell(-1);
			if (attribute === 'budget') {
        td.textContent = '';
        for (let troopNr of solution.budget) {
          td.textContent += troopNr += ", ";
        }
      } else if (attribute === 'comboCounts') {
        td.textContent = '';
        for (let troopNr of solution.budget) {
          td.textContent += troopNr += " ";
        }
      } else {
        td.textContent = solution[attribute];
      }
		}
  }
}

function renderSolution(bestSolution) {
	const table = createTable(["Troops", "%", "XP", "Cost", "Level", "Quality", "Extra XP"]);
	table.id = 'main-table';
	table.classList.add('mainTable');
  document.body.appendChild(table);
  //sorttable.makeSortable(table);

  for (let step of bestSolution.bestSteps) {
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
  td.textContent = bestSolution.bestCost;
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
