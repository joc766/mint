"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"

// Mock data for search results
const searchData = [
  // Apps (Merchants)
  { type: "app", id: 1, name: "Swiggy", category: "Food", amount: 185.75, color: "#FF5F1F" },
  { type: "app", id: 2, name: "Blinkit", category: "Groceries", amount: 132.45, color: "#FFCC00" },
  { type: "app", id: 3, name: "Netflix", category: "Entertainment", amount: 14.99, color: "#E50914" },
  { type: "app", id: 4, name: "Uber", category: "Travel", amount: 245.5, color: "#000000" },
  { type: "app", id: 5, name: "Amazon", category: "Shopping", amount: 324.67, color: "#FF9900" },

  // Categories
  { type: "category", id: 1, name: "Food", count: 2, amount: 342.55, color: "#FF5F1F" },
  { type: "category", id: 2, name: "Travel", count: 2, amount: 366.25, color: "#4285F4" },
  { type: "category", id: 3, name: "Entertainment", count: 3, amount: 32.97, color: "#E50914" },
  { type: "category", id: 4, name: "Shopping", count: 1, amount: 324.67, color: "#FF9900" },
  { type: "category", id: 5, name: "Rent", count: 1, amount: 450.0, color: "#34A853" },
]

interface SearchResult {
  type: string
  id: number
  name: string
  category?: string
  count?: number
  amount: number
  color: string
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const router = useRouter()
  const { formatAmount } = useCurrency()

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = searchData.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "category") {
      router.push(`/category?id=${result.id}`)
    } else if (result.type === "app") {
      router.push(`/merchant/${result.id}`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Search Expenses</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by app, category, or amount..."
            className="pl-8 bg-background border-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {results.length > 0 ? (
          <div className="mt-2 max-h-[300px] overflow-auto">
            <div className="space-y-4">
              {results.filter((item) => item.type === "app").length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Apps</h3>
                  <div className="space-y-2">
                    {results
                      .filter((item) => item.type === "app")
                      .map((item) => (
                        <div
                          key={`app-${item.id}`}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleResultClick(item)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.category}</div>
                            </div>
                          </div>
                          <div className="font-medium">{formatAmount(item.amount)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {results.filter((item) => item.type === "category").length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
                  <div className="space-y-2">
                    {results
                      .filter((item) => item.type === "category")
                      .map((item) => (
                        <div
                          key={`category-${item.id}`}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleResultClick(item)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.count} expenses</div>
                            </div>
                          </div>
                          <div className="font-medium">{formatAmount(item.amount)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : searchQuery.length > 1 ? (
          <div className="py-8 text-center text-muted-foreground">No results found</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
