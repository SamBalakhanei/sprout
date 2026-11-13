function cell(value: unknown): string {
  const text =
    typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  // Preserve values as text, rather than spreadsheet formulas.
  return `"${(/^[=+@\-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
}

export function csv(rows: Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    columns.map(cell).join(','),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(',')),
  ].join('\r\n');
}
