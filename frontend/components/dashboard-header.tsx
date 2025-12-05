"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, BoxIcon as Bucket, Moon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SearchDialog } from "./search-dialog"
import { UserDropdown } from "./user-dropdown"
import { useTheme } from "@/contexts/theme-context"

export function DashboardHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleDarkModeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

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
            <div className="flex items-center gap-2">
              <Moon className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
              <Switch checked={theme === "dark"} onCheckedChange={handleDarkModeToggle} />
            </div>
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
