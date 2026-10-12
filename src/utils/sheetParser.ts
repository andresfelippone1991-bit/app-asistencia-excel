/**
 * Extracts Google Spreadsheet ID from either a full URL or an ID string.
 * Supports URLs like:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID (alphanumeric with hyphens/underscores, usually ~44 chars)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

export function buildGoogleSheetUrl(spreadsheetIdOrUrl: string): string {
  const id = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!id) return '';
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

/**
 * Validates whether the given URL looks like a valid Google Sheet or ID
 */
export function isValidGoogleSheetInput(input: string): boolean {
  if (!input) return false;
  const id = extractSpreadsheetId(input);
  return id.length >= 20;
}
