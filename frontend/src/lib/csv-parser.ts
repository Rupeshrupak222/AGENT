/**
 * Enterprise RFC 4180 Compliant CSV Parser & Validator
 * Designed for lead ingestion in Adyapan AI / AgentCall AI.
 */

export interface CsvColumnMapping {
  nameCol: string;
  phoneCol: string;
  emailCol?: string;
  companyCol?: string;
}

export interface ParsedCsvRow {
  rowNumber: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  fileName: string;
  fileSizeBytes: number;
  totalRowsDetected: number;
  headers: string[];
  detectedMapping: CsvColumnMapping;
  rows: ParsedCsvRow[];
  validRows: ParsedCsvRow[];
  invalidRows: ParsedCsvRow[];
  duplicateCountInFile: number;
  previewSample: Record<string, string>[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROW_COUNT = 5000;
const MAX_COLUMN_COUNT = 50;

/**
 * Formula injection defense: neutralizes spreadsheet command characters
 */
export function sanitizeCsvCell(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Phone validator: E.164 compliant with minimum 7 digits
 */
export function isValidPhoneFormat(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 16;
}

/**
 * India-first default country code used when a 10-digit number is supplied
 * without an explicit country code prefix.
 */
export const DEFAULT_COUNTRY_CODE = "+91";
export const DEFAULT_COUNTRY_CODE_LENGTH = 10;

/**
 * Normalizes phone number with optional leading +
 * Local 10-digit numbers are prefixed with the India-first default code.
 */
export function normalizePhone(raw: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) {
    return `+${digits.slice(1).replace(/\+/g, "")}`;
  }
  // If 10 digits without country code, default to E.164 +91 (India-first)
  return digits.length === DEFAULT_COUNTRY_CODE_LENGTH ? `${countryCode}${digits}` : `+${digits}`;
}

/**
 * Basic email validator
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * RFC 4180 Split Line parser that honors quotes and escaped quotes
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((c) => sanitizeCsvCell(c));
}

/**
 * Auto-detect column mapping from CSV header names
 */
export function autoDetectMapping(headers: string[]): CsvColumnMapping {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const findHeader = (candidates: string[]): string => {
    for (const c of candidates) {
      const idx = normalized.findIndex((h) => h === c || h.includes(c));
      if (idx !== -1) return headers[idx];
    }
    return "";
  };

  const nameCol = findHeader(["name", "fullname", "contactname", "leadname", "lead", "contact"]) || headers[0] || "";
  const phoneCol = findHeader(["phone", "mobile", "tel", "phonenumber", "mobilenumber", "cell", "contactno"]) || headers[1] || "";
  const emailCol = findHeader(["email", "mail", "emailaddress"]) || undefined;
  const companyCol = findHeader(["company", "organization", "org", "business", "companyname"]) || undefined;

  return {
    nameCol,
    phoneCol,
    emailCol: emailCol || undefined,
    companyCol: companyCol || undefined,
  };
}

/**
 * Main CSV text parsing function
 */
export function parseCsvContent(
  content: string,
  fileName: string,
  customMapping?: Partial<CsvColumnMapping>
): CsvParseResult {
  // 1. Strip UTF-8 BOM if present
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  // 2. Validate file size limits
  const fileSizeBytes = new Blob([cleanContent]).size;
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`CSV file exceeds maximum allowed size of 5 MB (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)`);
  }

  // 3. Normalize CRLF and LF lines
  const lines = cleanContent
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must contain at least a header row and one data row.");
  }

  if (lines.length - 1 > MAX_ROW_COUNT) {
    throw new Error(`CSV contains ${lines.length - 1} rows. Maximum allowed is ${MAX_ROW_COUNT} rows.`);
  }

  // 4. Parse Header Row
  const rawHeaders = parseCsvLine(lines[0]);
  if (rawHeaders.length > MAX_COLUMN_COUNT) {
    throw new Error(`CSV contains ${rawHeaders.length} columns. Maximum allowed is ${MAX_COLUMN_COUNT} columns.`);
  }

  const headers = rawHeaders.map((h, i) => h.trim() || `Column_${i + 1}`);

  // 5. Determine Column Mapping
  const autoMap = autoDetectMapping(headers);
  const mapping: CsvColumnMapping = {
    nameCol: customMapping?.nameCol || autoMap.nameCol,
    phoneCol: customMapping?.phoneCol || autoMap.phoneCol,
    emailCol: customMapping?.emailCol ?? autoMap.emailCol,
    companyCol: customMapping?.companyCol ?? autoMap.companyCol,
  };

  const nameIdx = headers.indexOf(mapping.nameCol);
  const phoneIdx = headers.indexOf(mapping.phoneCol);
  const emailIdx = mapping.emailCol ? headers.indexOf(mapping.emailCol) : -1;
  const companyIdx = mapping.companyCol ? headers.indexOf(mapping.companyCol) : -1;

  const rows: ParsedCsvRow[] = [];
  const previewSample: Record<string, string>[] = [];
  const seenPhones = new Set<string>();
  let duplicateCountInFile = 0;

  // 6. Parse & Validate Data Rows
  for (let i = 1; i < lines.length; i++) {
    const rawCells = parseCsvLine(lines[i]);
    const errors: string[] = [];

    const name = (nameIdx >= 0 && rawCells[nameIdx] ? rawCells[nameIdx].trim() : "");
    const rawPhone = (phoneIdx >= 0 && rawCells[phoneIdx] ? rawCells[phoneIdx].trim() : "");
    const email = (emailIdx >= 0 && rawCells[emailIdx] ? rawCells[emailIdx].trim() : undefined);
    const company = (companyIdx >= 0 && rawCells[companyIdx] ? rawCells[companyIdx].trim() : undefined);

    // Validate Name
    if (!name) {
      errors.push("Missing name");
    }

    // Validate Phone
    let normalizedPhone = "";
    if (!rawPhone) {
      errors.push("Missing phone number");
    } else if (!isValidPhoneFormat(rawPhone)) {
      errors.push("Invalid phone format (min 7 digits required)");
    } else {
      normalizedPhone = normalizePhone(rawPhone);
      if (seenPhones.has(normalizedPhone)) {
        duplicateCountInFile++;
        errors.push("Duplicate phone number in file");
      } else {
        seenPhones.add(normalizedPhone);
      }
    }

    // Validate Email if provided
    if (email && !isValidEmailFormat(email)) {
      errors.push("Invalid email format");
    }

    const rowObj: ParsedCsvRow = {
      rowNumber: i,
      name,
      phone: normalizedPhone || rawPhone,
      email: email || undefined,
      company: company || undefined,
      isValid: errors.length === 0,
      errors,
    };

    rows.push(rowObj);

    // Collect first 5 sample rows for preview
    if (previewSample.length < 5) {
      const sampleItem: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        sampleItem[h] = rawCells[colIdx] || "";
      });
      previewSample.push(sampleItem);
    }
  }

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  return {
    fileName,
    fileSizeBytes,
    totalRowsDetected: rows.length,
    headers,
    detectedMapping: mapping,
    rows,
    validRows,
    invalidRows,
    duplicateCountInFile,
    previewSample,
  };
}
