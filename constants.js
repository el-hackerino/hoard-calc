/* eslint-disable no-unused-vars */
const TROOPS = [
  { shortName: "C", name: "Coin Purse", percent: 5, xp: 10, value: 0 },
  { shortName: "R", name: "Gold Ring", percent: 10, xp: 25, value: 100 },
  { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50, value: 1200 },
  { shortName: "K", name: "King's Crown", percent: 25, xp: 100, value: 2500 },
  { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250, value: 5000 },
  { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500, value: 15000 }
];
const TEMPLATES2 = [
  [[2,2,2,2,2],  1], // 100, 0
  [[3,2,2,2,2], 0 ], // 105, 1  x
  [[3,3,2,2,1], 0 ], // 100, 2  x
  [[3,3,2,2,2], 0 ], // 110, 3  x
  [[3,3,3,2,0], 0 ], // 100, 4  x
  [[3,3,3,2,1], 0 ], // 105, 5  x
  [[4,2,2,2,1], 0 ], // 100, 6  x
  [[4,3,2,2,0], 0 ], // 100, 7  x
  [[3,3,3,3,1], 0 ], // 110, 8
  [[3,3,3,3,2], 0 ], // 120, 9  x
  [[4,3,3,1,1], 0 ], // 100, 10 x
  [[3,3,3,3,3],  1], // 125, 11   ooo lower
  [[3,3,3,3],    1], // 100, 12
  [[4,3,3,2],    1], // 100, 13
  [[4,3,3,3],    1], // 105, 14
  [[4,4,2,2],    1], // 100, 15
  [[4,4,3,1,0], 0 ], // 100, 16 x
  [[5,2,2,2],   0 ], // 110, 17 x
  [[4,4,3,2],    1], // 105, 18
  [[5,3,1,1,0], 0 ], // 100, 19 x
  [[5,3,2,0],   0 ], // 100, 20 x
  [[4,4,3,3],    1], // 110, 21
  [[4,4,4,1],    1], // 100, 22
  [[5,3,3],      1], // 100, 23   ooo higher
  [[4,4,4,2],    1], // 110, 24
  [[5,4,2],      1], // 100, 25   ooo higher
  [[4,4,4,4,4],  1], // 150, 26
  [[4,4,4,3],    1], // 115, 27
  [[5,4,3],      1], // 105, 28
  [[4,4,4,4],    1], // 120, 29
  [[5,4,4],      1], // 110, 30
  [[5,4,4,4],   0 ], // 140, 31
  [[5,5,2],     0 ], // 120, 32 x
  [[5,5,4],     0 ], // 130, 33 x
  [[5,5],        1], // 100, 34
];

const TEMPLATES = [
  [[2,2,2,2,2],    1], // 100, 0 D
  [[3,2,2,2,2],    1], // 105, 1
  [[3,3,2,2,1],    1], // 100, 2 opens new levels
  [[3,3,3,3,1],    1], // 110, 3
  [[4,3,3,1,1],    0], // 100, 10 test
  [[3,3,3,3,3],    1], // 125, 4 D ooo up
  [[3,3,3,3],      1], // 100, 5 D
  [[4,3,3,2],      1], // 100, 6 D
  [[4,3,3,3],      1], // 105, 7 D
  [[4,4,2,2],      1], // 100, 8 D
  [[4,4,3,2],      0], // 105, 9 
  [[4,4,3,3],      1], // 110, 10 D
  [[4,4,4,1],      1], // 100, 11 D
  [[5,3,3],        1], // 100, 12 D ooo down
  [[5,4,2],        1], // 100, 13 D ooo down
  [[4,4,4,4,4],    1], // 150, 14 D
  [[4,4,4,3],      0], // 115, 15 
  [[5,4,3],        1], // 105, 16 D ooo down
  [[5,4,4,4],      1], // 140, 17 saves gold
  [[4,4,4,4],      1], // 120, 18 D
  [[5,4,4],        1], // 110, 19 D
  [[5,5,4],        1], // 130, 20 saves gold
  [[5,5,5],        1], // 150, 21 saves gold
  [[5,5],          1]  // 100, 22 D
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
