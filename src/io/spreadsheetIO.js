/**
 * Spreadsheet I/O
 * File read/write operations for xlsx spreadsheets using ExcelJS.
 */

import ExcelJS from 'exceljs';
import { buildWorkbook } from '../generators/spreadsheetGenerator.js';

/**
 * Read an xlsx file and return sheet data as plain objects.
 * Each sheet is an array of row objects keyed by header names.
 *
 * @param {string} filePath - Path to .xlsx file
 * @returns {Promise<object>} - Object keyed by sheet name, each value is array of row objects
 */
export async function readSpreadsheet(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheets = {};

  workbook.eachSheet((worksheet) => {
    const rows = [];
    const headers = [];

    // First row is headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? String(cell.value).trim() : `Column${colNumber}`;
    });

    // Skip header row, read data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const value = cell.value;
          // Handle ExcelJS rich text and hyperlink objects
          if (value !== null && value !== undefined && value !== '') {
            rowData[header] = typeof value === 'object' && value.result !== undefined
              ? value.result
              : value;
            hasData = true;
          }
        }
      });

      if (hasData) {
        // Fill in missing headers with empty strings
        for (const h of headers) {
          if (h && !(h in rowData)) {
            rowData[h] = '';
          }
        }
        rows.push(rowData);
      }
    });

    sheets[worksheet.name] = rows;
  });

  return sheets;
}

/**
 * Write project data to an xlsx file.
 *
 * @param {string} filePath - Output file path
 * @param {object} project - Project object with entities
 * @returns {Promise<void>}
 */
export async function writeSpreadsheet(filePath, project) {
  const workbook = buildWorkbook(ExcelJS, project);
  await workbook.xlsx.writeFile(filePath);
}
