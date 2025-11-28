// User types
export interface UserResponse {
  id: number
  email: string
  first_name?: string | null
  last_name?: string | null
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

// Account types
export interface AccountResponse {
  id: number
  name: string
  official_name?: string | null
  type: string
  subtype?: string | null
  mask?: string | null
  balance_available?: string | null
  balance_current?: string | null
  balance_limit?: string | null
  balance_iso_currency_code?: string | null
  verification_status?: string | null
  plaid_item_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface AccountCreate {
  name: string
  official_name?: string | null
  type: string
  subtype?: string | null
  mask?: string | null
  balance_available?: string | null
  balance_current?: string | null
  balance_limit?: string | null
  balance_iso_currency_code?: string | null
  verification_status?: string | null
  plaid_item_id?: number | null
}

// Category types
export interface CategoryResponse {
  id: number
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  is_system: boolean
  user_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface CategoryCreate {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
}

// Subcategory types
export interface SubcategoryResponse {
  id: number | string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  category_id: number | string
  is_system: boolean
  user_id?: number | null
  created_at: string
  updated_at?: string | null
  category?: CategoryResponse | null
}

export interface SubcategoryCreate {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
}

// Transaction types
export interface TransactionResponse {
  id: number
  amount: string
  date: string
  name: string
  merchant_name?: string | null
  pending: boolean
  plaid_transaction_id?: string | null
  account_id?: number | null
  iso_currency_code?: string | null
  datetime?: string | null
  authorized_date?: string | null
  authorized_datetime?: string | null
  transaction_type?: string | null
  merchant_entity_id?: string | null
  logo_url?: string | null
  website?: string | null
  custom_category_id?: number | null
  custom_subcategory_id?: number | null
  notes?: string | null
  tags?: string[] | null
  account?: AccountResponse | null
  custom_category?: CategoryResponse | null
  custom_subcategory?: SubcategoryResponse | null
}

export interface TransactionCreateResponse extends TransactionResponse {
  budget_created: boolean
  budget_year?: number | null
  budget_month?: number | null
}

export interface TransactionCreate {
  amount: string | number
  date: string
  name: string
  merchant_name?: string | null
  pending?: boolean
  account_id?: number | null
  plaid_transaction_id?: string | null
  iso_currency_code?: string | null
  datetime?: string | null
  merchant_entity_id?: string | null
  logo_url?: string | null
  website?: string | null
  authorized_date?: string | null
  authorized_datetime?: string | null
  transaction_type?: string | null
  custom_category_id?: number | null
  custom_subcategory_id?: number | null
  notes?: string | null
  tags?: string[] | null
}

export interface TransactionUpdate {
  custom_category_id?: number | null
  custom_subcategory_id?: number | null
  notes?: string | null
  tags?: string[] | null
}

// Budget types
export interface BudgetTemplateEntryResponse {
  id: number
  template_id: number
  category_id?: number | null
  subcategory_id?: number | null
  budgeted_amount: string
  category?: CategoryResponse | null
  subcategory?: SubcategoryResponse | null
  created_at: string
  updated_at?: string | null
}

export interface BudgetTemplateEntryCreate {
  budgeted_amount: string | number
  category_id?: number | null
  subcategory_id?: number | null
}

export interface BudgetTemplateEntryUpdate {
  budgeted_amount?: string | number
  category_id?: number | null
  subcategory_id?: number | null
}

export interface BudgetTemplateResponse {
  id: number
  user_id: number
  month: number | null  // null for default budget
  year: number | null   // null for default budget
  is_default: boolean
  total_budget: string
  entries: BudgetTemplateEntryResponse[]
  created_at: string
  updated_at?: string | null
}

export interface BudgetTemplateCreate {
  month?: number | null
  year?: number | null
  is_default?: boolean
  total_budget: string | number
  entries: BudgetTemplateEntryCreate[]
}

export interface BudgetTemplateUpdate {
  total_budget?: string | number
  entries?: BudgetTemplateEntryCreate[] | null
}

export interface UserBudgetSettingsResponse {
  id: number
  user_id: number
  monthly_income: string
  monthly_savings_goal: string
  created_at: string
  updated_at?: string | null
}

export interface UserBudgetSettingsCreate {
  monthly_income: string | number
  monthly_savings_goal: string | number
}

export interface UserBudgetSettingsUpdate {
  monthly_income?: string | number
  monthly_savings_goal?: string | number
}
