const TROOPS = [
    { shortName: "C", name: "Coin Purse", percent: 5, xp: 10, value: 0 },
    { shortName: "R", name: "Gold Ring", percent: 10, xp: 25, value: 100 },
    { shortName: "P", name: "Priest's Chalice", percent: 20, xp: 50, value: 1200 },
    { shortName: "K", name: "King's Crown", percent: 25, xp: 100, value: 2500 },
    { shortName: "G", name: "Genie' Lamp", percent: 30, xp: 250, value: 5000 },
    { shortName: "S", name: "Sacred Treasure", percent: 50, xp: 500, value: 15000 }
];

const TEMPLATES_QUICK = [0, 2, 4, 10, 12, 13, 14, 15, 18, 19, 22, 23, 25, 28, 29, 30, 34];
const TEMPLATES = [
[2,2,2,2,2], // 100, 0      0
[3,2,2,2,2], // 105, 1      1
[3,3,2,2,1], // 100, 2      2
[3,3,2,2,2], // 110, 3      3
[3,3,3,2,0], // 100,        4
[3,3,3,2,1], // 105, 4      5
[4,2,2,2,1], // 100, 7      6
[4,3,2,2,0], // 100,        7
[3,3,3,3,1], // 110, 8      8
[3,3,3,3,2], // 120, 10     9
[4,3,3,1,1], // 100, 12    10
[3,3,3,3,3], // 125, 14    11
[3,3,3,3], // 100, 6       12
[4,3,3,2], // 100, 15      13
[4,3,3,3], // 105, 18      14
[4,4,2,2], // 100, 22      15
[4,4,3,1,0], // 100,       16
[5,2,2,2], // 110, 30      17
[4,4,3,2], // 105, 31      18
[5,3,1,1,0], // 100,       19
[5,3,2,0], // 100,         20
[4,4,3,3], // 110, 40      21
[4,4,4,1], // 100, 50      22
[5,3,3], // 100, 41        23
[4,4,4,2], // 110, 56      24
[5,4,2], // 100, 57        25
[4,4,4,4,4], // 150, 116 x 26
[4,4,4,3], // 115, 66 x    27
[5,4,3], // 105, 67 x      28
[4,4,4,4], // 120, 82 x    29
[5,4,4], // 110, 83 x      30
[5,4,4,4], // 140, 117 x   31
[5,5,2], // 120, 93 x      32
[5,5,4], // 130, 118 x     33
[5,5], // 100, 84 x        34
];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function initTable(id, COLUMN_NAMES) {
  let table = document.getElementById(id);
  let thead = document.createElement('thead');
  COLUMN_NAMES.forEach(function (columnName, i) {
    let th = document.createElement('th');
    th.textContent = columnName;
    thead.appendChild(th);
  });
  table.appendChild(thead);
  let tbody = document.createElement('tbody');
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
