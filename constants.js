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
  [[2,2,2,2,2],  1], // 100, 0
  [[3,2,2,2,2], 0], // 105, 1x
  [[3,3,2,2,1], 0], // 100, 2x
  [[3,3,2,2,2], 0], // 110, 3x
  [[3,3,3,2,0], 0], // 100, 4x
  [[3,3,3,2,1], 0], // 105, 5x
  [[4,2,2,2,1], 0], // 100, 6x
  [[4,3,2,2,0], 0], // 100, 7x
  [[3,3,3,3,1], 0], // 110, 8
  [[3,3,3,3,2], 0], // 120, 9x
  [[4,3,3,1,1], 0], // 100, 10x
  [[3,3,3,3,3],  1], // 125, 11
  [[3,3,3,3],    1], // 100, 12
  [[4,3,3,2],    1], // 100, 13
  [[4,3,3,3],    1], // 105, 14
  [[4,4,2,2],    1], // 100, 15
  [[4,4,3,1,0], 0], // 100, 16x
  [[5,2,2,2],   0], // 110, 17x
  [[4,4,3,2],    1], // 105, 18
  [[5,3,1,1,0], 0], // 100, 19x
  [[5,3,2,0],   0], // 100, 20x
  [[4,4,3,3],    1], // 110, 21
  [[4,4,4,1],    1], // 100, 22
  [[5,3,3],      1], // 100, 23
  [[4,4,4,2],    1], // 110, 24
  [[5,4,2],      1], // 100, 25
  [[4,4,4,4,4], 0], // 150, 26
  [[4,4,4,3],    1], // 115, 27
  [[5,4,3],      1], // 105, 28
  [[4,4,4,4],    1], // 120, 29
  [[5,4,4],      1], // 110, 30
  [[5,4,4,4],   0], // 140, 31
  [[5,5,2],     0], // 120, 32x
  [[5,5,4],     0], // 130, 33x
  [[5,5],        1], // 100, 34
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
