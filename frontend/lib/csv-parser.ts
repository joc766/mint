/**
 * CSV Parser Utility
 * 
 * Parses CSV files and provides column detection and mapping functionality.
 */

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  rawRows: string[][]
}

export interface ColumnMapping {
  csvColumn: string
  importField: string | null
}

// Expected fields for mass import
export const IMPORT_FIELDS = {
  // Required fields
  amount: { label: "Amount", required: true, description: "Transaction amount" },
  date: { label: "Date", required: true, description: "Transaction date (YYYY-MM-DD)" },
  name: { label: "Name", required: true, description: "Transaction name/description" },
  
  // Optional fields
  merchant_name: { label: "Merchant Name", required: false, description: "Merchant or payee name" },
  account_name: { label: "Account Name", required: false, description: "Account to associate transaction with" },
  account_type: { label: "Account Type", required: false, description: "Type of account (e.g., checking, credit)" },
  account_subtype: { label: "Account Subtype", required: false, description: "Subtype of account" },
  plaid_transaction_id: { label: "Transaction ID", required: false, description: "Unique transaction identifier" },
  iso_currency_code: { label: "Currency Code", required: false, description: "ISO currency code (e.g., USD)" },
  pending: { label: "Pending", required: false, description: "Whether transaction is pending" },
  transaction_type: { label: "Transaction Type", required: false, description: "Type of transaction" },
  category_name: { label: "Category", required: false, description: "Category name for categorization" },
  subcategory_name: { label: "Subcategory", required: false, description: "Subcategory name for categorization" },
  notes: { label: "Notes", required: false, description: "Additional notes" },
  tags: { label: "Tags", required: false, description: "Comma-separated tags" },
} as const

export type ImportFieldKey = keyof typeof IMPORT_FIELDS

/**
 * Parse a CSV string into structured data
 */
export function parseCSV(csvContent: string): ParsedCSV {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim())
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] }
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const rawRows: string[][] = []
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    rawRows.push(values)
    
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ""
    })
    rows.push(row)
  }
  
  return { headers, rows, rawRows }
}

/**
 * Parse a single CSV line, handling quoted values and commas within quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // End of quoted section
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  
  // Common aliases for fields
  const fieldAliases: Record<ImportFieldKey, string[]> = {
    amount: ["amount", "value", "total", "price", "sum"],
    date: ["date", "transaction date", "trans date", "posted date", "posting date"],
    name: ["name", "description", "memo", "transaction", "details"],
    merchant_name: ["merchant", "merchant name", "payee", "vendor"],
    account_name: ["account", "account name", "account_name"],
    account_type: ["account type", "account_type", "type"],
    account_subtype: ["account subtype", "account_subtype", "subtype"],
    plaid_transaction_id: ["transaction id", "transaction_id", "id", "plaid_transaction_id"],
    iso_currency_code: ["currency", "currency code", "iso_currency_code"],
    pending: ["pending", "is pending", "status"],
    transaction_type: ["transaction type", "transaction_type", "trans type"],
    category_name: ["category", "category name", "category_name"],
    subcategory_name: ["subcategory", "subcategory name", "subcategory_name", "sub category"],
    notes: ["notes", "note", "comment", "comments"],
    tags: ["tags", "tag", "labels"],
  }
  
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim()
    let matchedField: ImportFieldKey | null = null
    
    // Try to find a matching field
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      if (aliases.some(alias => headerLower === alias || headerLower.includes(alias))) {
        matchedField = field as ImportFieldKey
        break
      }
    }
    
    mappings.push({
      csvColumn: header,
      importField: matchedField,
    })
  }
  
  return mappings
}

/**
 * Apply column mappings to parsed CSV data
 */
export function applyMappings(
  parsedCSV: ParsedCSV,
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  const mappingMap = new Map<string, string | null>()
  for (const mapping of mappings) {
    if (mapping.importField) {
      mappingMap.set(mapping.csvColumn, mapping.importField)
    }
  }
  
  return parsedCSV.rows.map(row => {
    const mappedRow: Record<string, unknown> = {}
    
    for (const [csvColumn, importField] of mappingMap) {
      if (importField && row[csvColumn] !== undefined) {
        let value: unknown = row[csvColumn]
        
        // Type conversion based on field
        if (importField === "amount") {
          // Parse amount, removing currency symbols and commas
          const cleanedAmount = String(value).replace(/[^0-9.-]/g, "")
          value = parseFloat(cleanedAmount) || 0
        } else if (importField === "pending") {
          // Convert to boolean
          const lower = String(value).toLowerCase()
          value = lower === "true" || lower === "yes" || lower === "1"
        } else if (importField === "tags") {
          // Split comma-separated tags
          value = String(value).split(",").map(t => t.trim()).filter(t => t)
        } else if (importField === "date") {
          // Try to normalize date format
          value = normalizeDate(String(value))
        }
        
        mappedRow[importField] = value
      }
    }
    
    return mappedRow
  })
}

/**
 * Normalize date to ISO format (YYYY-MM-DD)
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return ""
  
  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  
  // Try DD/MM/YYYY format (less common in US)
  const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  
  // Try to parse with Date object as fallback
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]
    }
  } catch {
    // Ignore parsing errors
  }
  
  return dateStr
}

/**
 * Validate that required fields are mapped
 */
export function validateMappings(mappings: ColumnMapping[]): string[] {
  const errors: string[] = []
  const mappedFields = new Set(mappings.map(m => m.importField).filter(Boolean))
  
  for (const [field, config] of Object.entries(IMPORT_FIELDS)) {
    if (config.required && !mappedFields.has(field)) {
      errors.push(`Required field "${config.label}" is not mapped`)
    }
  }
  
  return errors
}

/**
 * Validate row data before import
 */
export function validateRow(row: Record<string, unknown>, rowIndex: number): string[] {
  const errors: string[] = []
  
  // Check required fields
  if (!row.amount && row.amount !== 0) {
    errors.push(`Row ${rowIndex + 1}: Missing amount`)
  }
  
  if (!row.date) {
    errors.push(`Row ${rowIndex + 1}: Missing date`)
  } else {
    // Validate date format
    const dateStr = String(row.date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      errors.push(`Row ${rowIndex + 1}: Invalid date format "${dateStr}" (expected YYYY-MM-DD)`)
    }
  }
  
  if (!row.name) {
    errors.push(`Row ${rowIndex + 1}: Missing name/description`)
  }
  
  return errors
}

/**
 * Read a file and return its contents as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = Object.keys(IMPORT_FIELDS).join(",")
  const sampleRow = [
    "-50.00",           // amount (negative for expense)
    "2024-01-15",       // date
    "Coffee Shop",      // name
    "Starbucks",        // merchant_name
    "Checking Account", // account_name
    "checking",         // account_type
    "",                 // account_subtype
    "",                 // plaid_transaction_id
    "USD",              // iso_currency_code
    "false",            // pending
    "debit",            // transaction_type
    "Food & Drink",     // category_name
    "Coffee Shops",     // subcategory_name
    "Morning coffee",   // notes
    "coffee,daily",     // tags
  ].join(",")
  
  return `${headers}\n${sampleRow}`
}
