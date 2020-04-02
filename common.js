/* eslint-disable no-unused-vars */
const DEBUG = 1;
const MAX_REFINEMENT_LEVEL = 2;

const TROOPS = [
  { shortName: "C", name: "Coin Purse",       percent: 5,  xp: 10,  value: 2 },
  { shortName: "R", name: "Gold Ring",        percent: 10, xp: 25,  value: 5.1 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50,  value: 12 },
  { shortName: "K", name: "King's Crown",     percent: 25, xp: 100, value: 25 },
  { shortName: "G", name: "Genie' Lamp",      percent: 30, xp: 250, value: 50 },
  { shortName: "S", name: "Sacred Treasure",  percent: 50, xp: 500, value: 150 }
];

const TEMPLATES = [
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

const TEMPLATES_OLD = [
  // [[0,0,0,0,0],    1], //       0
  // [[1,1,1,1,1],    1], //       1
  [[2,2,2,2,2],    1], // 100, 0   2
  [[3,2,2,2,2],    0], // 105, 1   3
  [[3,3,2,2,1],    0], // 100, 2   4 opens new levels
  [[3,3,3,3,1],    0], // 110, 3   5 some gold
  [[3,3,3,3,3],    1], // 125, 4   6
  [[3,3,3,3],      1], // 100, 5   7
  [[4,3,3,2],      1], // 100, 6   8
  [[4,3,3,3],      1], // 105, 7   9
  [[4,4,2,2],      0], // 100, 8  10
  [[4,4,3,3],      0], // 110, 9  11 a bit of gold
  [[4,4,4,1],      0], // 100, 10 12
  [[5,3,3],        0], // 100, 11 13
  [[5,4,2],        0], // 100, 12 14
  [[4,4,4,4,4],    1], // 150, 13 15 saves gold
  [[4,4,4,3],      0], // 115, 14 16 
  [[5,4,4,4],      0], // 140, 15 17 saves gold
  [[4,4,4,4],      0], // 120, 16 18
  [[5,4,4],        0], // 110, 17 19
  [[5,5,4],        0], // 130, 18 20 saves gold
  [[5,5,5,5,5],    1], // 250, 19 21
  [[5,5,5,5],      0], // 200, 20 22
  [[5,5,5],        0], // 150, 21 23 saves gold
  [[5,5],          1]  // 100, 22 24                   x
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
