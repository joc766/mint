from __future__ import annotations

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime as dt_type, date
from decimal import Decimal

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: dt_type
    
    class Config:
        from_attributes = True

# Plaid Item schemas
class PlaidItemBase(BaseModel):
    item_id: str
    institution_id: str
    institution_name: str
    webhook_url: Optional[str] = None
    available_products: Optional[List[str]] = []
    billed_products: Optional[List[str]] = []

# Plaid Link Token schemas
class LinkTokenCreateRequest(BaseModel):
    user_id: str

class LinkTokenCreateResponse(BaseModel):
    link_token: str

class ExchangeTokenRequest(BaseModel):
    public_token: str

class ExchangeTokenResponse(BaseModel):
    access_token: str
    item_id: str

class PlaidItemCreate(PlaidItemBase):
    access_token: str

class PlaidItemResponse(PlaidItemBase):
    id: int
    user_id: int
    created_at: dt_type
    
    class Config:
        from_attributes = True

# Account schemas
class AccountBase(BaseModel):
    name: str
    official_name: Optional[str] = None
    type: str
    subtype: Optional[str] = None
    mask: Optional[str] = None
    balance_available: Optional[Decimal] = None
    balance_current: Optional[Decimal] = None
    balance_limit: Optional[Decimal] = None
    balance_iso_currency_code: Optional[str] = None
    verification_status: Optional[str] = None

class AccountCreate(AccountBase):
    plaid_item_id: Optional[int] = None

class AccountResponse(AccountBase):
    id: int
    plaid_item_id: Optional[int] = None
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    
    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    is_system: bool
    user_id: Optional[int] = None
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    # Note: subcategories excluded to avoid circular reference with SubcategoryResponse.category
    # Fetch subcategories separately if needed
    
    class Config:
        from_attributes = True

# Subcategory schemas
class SubcategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class SubcategoryCreate(SubcategoryBase):
    pass

class SubcategoryResponse(SubcategoryBase):
    id: int
    category_id: int
    is_system: bool
    user_id: Optional[int] = None
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    category: Optional['CategoryResponse'] = None
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    amount: Decimal
    date: date
    name: str
    merchant_name: Optional[str] = None
    pending: bool = False

class TransactionCreate(TransactionBase):
    account_id: Optional[int] = None
    plaid_transaction_id: Optional[str] = None
    iso_currency_code: Optional[str] = None
    datetime: Optional[dt_type] = None
    merchant_entity_id: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    authorized_date: Optional[date] = None
    authorized_datetime: Optional[dt_type] = None
    transaction_type: Optional[str] = None
    custom_category_id: Optional[int] = None
    custom_subcategory_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []

class TransactionResponse(TransactionBase):
    id: int
    plaid_transaction_id: Optional[str] = None
    account_id: Optional[int] = None
    iso_currency_code: Optional[str] = None
    datetime: Optional[dt_type] = None
    authorized_date: Optional[date] = None
    authorized_datetime: Optional[dt_type] = None
    transaction_type: Optional[str] = None
    merchant_entity_id: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    
    # Custom categorization
    custom_category_id: Optional[int] = None
    custom_subcategory_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    
    # Relationships
    account: Optional[AccountResponse] = None
    custom_category: Optional['CategoryResponse'] = None
    custom_subcategory: Optional['SubcategoryResponse'] = None
    
    class Config:
        from_attributes = True

class TransactionUpdate(BaseModel):
    custom_category_id: Optional[int] = None
    custom_subcategory_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

# Note: TransactionSplit and RecurringTransaction models removed from schema

# Analytics schemas
class SpendingByCategoryResponse(BaseModel):
    category: str
    total_amount: Decimal
    transaction_count: int

class MonthlySpendingResponse(BaseModel):
    month: str
    total_amount: Decimal
    categories: List[SpendingByCategoryResponse]

# Budget schemas
class BudgetTemplateEntryBase(BaseModel):
    budgeted_amount: Decimal

class BudgetTemplateEntryCreate(BudgetTemplateEntryBase):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

class BudgetTemplateEntryResponse(BudgetTemplateEntryBase):
    id: int
    template_id: int
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    subcategory: Optional[SubcategoryResponse] = None
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    
    class Config:
        from_attributes = True

class BudgetTemplateResponse(BaseModel):
    id: int
    user_id: int
    month: Optional[int] = None  # NULL for default budget
    year: Optional[int] = None   # NULL for default budget
    is_default: bool
    total_budget: Decimal
    entries: List[BudgetTemplateEntryResponse] = []
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    
    class Config:
        from_attributes = True

class BudgetTemplateCreate(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    is_default: Optional[bool] = False
    total_budget: Decimal
    entries: List[BudgetTemplateEntryCreate]

class BudgetTemplateUpdate(BaseModel):
    total_budget: Optional[Decimal] = None
    entries: Optional[List[BudgetTemplateEntryCreate]] = None

class UserBudgetSettingsBase(BaseModel):
    monthly_income: Decimal
    monthly_savings_goal: Decimal

class UserBudgetSettingsCreate(UserBudgetSettingsBase):
    pass

class UserBudgetSettingsUpdate(UserBudgetSettingsBase):
    monthly_income: Optional[Decimal] = None
    monthly_savings_goal: Optional[Decimal] = None

class UserBudgetSettingsResponse(UserBudgetSettingsBase):
    id: int
    user_id: int
    created_at: dt_type
    updated_at: Optional[dt_type] = None
    
    class Config:
        from_attributes = True

# Budget analytics schemas
class BudgetComparisonResponse(BaseModel):
    """Shows actual spending vs budget for a category/subcategory"""
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    subcategory_id: Optional[int] = None
    subcategory_name: Optional[str] = None
    budgeted_amount: Decimal
    actual_amount: Decimal
    difference: Decimal  # actual - budgeted (negative means under budget)
    percentage_used: Decimal  # (actual / budgeted) * 100

class MonthlyBudgetSummaryResponse(BaseModel):
    """Summary of budget performance for a month"""
    year: int
    month: int
    budget_settings: UserBudgetSettingsResponse
    comparisons: List[BudgetComparisonResponse]
    total_budgeted: Decimal
    total_spent: Decimal
    remaining_budget: Decimal
    savings_progress: Decimal  # How much toward savings goal

# Forward references are resolved automatically by Pydantic when using string annotations
# No explicit model_rebuild() needed - Pydantic handles this automatically