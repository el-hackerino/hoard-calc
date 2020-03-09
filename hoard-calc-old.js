import React from "react";
import "./styles.css";

export default function App() {
  return (
    <div className="App">
      {calculate()}
    </div>
  );
}

const TROOPS = [
  {shortName: 'C', name: 'Coin Purse', percent: 5, xp: 10},
  {shortName: 'R', name: 'Gold Ring', percent: 10, xp: 25},
  {shortName: 'P', name: 'Priest\'s Chalice', percent: 20, xp: 50},
  {shortName: 'K', name: 'King\'s Crown', percent: 25, xp: 100},
  {shortName: 'L', name: 'Genie\' Lamp', percent: 30, xp: 250},
  {shortName: 'S', name: 'Sacred Treasure', percent: 50, xp: 500},
];

const TEMPLATES = [
[2, 2 ,2 ,2 ,2],
[3, 3, 3, 3],
[4, 3, 3, 2],
[4, 3, 3, 3],
[4, 4, 2, 2],
[5, 3, 3],
[4, 4, 4, 1],
[5, 4, 2],
[5, 4, 3],
[4, 4, 4, 4],
[5, 4, 4],
[5, 5]
];

var AMOUNTS = [10, 10, 20, 20, 8, 2];
var INITIAL_QUALITY = 1;
var INITIAL_LEVEL = 0;
var INITIAL_XP = 0; // leftover
var TARGET_LEVEL = 100;
var GOAL_QUALITY = 10;
var levelXp = [];
var combos = [];
var budget = AMOUNTS.slice(0);
var solution = [];
var sumCost;
var sumLevel;
var bestCost = 1000000;
var bestSolution = [];
var iterations = 0;

function calculate() {
  makeCombos();
  fillXpTable();
  let time = new Date().getTime();
  findSolution(0, 0, 0);
  let elapsed = new Date().getTime() - time;
  console.log("Time: " + elapsed + " ms");
  console.log("Iterations: " + iterations);
  return renderSolution();
}

// TODO get rid of globals (at least bestCost)
function reset() {
  iterations = 0;
  budget = AMOUNTS.slice(0);
  bestCost = 1000000;
  //solution = [];
  //bestSolution = [];
}

function countCombos(arr) {
  return arr.reduce(function (acc, curr) {
    acc[curr.id] ? acc[curr.id]++ : acc[curr.id] = 1;
    return acc;
  }, {});
}

function runTests() {
  makeCombos();
  fillXpTable();
  let time = new Date().getTime();
  let bestSolutions = [];
  for (let amount5 = 0; amount5 <= 10; amount5++) {
    AMOUNTS[5] = amount5;
    reset();
    findSolution(0, 0, 0);
    //console.log(amount5 + ": " + bestCost);
    bestSolutions[amount5] = {};
    bestSolutions[amount5].cost = bestCost;
    bestSolutions[amount5].combos = JSON.parse(JSON.stringify(bestSolution));
    bestSolutions[amount5].comboCounts = countCombos(bestSolution);
    //console.log(bestSolutions[amount5].comboCounts);
  }
  //            <td>{sol.comboCounts.map((count, j) => <span key={i * 100 + j}>{count}</span>)}</td>
  let elapsed = new Date().getTime() - time;
  console.log("Time: " + elapsed + " ms");
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>STs</th>
            <th>Gold</th>
          </tr>
        </thead>
        <tbody>
        {bestSolutions.map((sol, i) => (
          <tr key={i}>
            <td>{i}</td>
            <td>{sol.cost}</td>
            <td>{Object.keys(sol.comboCounts).map((count, j) => <span key={i * 100 + j}>{count} </span>)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}

function renderSolution() {
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Troops</th>
            <th>%</th>
            <th>XP</th>
            <th>Cost</th>
            <th>Level</th>
            <th>Quality</th>
            <th>Extra XP</th>
          </tr>
        </thead>
        <tbody>
        {bestSolution.map((combo, i) => (
          <tr key={i}>
            <td>{combo.troops.map((nr, j) => <span key={i * 100 + j}>{TROOPS[nr].shortName}</span>)}</td>
            <td>{combo.percent}</td>
            <td>{combo.xp}</td>
            <td>{combo.cost}</td>
            <td>{combo.level}</td>
            <td>{combo.quality}</td>
            <td>{combo.extraXp}</td>
          </tr>
        ))}
          <tr key={'total'}>
            <td></td>
            <td></td>
            <td></td>
            <td>{bestCost}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function makeCombos() {
  let id = 0;
  for (let template of TEMPLATES) {
    let combo = {};
    combo.id = id;
    combo.troops = template;
    combo.percent = combo.troops.reduce(sumPercent, 0);
    combo.xp = combo.troops.reduce(sumXp, 0);
    combo.counts = countTroops(combo.troops);
    combos.push(combo);
    id++;
  }
}

function countTroops(arr) {
  return arr.reduce(function (acc, curr) {
    acc[curr] ? acc[curr]++ : acc[curr] = 1;
    return acc;
  }, {});
}

function fillXpTable() {
  for (let i = 0; i < 1000; i++) {
    levelXp[i] = .5 * i + 0.5 * i * i;
  }
}

function findSolution(pos, startCombo, depth) {
  for (let c = startCombo; c < combos.length; c++) {
    iterations++;
    solution[pos] = Object.assign({}, combos[c]);
    calculateStats(depth);
    if (depth === GOAL_QUALITY - INITIAL_QUALITY - 1) {
      if (sumCost < bestCost && sumLevel >= TARGET_LEVEL && budgetFits()) {
        bestCost = sumCost;
        bestSolution = JSON.parse(JSON.stringify(solution))
      }
    } else if (sumCost < bestCost && budgetFits()) {
        findSolution(pos + 1, c, depth + 1);
    } else {

      //solution.pop();
      // Is it correct to only pop here?
    }

  }
  solution.pop();
}

function calculateStats(depth) {
  let quality = INITIAL_QUALITY;
  sumLevel = INITIAL_LEVEL;
  let sumXp = levelXp[INITIAL_LEVEL] + INITIAL_XP;
  sumCost = 0;
  for (let combo of solution) {
    if (combo.troops.length > 0) {
    quality++;
    combo.quality = quality;
    combo.cost = getCost(sumLevel, combo.troops.length);
    combo.level = getLevel(sumLevel, sumXp, combo.xp);
    combo.sumXp = sumXp + combo.xp;
    combo.extraXp = combo.sumXp - levelXp[combo.level];
    sumLevel = combo.level;
    sumXp += combo.xp;
    sumCost += combo.cost;
    }
  }
} 

function budgetFits() {
  for (let i = 0; i < budget.length; i++) {
    let budgetForTroop = budget[i];
    for (let combo of solution) {
      if (combo.counts[i]) {
        budgetForTroop -= combo.counts[i];
        if (budgetForTroop < 0) {
          return false;
        }
      }
    }
  }
  return true;
}

function sumXp(total, i) {
  return total + TROOPS[i].xp;
}

function sumPercent(total, i) {
  return total + TROOPS[i].percent;
} 

function getLevel(oldLevel, oldXp, xp) {
  let newXp = oldXp + xp;
  let level = oldLevel;
  let found = false;
  let counter = 1;
  while (!found && counter < 100) {
    level++;
    let nextLevelXp = levelXp[level];
    if (nextLevelXp > newXp) {
      level--;
      found = true;
    }
    counter++;
  }
  return level;
}

function getCost(level, numTroops) {
  return (600 + (200 * level)) * numTroops;
}



