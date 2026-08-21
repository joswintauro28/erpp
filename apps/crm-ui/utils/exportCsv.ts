import { toastWarning } from "@/utils/toast";

export const exportToCSV = (dataArray, filename) => {
  if (!dataArray || !dataArray.length) {
    toastWarning("No data available to export.");
    return;
  }
  
  // Extract keys as headers
  const headers = Object.keys(dataArray[0]);
  
  // Create CSV rows
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of dataArray) {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
