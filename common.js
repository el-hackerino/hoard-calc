/* eslint-disable no-unused-vars */
const DEBUG = 1;

const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10, value: 2 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25, value: 5.1 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50, value: 12 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100, value: 25 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250, value: 50 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500, value: 150 }
];

const TEMPLATES = [
  [[0,0,0,0,0],    1], //       0
  [[1,1,1,1,1],    1], //       1
  [[2,2,2,2,2],    1], // 100,  2
  [[3,2,2,2,2],    0], // 105,  3
  [[3,3,2,2,1],    0], // 100,  4 opens new levels
  [[3,3,3,3,1],    0], // 110,  5 some gold
  [[3,3,3,3,3],    1], // 125,  6
  [[3,3,3,3],      0], // 100,  7
  [[4,3,3,2],      0], // 100,  8
  [[4,3,3,3],      0], // 105,  9
  [[4,4,2,2],      0], // 100, 10
  [[4,4,3,3],      0], // 110, 11 a bit of gold
  [[4,4,4,1],      0], // 100, 12
  [[5,3,3],        0], // 100, 13
  [[5,4,2],        0], // 100, 14
  [[4,4,4,4,4],    1], // 150, 15 saves gold
  [[4,4,4,3],      0], // 115, 16 
  [[5,4,4,4],      0], // 140, 17 saves gold
  [[4,4,4,4],      0], // 120, 18
  [[5,4,4],        0], // 110, 19
  [[5,5,4],        0], // 130, 20 saves gold
  [[5,5,5,5,5],    1], // 250, 21
  [[5,5,5,5],      0], // 200, 22
  [[5,5,5],        0], // 150, 23 saves gold
  [[5,5],          1]  // 100, 24
];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
