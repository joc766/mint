"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { ColumnMapping, IMPORT_FIELDS, ImportFieldKey, validateRow } from "@/lib/csv-parser"

interface ImportPreviewProps {
  data: Record<string, unknown>[]
  mappings: ColumnMapping[]
  maxPreviewRows?: number
  expensesArePositive?: boolean
}

export function ImportPreview({
  data,
  mappings,
  maxPreviewRows = 10,
  expensesArePositive = false,
}: ImportPreviewProps) {
  // Get mapped fields in order
  const mappedFields = useMemo(() => {
    return mappings
      .filter(m => m.importField)
      .map(m => ({
        csvColumn: m.csvColumn,
        importField: m.importField as ImportFieldKey,
      }))
  }, [mappings])

  // Validate preview data
  const validationResults = useMemo(() => {
    return data.slice(0, maxPreviewRows).map((row, idx) => ({
      row,
      errors: validateRow(row, idx),
    }))
  }, [data, maxPreviewRows])

  const totalErrors = validationResults.reduce(
    (sum, r) => sum + r.errors.length,
    0
  )

  // Format cell value for display
  const formatValue = (value: unknown, field: ImportFieldKey): string => {
    if (value === null || value === undefined) return "—"
    
    if (field === "amount") {
      let num = Number(value)
      // Apply conversion if expenses are positive in the file
      if (expensesArePositive) {
        num = -num
      }
      return isNaN(num) ? String(value) : num.toFixed(2)
    }
    
    if (field === "pending") {
      return value ? "Yes" : "No"
    }
    
    if (field === "tags" && Array.isArray(value)) {
      return value.join(", ") || "—"
    }
    
    return String(value) || "—"
  }

  // Determine cell status
  const getCellStatus = (
    value: unknown,
    field: ImportFieldKey
  ): "valid" | "warning" | "error" => {
    const config = IMPORT_FIELDS[field]
    
    if (config.required) {
      if (value === null || value === undefined || value === "") {
        return "error"
      }
    }
    
    if (field === "date" && value) {
      const dateStr = String(value)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return "warning"
      }
    }
    
    return "valid"
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No data to preview</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Showing {Math.min(data.length, maxPreviewRows)} of {data.length} rows
              {expensesArePositive && (
                <span className="ml-2 text-amber-600">
                  (Amounts converted: positive → negative for expenses)
                </span>
              )}
            </CardDescription>
          </div>
          {totalErrors === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">All rows valid</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{totalErrors} issues found</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">
                  #
                </th>
                {mappedFields.map(({ importField }) => (
                  <th
                    key={importField}
                    className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[120px]"
                  >
                    {IMPORT_FIELDS[importField].label}
                    {IMPORT_FIELDS[importField].required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {validationResults.map((result, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`border-b border-border/50 ${
                    result.errors.length > 0 ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {rowIdx + 1}
                  </td>
                  {mappedFields.map(({ importField }) => {
                    const value = result.row[importField]
                    const status = getCellStatus(value, importField)
                    
                    return (
                      <td
                        key={importField}
                        className={`px-3 py-2 ${
                          status === "error"
                            ? "text-red-600 bg-red-500/10"
                            : status === "warning"
                            ? "text-amber-600 bg-amber-500/10"
                            : ""
                        }`}
                      >
                        <span className="truncate block max-w-[200px]" title={formatValue(value, importField)}>
                          {formatValue(value, importField)}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">
                    {result.errors.length === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">{result.errors.length}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length > maxPreviewRows && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            ... and {data.length - maxPreviewRows} more rows
          </div>
        )}

        {totalErrors > 0 && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700 font-medium mb-2">
              Validation Issues:
            </p>
            <ul className="text-sm text-amber-600 space-y-1">
              {validationResults.flatMap(r => r.errors).slice(0, 5).map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
              {validationResults.flatMap(r => r.errors).length > 5 && (
                <li className="text-muted-foreground">
                  ... and {validationResults.flatMap(r => r.errors).length - 5} more
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
