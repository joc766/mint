from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
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
    created_at: datetime
    
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

class PlaidItemCreate(PlaidItemBase):
    access_token: str

class PlaidItemResponse(PlaidItemBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Account schemas
class AccountResponse(BaseModel):
    id: int
    account_id: str
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
    
    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    is_system: bool
    user_id: Optional[int] = None
    created_at: datetime
    children: Optional[List['CategoryResponse']] = []
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    amount: Decimal
    date: date
    name: str
    merchant_name: Optional[str] = None
    payment_channel: Optional[str] = None
    pending: bool = False

class TransactionResponse(TransactionBase):
    id: int
    transaction_id: str
    iso_currency_code: Optional[str] = None
    datetime: Optional[datetime] = None
    authorized_date: Optional[date] = None
    authorized_datetime: Optional[datetime] = None
    location: Optional[dict] = None
    payment_meta: Optional[dict] = None
    account_owner: Optional[str] = None
    transaction_code: Optional[str] = None
    transaction_type: Optional[str] = None
    
    # Custom categorization
    custom_category_id: Optional[int] = None
    custom_subcategory_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    is_recurring: bool = False
    is_transfer: bool = False
    
    # Plaid categories
    plaid_category_id: Optional[str] = None
    plaid_category: Optional[List[str]] = []
    plaid_subcategory: Optional[List[str]] = []
    
    # Relationships
    account: Optional[AccountResponse] = None
    custom_category: Optional[CategoryResponse] = None
    custom_subcategory: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True

class TransactionUpdate(BaseModel):
    custom_category_id: Optional[int] = None
    custom_subcategory_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    is_transfer: Optional[bool] = None

# Transaction Split schemas
class TransactionSplitBase(BaseModel):
    amount: Decimal
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    description: Optional[str] = None

class TransactionSplitCreate(TransactionSplitBase):
    pass

class TransactionSplitResponse(TransactionSplitBase):
    id: int
    transaction_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Recurring Transaction schemas
class RecurringTransactionResponse(BaseModel):
    id: int
    name: str
    merchant_name: Optional[str] = None
    average_amount: Optional[Decimal] = None
    frequency: Optional[str] = None
    last_occurrence: Optional[datetime] = None
    next_expected_date: Optional[datetime] = None
    confidence_score: Optional[Decimal] = None
    is_active: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics schemas
class SpendingByCategoryResponse(BaseModel):
    category: str
    total_amount: Decimal
    transaction_count: int

class MonthlySpendingResponse(BaseModel):
    month: str
    total_amount: Decimal
    categories: List[SpendingByCategoryResponse]