/**
 * Utility to convert array of JSON records into RFC 4180 compliant CSV string
 */
export function jsonToCsv(data: Record<string, any>[], headers?: { key: string; label: string }[]): string {
  if (!data || data.length === 0) {
    return headers ? headers.map(h => `"${h.label}"`).join(',') + '\r\n' : '';
  }

  const columns = headers || Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const headerRow = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');

  const rows = data.map(row => {
    return columns
      .map(col => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}
