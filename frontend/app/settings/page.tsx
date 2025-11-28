"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/contexts/theme-context"
import { useCurrency } from "@/contexts/currency-context"
import { currencies } from "@/contexts/currency-context"
import { useAuth } from "@/contexts/auth-context"
import { useBudget } from "@/contexts/budget-context"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency, position, setPosition } = useCurrency()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { budgetSettings, updateBudgetSettings, fetchMonthlyBudget, updateMonthlyBudget } = useBudget()
  const { toast } = useToast()
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState("")
  const [isSavingBudget, setIsSavingBudget] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Load budget settings when component mounts
  useEffect(() => {
    if (isAuthenticated && budgetSettings) {
      setMonthlyIncome(Number(budgetSettings.monthly_income).toString())
      setMonthlySavingsGoal(Number(budgetSettings.monthly_savings_goal).toString())
    }
  }, [isAuthenticated, budgetSettings])

  if (authLoading || !isAuthenticated) {
    return null
  }

  const handleDarkModeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleSaveBudgetSettings = async () => {
    const income = Number.parseFloat(monthlyIncome)
    const savingsGoal = Number.parseFloat(monthlySavingsGoal)

    if (!monthlyIncome || isNaN(income) || income <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid monthly income",
        variant: "destructive",
      })
      return
    }

    if (!monthlySavingsGoal || isNaN(savingsGoal) || savingsGoal < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid monthly savings goal",
        variant: "destructive",
      })
      return
    }

    if (savingsGoal >= income) {
      toast({
        title: "Error",
        description: "Savings goal cannot be greater than or equal to income",
        variant: "destructive",
      })
      return
    }

    setIsSavingBudget(true)

    // Update budget settings
    const success = await updateBudgetSettings({
      monthly_income: income,
      monthly_savings_goal: savingsGoal,
    })

    if (!success) {
      setIsSavingBudget(false)
      return
    }

    // Update current month's budget template total_budget
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Fetch current month's budget to see if it exists
    const currentBudget = await fetchMonthlyBudget(year, month)

    if (currentBudget) {
      // Budget exists, update its total_budget
      const newTotalBudget = income - savingsGoal
      const updateSuccess = await updateMonthlyBudget(year, month, {
        total_budget: newTotalBudget,
      })

      if (updateSuccess) {
        toast({
          title: "Success",
          description: "Budget settings and current month's budget updated successfully",
        })
      } else {
        toast({
          title: "Partial Success",
          description: "Budget settings updated, but failed to update current month's budget",
          variant: "destructive",
        })
      }
    } else {
      // Budget doesn't exist for current month, that's okay
      toast({
        title: "Success",
        description: "Budget settings updated successfully",
      })
    }

    setIsSavingBudget(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Settings</CardTitle>
                <CardDescription>Manage your monthly income and savings goal. Changes will update your current month&apos;s budget.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly-income">Monthly Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="monthly-income"
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
                  <Label htmlFor="monthly-savings-goal">Monthly Savings Goal</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="monthly-savings-goal"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={monthlySavingsGoal}
                      onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available budget: ${((Number.parseFloat(monthlyIncome) || 0) - (Number.parseFloat(monthlySavingsGoal) || 0)).toFixed(2)}
                  </p>
                </div>
                <Button 
                  onClick={handleSaveBudgetSettings} 
                  disabled={isSavingBudget}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isSavingBudget ? "Saving..." : "Save Budget Settings"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Budget Template</CardTitle>
                <CardDescription>Edit your default budget template that serves as the baseline for all new monthly budgets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your default budget template is used when creating budgets for new months. Changes here won&apos;t affect existing monthly budgets.
                  </p>
                  <Button onClick={() => router.push("/budget?default=true")} className="bg-emerald-500 hover:bg-emerald-600">
                    Edit Default Budget Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Budget Management</CardTitle>
                <CardDescription>Edit budget distributions for specific months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Edit how your budget is distributed across categories and subcategories for any month.
                  </p>
                  <Button onClick={() => router.push("/budget")} className="bg-emerald-500 hover:bg-emerald-600">
                    Manage Monthly Budgets
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="budget-alerts" className="font-medium">
                      Budget Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">Get notified when you&apos;re close to your budget limit</p>
                  </div>
                  <Switch id="budget-alerts" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weekly-summary" className="font-medium">
                      Weekly Summary
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of your expenses</p>
                  </div>
                  <Switch id="weekly-summary" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications" className="font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch id="email-notifications" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display</CardTitle>
                <CardDescription>Customize your display preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode" className="font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                  </div>
                  <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={handleDarkModeToggle} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="currency-select" className="font-medium">
                      Currency
                    </Label>
                    <p className="text-sm text-muted-foreground">Select your preferred currency</p>
                  </div>
                  <select
                    id="currency-select"
                    className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={currency.code}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="currency-display" className="font-medium">
                      Currency Display
                    </Label>
                    <p className="text-sm text-muted-foreground">Show currency symbol before or after amount</p>
                  </div>
                  <select
                    id="currency-display"
                    className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={position}
                    onChange={(e) => setPosition(e.target.value as "before" | "after")}
                  >
                    <option value="before">Before ({currency.symbol}100)</option>
                    <option value="after">After (100{currency.symbol})</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>Manage your data and privacy settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Export Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">Download all your expense data</p>
                  <div className="flex gap-4">
                    <Button variant="outline">Export as CSV</Button>
                    <Button variant="outline">Export as PDF</Button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all data</p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
