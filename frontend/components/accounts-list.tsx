"use client"

import { useState } from "react"
import { useAccounts } from "@/contexts/accounts-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus } from "lucide-react"
import type { AccountCreate } from "@/lib/types"

export function AccountsList() {
  const { accounts, isLoading, createAccount, deleteAccount } = useAccounts()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [accountName, setAccountName] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const newAccount: AccountCreate = {
      name: accountName,
      type: accountType,
    }

    const result = await createAccount(newAccount)

    if (result) {
      toast({
        title: "Success",
        description: "Account linked successfully",
      })
      setAccountName("")
      setAccountType("checking")
      setIsDialogOpen(false)
    } else {
      toast({
        title: "Error",
        description: "Failed to link account",
        variant: "destructive",
      })
    }

    setIsSubmitting(false)
  }

  const handleDeleteAccount = async (accountId: number | string) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return

    const success = await deleteAccount(String(accountId))

    if (success) {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Linked Accounts</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="h-4 w-4 mr-2" />
          Link Account
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading accounts...</CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No accounts linked yet. Link your first account to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => {
            const balance = account.balance_current 
              ? parseFloat(account.balance_current) 
              : account.balance_available 
                ? parseFloat(account.balance_available) 
                : 0
            return (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{account.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {account.subtype ? `${account.type} - ${account.subtype}` : account.type}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold">
                        {account.balance_iso_currency_code || "$"}
                        {balance.toFixed(2)}
                      </p>
                    </div>
                    {account.mask && (
                      <p className="text-xs text-muted-foreground">****{account.mask}</p>
                    )}
                    {account.official_name && account.official_name !== account.name && (
                      <p className="text-xs text-muted-foreground">{account.official_name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link New Account</DialogTitle>
            <DialogDescription>Connect your bank account to track transactions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., My Checking Account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-type">Account Type</Label>
              <select
                id="account-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit Card</option>
                <option value="investment">Investment</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSubmitting ? "Linking..." : "Link Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
