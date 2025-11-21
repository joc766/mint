"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MonthlyBudgetSetup } from "@/components/monthly-budget-setup"
import { apiClient } from "@/lib/api-client"
import type { UserBudgetSettingsCreate } from "@/lib/types"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const router = useRouter()

  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("")

  const handleNext = async () => {
    setError(undefined)

    if (step === 1) {
      // Step 1: Validate and save budget settings
      if (!monthlyIncome || Number.parseFloat(monthlyIncome) <= 0) {
        setError("Please enter a valid monthly income")
        return
      }

      if (!monthlySavingsGoal || Number.parseFloat(monthlySavingsGoal) < 0) {
        setError("Please enter a valid monthly savings goal")
        return
      }

      setIsLoading(true)
      try {
        const budgetSettings: UserBudgetSettingsCreate = {
          monthly_income: Number.parseFloat(monthlyIncome),
          monthly_savings_goal: Number.parseFloat(monthlySavingsGoal),
        }

        const { error: apiError } = await apiClient.post("/budget/settings/", budgetSettings)

        if (apiError) {
          setError(apiError)
          setIsLoading(false)
          return
        }

        setIsLoading(false)
        setStep(step + 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save budget settings")
        setIsLoading(false)
      }
    }
  }

  const handleComplete = () => {
    // Budget is already saved by MonthlyBudgetSetup component
    setIsLoading(true)
    router.push("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your ExpenseTracker</CardTitle>
          <CardDescription>Let&apos;s get you started with tracking your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-emerald-500 text-white" : "bg-gray-200"}`}
              >
                1
              </div>
              <div className={`h-1 flex-1 ${step >= 2 ? "bg-emerald-500" : "bg-gray-200"}`}></div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-emerald-500 text-white" : "bg-gray-200"}`}
              >
                2
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Monthly Income</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Monthly Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="savingsGoal">Monthly Savings Goal</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="savingsGoal"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={monthlySavingsGoal}
                      onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Set Your Budget</h3>
              <MonthlyBudgetSetup onComplete={handleComplete} />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}>
              Previous
            </Button>
          ) : (
            <div></div>
          )}
          {step < 2 ? (
            <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600" disabled={isLoading}>
              {isLoading ? "Saving..." : "Next"}
            </Button>
          ) : (
            <div></div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
