"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, BoxIcon as Bucket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchDialog } from "./search-dialog"
import { AddExpenseDialog } from "./add-expense-dialog"
import { NotificationsDropdown } from "./notifications-dropdown"
import { UserDropdown } from "./user-dropdown"
import { useTheme } from "@/contexts/theme-context"

export function DashboardHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const { theme } = useTheme()

  return (
    <>
      <header
        className={`sticky top-0 z-10 w-full border-b ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white"}`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <Bucket className="h-6 w-6 text-emerald-500" />
            Buckets
          </Link>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search
                className={`absolute left-2.5 top-2.5 h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"} cursor-pointer`}
                onClick={() => setSearchOpen(true)}
              />
              <Input
                type="search"
                placeholder="Search expenses..."
                className={`w-64 pl-8 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} cursor-pointer`}
                readOnly
                onClick={() => setSearchOpen(true)}
              />
            </div>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setAddExpenseOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
            <NotificationsDropdown />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <AddExpenseDialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </>
  )
}
