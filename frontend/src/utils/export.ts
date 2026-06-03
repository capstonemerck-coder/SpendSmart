/**
 * export.ts
 *
 * Utility functions for exporting data to CSV format.
 * Used by DrawerDataset and other components that need to download tabular data.
 */

/**
 * Export an array of rows to a CSV file and trigger browser download.
 *
 * @param {Array<Record<string, any>>} rows - Array of objects to export.
 * @param {string} filename - Name of the file (without .csv extension).
 */
export const exportToCSV = (rows: Array<Record<string, any>>, filename: string): void => {
  if (!rows.length) {
    console.warn('No data to export.');
    return;
  }

  // Extract headers from first row
  const headers = Object.keys(rows[0]);

  // Build CSV content: header row + data rows
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','), // Header row with quoted strings
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h];
          // Quote and escape values
          if (value === null || value === undefined) {
            return '';
          }
          const str = String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
