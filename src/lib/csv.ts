/**
 * RFC 4180 Compliant CSV Parser & Serializer for SmartVyapar
 * Zero external dependencies, edge/browser compatible, handles quotes & commas
 */

export interface ParsedCsvRow {
  [header: string]: string;
}

/**
 * Parse a raw CSV string into an array of object records using the header line.
 */
export function parseCsv(csvText: string): ParsedCsvRow[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = splitCsvLines(csvText.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^[\uFEFF]/, ''));
  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const values = parseCsvLine(rawLine);
    const rowObj: ParsedCsvRow = {};

    headers.forEach((header, colIdx) => {
      rowObj[header] = (values[colIdx] || '').trim();
    });

    rows.push(rowObj);
  }

  return rows;
}

/**
 * Splits CSV into lines while respecting quoted multi-line fields.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++; // skip \n in CRLF
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Parses a single CSV line into tokens, handling quoted commas and double quotes.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  values.push(currentValue);
  return values;
}

/**
 * Converts an array of objects into a properly escaped CSV string.
 */
export function generateCsv(headers: { key: string; label: string }[], data: Record<string, any>[]): string {
  const headerLine = headers.map((h) => escapeCsvField(h.label)).join(',');
  const rowLines = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        return escapeCsvField(val !== undefined && val !== null ? String(val) : '');
      })
      .join(',')
  );

  return [headerLine, ...rowLines].join('\r\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
