import { utils, writeFile } from 'xlsx';

export const exportRowsToExcel = (rows, fileName = 'report.xlsx', sheetName = 'Report') => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const normalizedName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const isAndroid = /android/i.test(window?.navigator?.userAgent || '');

  // Android WebView/PWA downloads can fail for xlsx blobs; provide CSV fallback.
  if (isAndroid) {
    const csvName = normalizedName.replace(/\.xlsx$/i, '.csv');
    const csv = rows
      .map((row) =>
        (Array.isArray(row) ? row : []).map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        }).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return;
  }

  const worksheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, normalizedName);
};

