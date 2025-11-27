"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useBudget } from "@/contexts/budget-context"
import { useToast } from "@/hooks/use-toast"
import { MonthlyBudgetSetup } from "@/components/monthly-budget-setup"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function DefaultBudgetPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { defaultBudget, fetchDefaultBudget } = useBudget()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch default budget when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchDefaultBudget()
    }
  }, [isAuthenticated, fetchDefaultBudget])

  if (authLoading || !isAuthenticated) {
    return null
  }

  const handleComplete = () => {
    toast({
      title: "Success",
      description: "Default budget updated successfully",
    })
    router.push("/settings")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push("/settings")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Settings</span>
            </Button>
            <h1 className="text-2xl font-bold">Edit Default Budget</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Default Budget Template</CardTitle>
              <CardDescription>
                This budget template will be used as the baseline for creating new monthly budgets. 
                Changes here won&apos;t affect your existing monthly budgets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!defaultBudget && (
                <div className="mb-6 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-1">No Default Budget Found</h3>
                      <p className="text-sm text-yellow-800">
                        You haven&apos;t created a default budget yet. Create one below to use as a template for future monthly budgets.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <MonthlyBudgetSetup onComplete={handleComplete} isDefault={true} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
