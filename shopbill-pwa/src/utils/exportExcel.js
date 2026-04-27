import { utils, writeFile } from 'xlsx';

export const exportRowsToExcel = (rows, fileName = 'report.xlsx', sheetName = 'Report') => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const worksheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};

