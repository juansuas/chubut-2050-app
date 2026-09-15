export function downloadCSV(filename, headers, rows) {
  const escape = value => `"${String(value ?? '').replaceAll('"','""')}"`;
  const csv = '\ufeff' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href:url, download:filename });
  link.click(); URL.revokeObjectURL(url);
}

export function printReport() { window.print(); }
