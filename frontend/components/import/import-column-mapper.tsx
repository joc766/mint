"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { ColumnMapping, IMPORT_FIELDS, ImportFieldKey } from "@/lib/csv-parser"

// Simple Badge component
function Badge({ 
  children, 
  variant = "default", 
  className = "" 
}: { 
  children: React.ReactNode
  variant?: "default" | "secondary" | "destructive" | "outline"
  className?: string 
}) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border bg-transparent",
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

interface ImportColumnMapperProps {
  mappings: ColumnMapping[]
  onMappingChange: (index: number, importField: string | null) => void
}

export function ImportColumnMapper({
  mappings,
  onMappingChange,
}: ImportColumnMapperProps) {
  // Check which required fields are mapped
  const mappingStatus = useMemo(() => {
    const mappedFields = new Set(mappings.map(m => m.importField).filter(Boolean))
    const requiredFields = Object.entries(IMPORT_FIELDS)
      .filter(([, config]) => config.required)
      .map(([key]) => key)
    
    const missingRequired = requiredFields.filter(f => !mappedFields.has(f))
    const allRequiredMapped = missingRequired.length === 0
    
    return { mappedFields, missingRequired, allRequiredMapped }
  }, [mappings])

  // Get available fields for dropdown (exclude already mapped fields)
  const getAvailableFields = (currentMapping: string | null) => {
    const usedFields = new Set(
      mappings
        .map(m => m.importField)
        .filter(f => f && f !== currentMapping)
    )
    
    return Object.entries(IMPORT_FIELDS).filter(
      ([key]) => !usedFields.has(key)
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>
              Map your CSV columns to the import fields
            </CardDescription>
          </div>
          {mappingStatus.allRequiredMapped ? (
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready to import
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-500/20 text-red-600 border-red-500/30">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing required fields
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mappingStatus.missingRequired.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-600 font-medium mb-2">
              Missing required mappings:
            </p>
            <div className="flex flex-wrap gap-2">
              {mappingStatus.missingRequired.map(field => (
                <Badge key={field} variant="outline" className="text-red-600 border-red-500/30">
                  {IMPORT_FIELDS[field as ImportFieldKey].label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappings.map((mapping, index) => {
            const availableFields = getAvailableFields(mapping.importField)
            const currentFieldConfig = mapping.importField 
              ? IMPORT_FIELDS[mapping.importField as ImportFieldKey] 
              : null
            
            return (
              <div
                key={mapping.csvColumn}
                className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <Label className="font-medium truncate" title={mapping.csvColumn}>
                    {mapping.csvColumn}
                  </Label>
                  {currentFieldConfig?.required && (
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/30">
                      Required
                    </Badge>
                  )}
                </div>
                <Select
                  value={mapping.importField || "unmapped"}
                  onValueChange={(value) =>
                    onMappingChange(index, value === "unmapped" ? null : value)
                  }
                >
                  <SelectTrigger className={mapping.importField ? "border-emerald-500/50" : ""}>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped">
                      <span className="text-muted-foreground">— Don&apos;t import —</span>
                    </SelectItem>
                    {availableFields.map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                        {config.required && (
                          <span className="ml-2 text-xs text-amber-600">(required)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mapping.importField && currentFieldConfig && (
                  <p className="text-xs text-muted-foreground">
                    {currentFieldConfig.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Make sure to map at least{" "}
            <strong>Amount</strong>, <strong>Date</strong>, and <strong>Name</strong> to proceed.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
