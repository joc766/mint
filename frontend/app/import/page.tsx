"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ImportFileUpload } from "@/components/import/import-file-upload"
import { ImportColumnMapper } from "@/components/import/import-column-mapper"
import { ImportPreview } from "@/components/import/import-preview"
import { ImportResultsDialog } from "@/components/import/import-results-dialog"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import {
  parseCSV,
  autoDetectMappings,
  applyMappings,
  validateMappings,
  readFileAsText,
  ColumnMapping,
  ParsedCSV,
  IMPORT_FIELDS,
} from "@/lib/csv-parser"
import type { MassImportResponse, MassImportTransactionRow } from "@/lib/types"
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Upload,
  AlertCircle,
  Info,
} from "lucide-react"

type ImportStep = "upload" | "mapping" | "preview" | "importing"

export default function ImportPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  // State
  const [step, setStep] = useState<ImportStep>("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [mappedData, setMappedData] = useState<Record<string, unknown>[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<MassImportResponse | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      const content = await readFileAsText(file)
      const parsed = parseCSV(content)
      
      if (parsed.headers.length === 0) {
        toast({
          title: "Error",
          description: "The CSV file appears to be empty or invalid",
          variant: "destructive",
        })
        return
      }
      
      if (parsed.rows.length === 0) {
        toast({
          title: "Error",
          description: "The CSV file has headers but no data rows",
          variant: "destructive",
        })
        return
      }
      
      setSelectedFile(file)
      setParsedCSV(parsed)
      
      // Auto-detect mappings
      const detectedMappings = autoDetectMappings(parsed.headers)
      setMappings(detectedMappings)
      
      // Move to mapping step
      setStep("mapping")
      
      toast({
        title: "File Loaded",
        description: `Found ${parsed.rows.length} transactions to import`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to read the CSV file",
        variant: "destructive",
      })
    }
  }, [toast])

  // Handle file clear
  const handleFileClear = useCallback(() => {
    setSelectedFile(null)
    setParsedCSV(null)
    setMappings([])
    setMappedData([])
    setStep("upload")
  }, [])

  // Handle mapping change
  const handleMappingChange = useCallback((index: number, importField: string | null) => {
    setMappings(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], importField }
      return updated
    })
  }, [])

  // Proceed to preview
  const handleProceedToPreview = useCallback(() => {
    if (!parsedCSV) return
    
    // Validate mappings
    const errors = validateMappings(mappings)
    if (errors.length > 0) {
      toast({
        title: "Mapping Error",
        description: errors[0],
        variant: "destructive",
      })
      return
    }
    
    // Apply mappings to data
    const mapped = applyMappings(parsedCSV, mappings)
    setMappedData(mapped)
    setStep("preview")
  }, [parsedCSV, mappings, toast])

  // Go back to mapping
  const handleBackToMapping = useCallback(() => {
    setStep("mapping")
  }, [])

  // Perform import
  const handleImport = useCallback(async () => {
    if (mappedData.length === 0) return
    
    setIsImporting(true)
    setStep("importing")
    
    try {
      // Convert mapped data to MassImportTransactionRow format
      const transactions: MassImportTransactionRow[] = mappedData.map(row => ({
        amount: row.amount as number,
        date: row.date as string,
        name: row.name as string,
        merchant_name: row.merchant_name as string | null,
        account_name: row.account_name as string | null,
        account_type: row.account_type as string | null,
        account_subtype: row.account_subtype as string | null,
        plaid_transaction_id: row.plaid_transaction_id as string | null,
        iso_currency_code: row.iso_currency_code as string | null,
        pending: row.pending as boolean | undefined,
        transaction_type: row.transaction_type as string | null,
        category_name: row.category_name as string | null,
        subcategory_name: row.subcategory_name as string | null,
        notes: row.notes as string | null,
        tags: row.tags as string[] | null,
      }))
      
      const response = await apiClient.massImport<MassImportResponse>(transactions)
      
      if (response.error) {
        toast({
          title: "Import Failed",
          description: response.error,
          variant: "destructive",
        })
        setStep("preview")
        return
      }
      
      if (response.data) {
        setImportResults(response.data)
        setShowResults(true)
        
        if (response.data.failed_imports === 0) {
          toast({
            title: "Import Successful",
            description: `Successfully imported ${response.data.successful_imports} transactions`,
          })
        } else {
          toast({
            title: "Import Completed",
            description: `Imported ${response.data.successful_imports} of ${response.data.total_rows} transactions`,
            variant: "destructive",
          })
        }
      }
    } catch {
      toast({
        title: "Import Failed",
        description: "An unexpected error occurred during import",
        variant: "destructive",
      })
      setStep("preview")
    } finally {
      setIsImporting(false)
    }
  }, [mappedData, toast])

  // Handle done after import
  const handleDone = useCallback(() => {
    setShowResults(false)
    router.push("/")
  }, [router])

  // Check if all required fields are mapped
  const requiredFieldsMapped = useCallback(() => {
    const mappedFields = new Set(mappings.map(m => m.importField).filter(Boolean))
    return Object.entries(IMPORT_FIELDS)
      .filter(([, config]) => config.required)
      .every(([key]) => mappedFields.has(key))
  }, [mappings])

  if (authLoading || !isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
              <h1 className="text-2xl font-bold">Import Transactions</h1>
            </div>
          </div>

          {/* Instructions */}
          <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 mb-1">CSV Import Instructions</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-01-15)</li>
                    <li>• <strong>Amount sign:</strong> Negative for expenses, positive for income</li>
                    <li>• <strong>Accounts:</strong> Will be created automatically if not found</li>
                    <li>• <strong>Categories:</strong> Must match existing category names</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step Progress */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <StepIndicator
                step={1}
                label="Upload"
                active={step === "upload"}
                completed={step !== "upload"}
              />
              <StepConnector completed={step !== "upload"} />
              <StepIndicator
                step={2}
                label="Map Columns"
                active={step === "mapping"}
                completed={step === "preview" || step === "importing"}
              />
              <StepConnector completed={step === "preview" || step === "importing"} />
              <StepIndicator
                step={3}
                label="Review & Import"
                active={step === "preview" || step === "importing"}
                completed={false}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {step === "upload" && (
              <ImportFileUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleFileClear}
                rowCount={parsedCSV?.rows.length}
              />
            )}

            {step === "mapping" && (
              <>
                <ImportFileUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onClear={handleFileClear}
                  rowCount={parsedCSV?.rows.length}
                />
                <ImportColumnMapper
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleFileClear}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProceedToPreview}
                    disabled={!requiredFieldsMapped()}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Continue to Preview
                  </Button>
                </div>
              </>
            )}

            {(step === "preview" || step === "importing") && (
              <>
                <ImportPreview data={mappedData} mappings={mappings} />
                
                {mappedData.length > 0 && (
                  <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700 mb-1">
                            Ready to import {mappedData.length} transactions
                          </p>
                          <p className="text-muted-foreground">
                            This action cannot be undone. Please verify the data above
                            before proceeding.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBackToMapping}
                    disabled={isImporting}
                  >
                    Back to Mapping
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || mappedData.length === 0}
                    className="bg-emerald-500 hover:bg-emerald-600 gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import {mappedData.length} Transactions
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Results Dialog */}
      <ImportResultsDialog
        open={showResults}
        onOpenChange={setShowResults}
        results={importResults}
        onDone={handleDone}
      />
    </div>
  )
}

// Step indicator component
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          completed
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-emerald-500/20 text-emerald-600 border-2 border-emerald-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? "✓" : step}
      </div>
      <span
        className={`text-xs ${
          active ? "text-emerald-600 font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// Step connector line
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`w-12 h-0.5 transition-colors ${
        completed ? "bg-emerald-500" : "bg-muted"
      }`}
    />
  )
}
