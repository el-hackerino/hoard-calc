/* eslint-disable no-unused-vars */
const DEBUG = 1;
const DEBUG_SINGLE_SOLUTION = 1;
const TARGET_QUALITY = 10;
const URL_SEPARATOR = "|";

const TROOPS = [
  { shortName: "C", name: "Coin Purse",       percent: 5,  xp: 10 },
  { shortName: "R", name: "Gold Ring",        percent: 10, xp: 25 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50 },
  { shortName: "K", name: "King's Crown",     percent: 25, xp: 100 },
  { shortName: "G", name: "Genie' Lamp",      percent: 30, xp: 250 },
  { shortName: "S", name: "Sacred Treasure",  percent: 50, xp: 500 }
];

const TEMPLATES = [
  [[1,1,1,1,1], [1  ]], // 100,  0
  [[2,2,2,2,2], [1  ]], // 100,  0
  [[3,2,2,2,2], [1,2  ]], // 105,  1
  [[3,3,2,2,1], [1,2  ]], // 100,  2 opens new levels
  [[3,3,3,3,1], [1,2  ]], // 110,  3 some gold
  [[3,3,3,3,3], [1  ]], // 125,  4
  [[3,3,3,3],   [1  ]], // 100,  5
  [[4,3,3,2],   [1  ]], // 100,  6
  [[4,3,3,3],   [1  ]], // 105,  7 
  [[4,4,2,2],   [1  ]], // 100,  8
  [[4,4,3,3],   [1  ]], // 110,  9 a bit of gold
  [[4,4,4,1],   [1  ]], // 100, 10
  [[5,3,3],     [1  ]], // 100, 11
  [[4,4,4,4,4], [1,2  ]], // 150, 12 saves gold
  [[4,4,4,3],   [1  ]], // 115, 13
  [[5,4,4,4],   [1,2  ]], // 140, 14 saves gold
  [[4,4,4,4],   [1  ]], // 120, 15
  [[5,4,2],     [1,2  ]], // 100, 16 -------------- moved?
  [[5,4,4],     [1  ]], // 110, 17
  [[5,5,4],     [1,2  ]], // 130, 18 saves gold
  [[5,5,5,5,5], [1,2  ]], // 250, 19
  [[5,5,5,5],   [1,2  ]], // 200, 20
  [[5,5,5],     [1  ]], // 150, 21 saves gold
  [[5,5],       [1  ]]  // 100, 22
];

const TEMPLATES_TOO_MANY = [
  [[1,1,1,1,1], [0,  2]], //  50,  0
  [[2,1,1,1,1], [    2]], //  60,  1
  [[2,2,1,1,1], [    2]], //  70,  2
  [[2,2,2,1,1], [    2]], //  80,  3
  [[2,2,2,2,1], [    2]], //  90,  4
  [[2,2,2,2,2], [0,1,2]], // 100,  5
  [[3,2,2,2,2], [  1,2]], // 105,  6
  [[3,3,2,2,1], [  1,2]], // 100,  7
  [[3,3,2,2,2], [    2]], // 110,  8
  [[3,3,3,2,2], [    2]], // 120,  9
  [[3,3,3,3,1], [    2]], // 110, 10
  [[3,3,3,3,2], [    2]], // 120, 11
  [[3,3,3,3,3], [0,1,2]], // 125, 12
  [[3,3,3,3],   [0,1,2]], // 100, 13
  [[4,3,3,2],   [  1  ]], // 100, 14
  [[4,3,3,3],   [  1  ]], // 105, 15 
  [[4,4,2,2],   [  1  ]], // 100, 16
  [[4,4,3,3],   [  1  ]], // 110, 17 a bit of gold
  [[4,4,4,1],   [  1  ]], // 100, 18
  [[5,3,3],     [  1  ]], // 100, 19
  [[4,4,3,3,3], [    2]], // String mode only
  [[4,4,4,3,3], [  1,2]], // 140, 20
  [[4,4,4,4,3], [  1,2]], // 145, 21
  [[4,4,4,4,4], [0,1,2]], // 150, 22 saves gold
  [[4,4,4,3],   [  1  ]], // 115, 23
  [[5,4,4,4],   [  1,2]], // 140, 24 saves gold
  [[4,4,4,4],   [  1,2]], // 120, 25
  [[5,4,2],     [  1  ]], // 100, 26
  [[4,4,4],     [    2]], //  90, 27
  [[4,4],       [    2]], //  60, 28
  [[5,4,4],     [  1,2]], // 110, 29
  [[5,5,4],     [  1,2]], // 130, 30 saves gold
  [[5,4,4,4,4], [    2]], // String mode only
  [[5,5,5,5,5], [0,1,2]], // 250, 31
  [[5,5,5,5],   [  1,2]], // 200, 32
  [[5,5,5],     [  1,2]], // 150, 33 saves gold
  [[5,5],       [0,1,2]], // 100, 34
  [[5],         [    2]]  //  50, 35
];

function initTable(id, COLUMN_NAMES) {
  let table = document.getElementById(id);
  let thead = document.createElement("thead");
  COLUMN_NAMES.forEach(function (columnName, i) {
    let th = document.createElement("th");
    th.textContent = columnName;
    thead.appendChild(th);
  });
  table.appendChild(thead);
  let tbody = document.createElement("tbody");
  table.appendChild(tbody);
  return table;
}

function clearTable(id) {
  const table = document.getElementById(id);
  if (table.tBodies.length > 0) {
    table.removeChild(table.tBodies[0]);
  }
  if (table.tFoot) {
    table.removeChild(table.tFoot);
  }
  return table;
}

function createUrlParams(solution) {
  let paramString = "";
  for (let num of [...solution.initialBudget, solution.initialLevel, solution.initialQuality, solution.initialXp, solution.targetLevel]) {
    paramString += num + URL_SEPARATOR;
  }
  paramString = paramString.slice(0, paramString.length - 1);
  return paramString;
}
