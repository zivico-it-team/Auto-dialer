import { describe, it, expect } from 'vitest';
import { parseLeadCsv } from '../src/utils/csvParser.js';

describe('CSV Parser Utility', () => {
  it('should parse valid CSV rows with names, phones, and emails', () => {
    const csv = `name,phone,email,notes
John Doe,+12025550143,john@example.com,Interested in demo
Jane Smith,2025550189,jane@example.com,Follow up`;

    const result = parseLeadCsv(csv);
    expect(result.validRows.length).toBe(2);
    expect(result.validRows[0].name).toBe('John Doe');
    expect(result.validRows[0].phone).toBe('+12025550143');
    expect(result.validRows[1].phone).toBe('2025550189');
    expect(result.invalidRows.length).toBe(0);
    expect(result.duplicatesCount).toBe(0);
  });

  it('should identify duplicate phone numbers in the batch', () => {
    const csv = `name,phone,email
Alice,+15550001111,alice@example.com
Bob,+15550001111,bob@example.com`;

    const result = parseLeadCsv(csv);
    expect(result.validRows.length).toBe(1);
    expect(result.duplicatesCount).toBe(1);
    expect(result.invalidRows.length).toBe(1);
  });

  it('should flag invalid phone numbers (< 7 digits)', () => {
    const csv = `name,phone,email
Shorty,1234,short@example.com
Valid Guy,+15550002222,valid@example.com`;

    const result = parseLeadCsv(csv);
    expect(result.validRows.length).toBe(1);
    expect(result.invalidRows.length).toBe(1);
    expect(result.invalidRows[0].reason).toContain('invalid phone number');
  });
});
