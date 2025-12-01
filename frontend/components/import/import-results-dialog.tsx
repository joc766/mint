"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Tag,
  Calendar,
  Download,
} from "lucide-react"
import type { MassImportResponse } from "@/lib/types"

interface ImportResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: MassImportResponse | null
  onDone: () => void
}

export function ImportResultsDialog({
  open,
  onOpenChange,
  results,
  onDone,
}: ImportResultsDialogProps) {
  // Calculate summary stats
  const stats = useMemo(() => {
    if (!results) return null
    
    const successRate = results.total_rows > 0
      ? Math.round((results.successful_imports / results.total_rows) * 100)
      : 0
    
    const totalWarnings = results.transaction_results.reduce(
      (sum, r) => sum + r.warnings.length,
      0
    )
    
    return { successRate, totalWarnings }
  }, [results])

  // Generate CSV of failed rows for re-import
  const downloadFailedRows = () => {
    if (!results) return
    
    const failedResults = results.transaction_results.filter(r => !r.success)
    if (failedResults.length === 0) return
    
    const csv = [
      "row_index,error",
      ...failedResults.map(r => `${r.row_index + 1},"${r.error?.replace(/"/g, '""') || 'Unknown error'}"`)
    ].join("\n")
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "import-errors.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!results) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {results.failed_imports === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Import Completed Successfully
              </>
            ) : results.successful_imports === 0 ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Import Failed
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Import Completed with Issues
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Processed {results.total_rows} transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {results.successful_imports}
                </p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {results.failed_imports}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {stats?.totalWarnings || 0}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="accounts">
                Accounts ({results.accounts_created.length + results.accounts_used.length})
              </TabsTrigger>
              <TabsTrigger value="categories">
                Categories ({results.unrecognized_categorizations.length})
              </TabsTrigger>
              <TabsTrigger value="errors">
                Errors ({results.failed_imports})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Accounts Summary */}
              {(results.accounts_created.length > 0 || results.accounts_used.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {results.accounts_created.length > 0 && (
                      <p className="text-emerald-600">
                        ✓ {results.accounts_created.length} new account(s) created
                      </p>
                    )}
                    {results.accounts_used.length > 0 && (
                      <p className="text-muted-foreground">
                        • {results.accounts_used.length} existing account(s) used
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Budgets Summary */}
              {results.budgets_created.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Budgets Auto-Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-emerald-600">
                      ✓ {results.budgets_created.length} monthly budget(s) created from default
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {results.budgets_created.map(b => (
                        <span
                          key={`${b.year}-${b.month}`}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-700 rounded text-xs"
                        >
                          {new Date(b.year, b.month - 1).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Categories Warning */}
              {results.unrecognized_categorizations.length > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                      <Tag className="h-4 w-4" />
                      Unrecognized Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-amber-600">
                    {results.unrecognized_categorizations.length} transaction(s) have
                    categories/subcategories that weren&apos;t found. You can categorize
                    them manually later.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="accounts">
              <div className="space-y-4">
                {results.accounts_created.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-emerald-600">
                      Newly Created Accounts
                    </h4>
                    <div className="space-y-2">
                      {results.accounts_created.map(account => (
                        <div
                          key={account.account_id}
                          className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg"
                        >
                          <span className="font-medium">{account.account_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {account.account_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.accounts_used.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Existing Accounts Used
                    </h4>
                    <div className="space-y-2">
                      {results.accounts_used.map(account => (
                        <div
                          key={account.account_id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <span>{account.account_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {account.account_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.accounts_created.length === 0 && results.accounts_used.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No accounts were affected
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories">
              {results.unrecognized_categorizations.length > 0 ? (
                <div className="space-y-2">
                  {results.unrecognized_categorizations.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Row {cat.row_index + 1}</span>
                        <span className="text-xs text-amber-600 capitalize">
                          {cat.reason.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {cat.category_name && (
                          <span>Category: <strong>{cat.category_name}</strong></span>
                        )}
                        {cat.category_name && cat.subcategory_name && " / "}
                        {cat.subcategory_name && (
                          <span>Subcategory: <strong>{cat.subcategory_name}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  All categories were recognized ✓
                </p>
              )}
            </TabsContent>

            <TabsContent value="errors">
              {results.failed_imports > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadFailedRows}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Errors
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {results.transaction_results
                      .filter(r => !r.success)
                      .map(result => (
                        <div
                          key={result.row_index}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Row {result.row_index + 1}
                            </span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">{result.error}</p>
                          {result.warnings.length > 0 && (
                            <div className="mt-2 text-xs text-amber-600">
                              {result.warnings.map((w, i) => (
                                <p key={i}>⚠ {w}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No errors occurred ✓
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              View Details
            </Button>
            <Button onClick={onDone} className="bg-emerald-500 hover:bg-emerald-600">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
