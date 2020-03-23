/* eslint-disable no-unused-vars */
const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10, value: 0 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25, value: 100 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50, value: 1200 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100, value: 2500 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250, value: 5000 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500, value: 15000 }
];

const TEMPLATES = [
  [[2,2,2,2,2],    1], // 100,  0
  [[3,2,2,2,2],    1], // 105,  1
  [[3,3,2,2,1],    1], // 100,  2 opens new levels
  [[3,3,3,3,1],    1], // 110,  3 some gold
  [[3,3,3,3,3],    1], // 125,  4
  [[3,3,3,3],      1], // 100,  5
  [[4,3,3,2],      1], // 100,  6
  [[4,3,3,3],      1], // 105,  7
  [[4,4,2,2],      1], // 100,  8
  [[4,4,3,3],      1], // 110,  9 a bit of gold
  [[4,4,4,1],      1], // 100, 10
  [[5,3,3],        1], // 100, 11
  [[5,4,2],        1], // 100, 12
  [[4,4,4,4,4],    1], // 150, 13 saves gold
  [[4,4,4,3],      1], // 115, 14 
  [[5,4,4,4],      1], // 140, 15 saves gold
  [[4,4,4,4],      1], // 120, 16
  [[5,4,4],        1], // 110, 17
  [[5,5,4],        1], // 130, 18 saves gold
  [[5,5,5],        1], // 150, 19 saves gold
  [[5,5],          1]  // 100, 20
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
  return tbody;
}

function clearTable(id) {
  const table = document.getElementById(id);
  if (table.hasChildNodes()) {
    table.removeChild(table.lastChild);
  }
  return table;
}
