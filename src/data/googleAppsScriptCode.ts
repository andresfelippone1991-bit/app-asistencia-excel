export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * APP ASISTENCIA ESCOLAR - BACKEND GOOGLE APPS SCRIPT
 * =========================================================================
 * Este script permite a la App Web conectarse con cualquier Google Sheet
 * de asistencia para leer alumnos y guardar la fecha y asistencia del día.
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre https://script.google.com/ o en tu planilla ve a Extensiones > Apps Script.
 * 2. Borra cualquier código existente y pega TODO este archivo.
 * 3. Haz clic en "Implementar" (arriba a la derecha) > "Nueva implementación".
 * 4. Tipo: "Aplicación web".
 * 5. Ejecutar como: "Yo (tu correo)".
 * 6. Quién tiene acceso: "Cualquiera" (Anyone).
 * 7. Haz clic en "Implementar", autoriza los permisos y copia la URL generada.
 * 8. Pega esa URL en los Ajustes de la App de Asistencia.
 * =========================================================================
 */

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }
  } else if (e && e.parameter) {
    data = e.parameter;
  }
  return handleRequest(data);
}

function handleRequest(data) {
  var output = { status: "error", message: "Acción no reconocida" };

  try {
    var action = data.action || "test";

    if (action === "test") {
      output = testConnection(data);
    } else if (action === "getStudents") {
      output = getStudentsFromSheet(data);
    } else if (action === "saveAttendance") {
      output = saveAttendanceToSheet(data);
    } else if (action === "getHistory") {
      output = getAttendanceHistory(data);
    } else {
      output = { status: "error", message: "Acción desconocida: " + action };
    }
  } catch (error) {
    output = {
      status: "error",
      message: error.toString(),
      stack: error.stack
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

function extractSpreadsheetId(input) {
  if (!input) return "";
  var str = String(input).trim();
  // Match standard Google Sheet URL: /spreadsheets/d/([a-zA-Z0-9-_]+)
  var match = str.match(/\\/spreadsheets\\/d\\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return str;
}

function getSpreadsheet(data) {
  var id = extractSpreadsheetId(data.spreadsheetId || data.spreadsheetUrl);
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function columnLetterToIndex(letter) {
  letter = String(letter || "A").toUpperCase();
  var col = 0;
  for (var i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

function columnIndexToLetter(col) {
  var letter = "";
  while (col > 0) {
    var temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp) - 1) / 26;
  }
  return letter;
}

// -------------------------------------------------------------
// ACTION: TEST CONNECTION
// -------------------------------------------------------------

function testConnection(data) {
  var ss = getSpreadsheet(data);
  if (!ss) {
    throw new Error("No se pudo abrir la planilla de Google Sheets. Verifica el ID o URL y que tengas permisos.");
  }

  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  return {
    status: "success",
    message: "Conexión exitosa con Google Sheets",
    spreadsheetTitle: ss.getName(),
    sheets: sheets
  };
}

// -------------------------------------------------------------
// ACTION: GET STUDENTS
// -------------------------------------------------------------

function getStudentsFromSheet(data) {
  var ss = getSpreadsheet(data);
  if (!ss) throw new Error("Planilla no encontrada");

  var sheetName = data.sheetName || "Asistencia";
  var sheet = ss.getSheetByName(sheetName);

  // If not found, try finding active sheet or sheet named 'Alumnos'
  if (!sheet) {
    sheet = ss.getSheetByName("Alumnos") || ss.getSheets()[0];
  }

  var startRow = parseInt(data.startRow || 4, 10);
  var nameColLetter = data.nameColumn || "A";
  var nameCol = columnLetterToIndex(nameColLetter);
  var lastRow = sheet.getLastRow();

  if (lastRow < startRow) {
    return {
      status: "success",
      students: [],
      sheetName: sheet.getName(),
      message: "No se encontraron alumnos debajo de la fila " + startRow
    };
  }

  var numRows = lastRow - startRow + 1;
  var rangeValues = sheet.getRange(startRow, nameCol, numRows, 1).getValues();

  var students = [];
  for (var i = 0; i < rangeValues.length; i++) {
    var rawName = String(rangeValues[i][0] || "").trim();
    var currentRow = startRow + i;

    // Filter out obvious empty rows or section headers
    if (rawName && rawName !== "**" && !rawName.startsWith("---") && !rawName.toLowerCase().startsWith("total")) {
      students.push({
        id: "row_" + currentRow,
        row: currentRow,
        name: rawName
      });
    }
  }

  return {
    status: "success",
    students: students,
    sheetName: sheet.getName(),
    total: students.length
  };
}

// -------------------------------------------------------------
// ACTION: SAVE ATTENDANCE
// -------------------------------------------------------------

function saveAttendanceToSheet(data) {
  var ss = getSpreadsheet(data);
  if (!ss) throw new Error("Planilla no encontrada");

  var sheetName = data.sheetName || "Asistencia";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("No se encontró la hoja '" + sheetName + "'. Verifica el nombre de la pestaña.");

  var date = String(data.date || "").trim();
  if (!date) throw new Error("Fecha no especificada");

  var dateRow = parseInt(data.dateRow || 3, 10);
  var startColLetter = data.startColumn || "C";
  var startCol = columnLetterToIndex(startColLetter);
  var overwrite = data.overwrite !== false; // default true if matching date found

  var maxCols = sheet.getMaxColumns();
  var headerValues = sheet.getRange(dateRow, 1, 1, maxCols).getValues()[0];

  // 1. Search if this date already exists
  var targetCol = -1;
  if (overwrite) {
    for (var c = startCol - 1; c < headerValues.length; c++) {
      var cellVal = String(headerValues[c] || "").trim();
      if (cellVal === date || cellVal.indexOf(date) === 0) {
        targetCol = c + 1; // 1-based index
        break;
      }
    }
  }

  // 2. If not found, find the first available column (blank or containing "Fecha")
  if (targetCol === -1) {
    for (var c = startCol - 1; c < headerValues.length; c++) {
      var cellVal = String(headerValues[c] || "").trim().toLowerCase();
      if (cellVal === "" || cellVal === "fecha") {
        targetCol = c + 1;
        break;
      }
    }
  }

  // 3. If no available column in existing range, insert a new column at the end
  if (targetCol === -1) {
    sheet.insertColumnAfter(maxCols);
    targetCol = maxCols + 1;
  }

  // Write Date in Date Row
  var dateCell = sheet.getRange(dateRow, targetCol);
  dateCell.setValue(date);
  dateCell.setHorizontalAlignment("center");
  dateCell.setFontWeight("bold");

  // Write attendance for students
  // attendance format: array of { row: 4, status: 'P' } or object { "row_4": "P" } or { "4": "P" }
  var records = data.records || {};
  var attendanceArray = data.attendance || [];

  // Normalize attendance into map by row number
  var rowStatusMap = {};

  if (Array.isArray(attendanceArray)) {
    for (var a = 0; a < attendanceArray.length; a++) {
      var item = attendanceArray[a];
      var r = item.row || (item.id && parseInt(item.id.replace("row_", ""), 10));
      if (r) {
        rowStatusMap[r] = String(item.status || "").toUpperCase();
      }
    }
  }

  for (var key in records) {
    if (records.hasOwnProperty(key)) {
      var rowNum = parseInt(String(key).replace("row_", ""), 10);
      if (!isNaN(rowNum) && rowNum > 0) {
        rowStatusMap[rowNum] = String(records[key] || "").toUpperCase();
      }
    }
  }

  // Batch write or cell write
  var updatedCount = 0;
  for (var r in rowStatusMap) {
    if (rowStatusMap.hasOwnProperty(r)) {
      var row = parseInt(r, 10);
      var val = rowStatusMap[r];
      var cell = sheet.getRange(row, targetCol);
      cell.setValue(val);
      cell.setHorizontalAlignment("center");
      updatedCount++;
    }
  }

  var colLetter = columnIndexToLetter(targetCol);

  return {
    status: "success",
    message: "Asistencia guardada exitosamente en columna " + colLetter + " (Fila fecha: " + dateRow + ")",
    column: targetCol,
    columnLetter: colLetter,
    date: date,
    totalUpdated: updatedCount
  };
}

// -------------------------------------------------------------
// ACTION: GET ATTENDANCE HISTORY
// -------------------------------------------------------------

function getAttendanceHistory(data) {
  var ss = getSpreadsheet(data);
  if (!ss) throw new Error("Planilla no encontrada");

  var sheetName = data.sheetName || "Asistencia";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Hoja no encontrada");

  var dateRow = parseInt(data.dateRow || 3, 10);
  var startColLetter = data.startColumn || "C";
  var startCol = columnLetterToIndex(startColLetter);
  var maxCols = sheet.getLastColumn();

  if (maxCols < startCol) {
    return { status: "success", dates: [] };
  }

  var headerValues = sheet.getRange(dateRow, startCol, 1, maxCols - startCol + 1).getValues()[0];
  var recordedDates = [];

  for (var i = 0; i < headerValues.length; i++) {
    var val = String(headerValues[i] || "").trim();
    if (val && val.toLowerCase() !== "fecha") {
      recordedDates.push({
        date: val,
        column: startCol + i,
        columnLetter: columnIndexToLetter(startCol + i)
      });
    }
  }

  return {
    status: "success",
    dates: recordedDates
  };
}
`;
