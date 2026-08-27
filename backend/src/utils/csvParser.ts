export interface ParsedCsvRow {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface CsvParseResult {
  validRows: ParsedCsvRow[];
  invalidRows: { row: number; data: any; reason: string }[];
  duplicatesCount: number;
}

export function parseLeadCsv(csvContent: string): CsvParseResult {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { validRows: [], invalidRows: [], duplicatesCount: 0 };
  }

  // Parse header line
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  const nameIdx = headers.findIndex((h) => h.includes('name') || h === 'full_name' || h === 'fullname');
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('tel') || h.includes('mobile') || h === 'number');
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('comment') || h.includes('desc'));

  const validRows: ParsedCsvRow[] = [];
  const invalidRows: { row: number; data: any; reason: string }[] = [];
  const seenPhones = new Set<string>();
  let duplicatesCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV splitter handling quoted values
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^["']|["']$/g, ''));

    const name = nameIdx !== -1 && values[nameIdx] ? values[nameIdx] : `Lead #${i}`;
    const rawPhone = phoneIdx !== -1 && values[phoneIdx] ? values[phoneIdx] : values[0] || '';
    const email = emailIdx !== -1 && values[emailIdx] ? values[emailIdx] : undefined;
    const notes = notesIdx !== -1 && values[notesIdx] ? values[notesIdx] : undefined;

    // Clean phone
    const cleanedPhone = rawPhone.replace(/[\s\-\.\(\)]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 7) {
      invalidRows.push({
        row: i + 1,
        data: values,
        reason: 'Missing or invalid phone number (less than 7 digits)',
      });
      continue;
    }

    if (seenPhones.has(cleanedPhone)) {
      duplicatesCount++;
      invalidRows.push({
        row: i + 1,
        data: values,
        reason: `Duplicate phone number in batch: ${cleanedPhone}`,
      });
      continue;
    }

    seenPhones.add(cleanedPhone);

    // Collect any unmapped columns as customFields
    const customFields: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (idx !== nameIdx && idx !== phoneIdx && idx !== emailIdx && idx !== notesIdx && values[idx]) {
        customFields[h] = values[idx];
      }
    });

    validRows.push({
      name,
      phone: cleanedPhone,
      email,
      notes,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return { validRows, invalidRows, duplicatesCount };
}
