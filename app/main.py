import os
import plaid

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.configuration import Configuration
from plaid.api_client import ApiClient

from api.database import get_db, engine
from api.models import User, Account, Transaction, Category, Subcategory
from api.schemas import (
    UserCreate, UserResponse, AccountCreate, AccountResponse, 
    TransactionResponse, TransactionCreate, CategoryCreate, CategoryResponse,
    SubcategoryCreate, SubcategoryResponse,
    TransactionUpdate, LinkTokenCreateRequest, LinkTokenCreateResponse, ExchangeTokenRequest, ExchangeTokenResponse
)
from api.auth import get_current_user, create_access_token, verify_password, get_password_hash
from api.plaid_service import PlaidService

# Create database tables
from api.models import Base
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plaid Transaction Categorization API", version="1.0.0")
security = HTTPBearer()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods including OPTIONS
    allow_headers=["*"],
)

# Initialize Plaid service
plaid_service = PlaidService()

@app.get("/")
def root():
    return {"message": "Plaid Transaction Categorization API"}

# User management endpoints
@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# Account management endpoints
@app.post("/accounts/", response_model=AccountResponse)
def create_account(
    account: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account"""
    db_account = Account(
        plaid_item_id=account.plaid_item_id,
        name=account.name,
        official_name=account.official_name,
        type=account.type,
        subtype=account.subtype,
        mask=account.mask,
        balance_available=account.balance_available,
        balance_current=account.balance_current,
        balance_limit=account.balance_limit,
        balance_iso_currency_code=account.balance_iso_currency_code,
        verification_status=account.verification_status
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.get("/accounts/", response_model=List[AccountResponse])
def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all accounts"""
    accounts = db.query(Account).all()
    return accounts

@app.post("/plaid/link/token/create", response_model=LinkTokenCreateResponse)
def create_link_token(request: LinkTokenCreateRequest):
    """Create a link token for Plaid Link"""
    link_token = plaid_service.create_link_token(request.user_id)
    return LinkTokenCreateResponse(link_token=link_token)

@app.post("/plaid/link/token/exchange", response_model=ExchangeTokenResponse)
def exchange_public_token(request: ExchangeTokenRequest):
    """Exchange a public token for an access token"""
    result = plaid_service.exchange_public_token(request.public_token)
    
    return ExchangeTokenResponse(
        access_token=result["access_token"],
        item_id=result["item_id"]
    )

# Plaid integration endpoints
# Note: PlaidItem model removed from schema - plaid_item_id stored directly on Account

# @app.post("/plaid/sync/")
# def sync_plaid_data(
#     item_id: str,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Sync accounts and transactions from Plaid"""
#     plaid_item = db.query(PlaidItem).filter(
#         PlaidItem.item_id == item_id,
#         PlaidItem.user_id == current_user.id
#     ).first()
    
#     if not plaid_item:
#         raise HTTPException(status_code=404, detail="Plaid item not found")
    
#     try:
#         # Sync accounts
#         accounts_data = await plaid_service.get_accounts(plaid_item.access_token)
#         for account_data in accounts_data:
#             account = db.query(Account).filter(
#                 Account.account_id == account_data['account_id']
#             ).first()
            
#             if not account:
#                 account = Account(
#                     plaid_item_id=plaid_item.id,
#                     account_id=account_data['account_id'],
#                     name=account_data['name'],
#                     official_name=account_data.get('official_name'),
#                     type=account_data['type'],
#                     subtype=account_data.get('subtype'),
#                     mask=account_data.get('mask'),
#                     balance_available=account_data.get('balances', {}).get('available'),
#                     balance_current=account_data.get('balances', {}).get('current'),
#                     balance_limit=account_data.get('balances', {}).get('limit'),
#                     balance_iso_currency_code=account_data.get('balances', {}).get('iso_currency_code'),
#                     verification_status=account_data.get('verification_status')
#                 )
#                 db.add(account)
#             else:
#                 # Update existing account
#                 account.balance_available = account_data.get('balances', {}).get('available')
#                 account.balance_current = account_data.get('balances', {}).get('current')
#                 account.balance_limit = account_data.get('balances', {}).get('limit')
        
#         # Sync transactions
#         start_date = datetime.now().date() - timedelta(days=30)
#         end_date = datetime.now().date()
        
#         transactions_data = await plaid_service.get_transactions(
#             plaid_item.access_token, start_date, end_date
#         )
        
#         for transaction_data in transactions_data:
#             # Find the account for this transaction
#             account = db.query(Account).filter(
#                 Account.account_id == transaction_data['account_id']
#             ).first()
            
#             if not account:
#                 continue
                
#             transaction = db.query(Transaction).filter(
#                 Transaction.transaction_id == transaction_data['transaction_id']
#             ).first()
            
#             if not transaction:
#                 transaction = Transaction(
#                     account_id=account.id,
#                     transaction_id=transaction_data['transaction_id'],
#                     amount=transaction_data['amount'],
#                     iso_currency_code=transaction_data.get('iso_currency_code'),
#                     date=transaction_data['date'],
#                     datetime=transaction_data.get('datetime'),
#                     name=transaction_data['name'],
#                     merchant_name=transaction_data.get('merchant_name'),
#                     payment_channel=transaction_data.get('payment_channel'),
#                     pending=transaction_data.get('pending', False),
#                     plaid_category_id=transaction_data.get('category_id'),
#                     plaid_category=transaction_data.get('category', []),
#                     plaid_subcategory=transaction_data.get('subcategory', [])
#                 )
#                 db.add(transaction)
        
#         db.commit()
#         return {"message": "Data synced successfully", "accounts": len(accounts_data), "transactions": len(transactions_data)}
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to sync data: {str(e)}")

# Transaction endpoints
@app.get("/transactions/", response_model=List[TransactionResponse])
def get_transactions(
    account_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transactions with optional filtering"""
    # Get user's account IDs (simplified - in production, add user_id to Account or join through another table)
    query = db.query(Transaction).join(Account)
    
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if subcategory_id:
        query = query.filter(Transaction.custom_subcategory_id == subcategory_id)
    if category_id:
        # Filter by category through subcategory relationship
        query = query.join(Subcategory).filter(Subcategory.category_id == category_id)
    
    transactions = query.order_by(Transaction.date.desc()).all()
    return transactions

@app.post("/transactions/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction manually (independent of Plaid data)"""
    # Verify that the account exists
    account = db.query(Account).filter(Account.id == transaction.account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Create the transaction
    db_transaction = Transaction(
        account_id=transaction.account_id,
        plaid_transaction_id=transaction.plaid_transaction_id,
        amount=transaction.amount,
        iso_currency_code=transaction.iso_currency_code,
        date=transaction.date,
        datetime=transaction.datetime,
        name=transaction.name,
        merchant_name=transaction.merchant_name,
        merchant_entity_id=transaction.merchant_entity_id,
        logo_url=transaction.logo_url,
        website=transaction.website,
        pending=transaction.pending,
        authorized_date=transaction.authorized_date,
        authorized_datetime=transaction.authorized_datetime,
        transaction_type=transaction.transaction_type,
        custom_subcategory_id=transaction.custom_subcategory_id,
        notes=transaction.notes,
        tags=transaction.tags
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update transaction categorization and notes"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction_update.custom_subcategory_id is not None:
        transaction.custom_subcategory_id = transaction_update.custom_subcategory_id
    if transaction_update.notes is not None:
        transaction.notes = transaction_update.notes
    if transaction_update.tags is not None:
        transaction.tags = transaction_update.tags
    
    db.commit()
    db.refresh(transaction)
    return transaction

# Category management endpoints
@app.get("/categories/", response_model=List[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all categories (system and user-specific)"""
    categories = db.query(Category).filter(
        (Category.user_id == current_user.id) | (Category.is_system == True)
    ).order_by(Category.is_system.desc(), Category.name).all()
    return categories

@app.post("/categories/", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom category"""
    db_category = Category(
        name=category.name,
        description=category.description,
        color=category.color,
        icon=category.icon,
        user_id=current_user.id
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_update: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom category"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category.name = category_update.name
    category.description = category_update.description
    category.color = category_update.color
    category.icon = category_update.icon
    category.parent_id = category_update.parent_id
    
    db.commit()
    db.refresh(category)
    return category

@app.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom category"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category has subcategories
    subcategory_count = db.query(Subcategory).filter(
        Subcategory.category_id == category_id
    ).count()
    
    if subcategory_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete category. It has {subcategory_count} subcategories. Delete subcategories first."
        )
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}

# Subcategory management endpoints
@app.get("/subcategories/", response_model=List[SubcategoryResponse])
def get_subcategories(
    category_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subcategories (system and user-specific), optionally filtered by category"""
    query = db.query(Subcategory).filter(
        (Subcategory.user_id == current_user.id) | (Subcategory.is_system == True)
    )
    
    if category_id:
        query = query.filter(Subcategory.category_id == category_id)
    
    subcategories = query.order_by(Subcategory.is_system.desc(), Subcategory.name).all()
    return subcategories

@app.post("/subcategories/", response_model=SubcategoryResponse)
def create_subcategory(
    subcategory: SubcategoryCreate,
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom subcategory
    
    category_id is passed as a query parameter.
    """
    # Verify category exists and belongs to user or is system
    category = db.query(Category).filter(
        Category.id == category_id,
        ((Category.user_id == current_user.id) | (Category.is_system == True))
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_subcategory = Subcategory(
        name=subcategory.name,
        description=subcategory.description,
        color=subcategory.color,
        icon=subcategory.icon,
        category_id=category_id,
        user_id=current_user.id
    )
    db.add(db_subcategory)
    db.commit()
    db.refresh(db_subcategory)
    return db_subcategory

@app.put("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
def update_subcategory(
    subcategory_id: int,
    subcategory_update: SubcategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom subcategory"""
    subcategory = db.query(Subcategory).filter(
        Subcategory.id == subcategory_id,
        Subcategory.user_id == current_user.id
    ).first()
    
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    subcategory.name = subcategory_update.name
    subcategory.description = subcategory_update.description
    subcategory.color = subcategory_update.color
    subcategory.icon = subcategory_update.icon
    
    db.commit()
    db.refresh(subcategory)
    return subcategory

@app.delete("/subcategories/{subcategory_id}")
def delete_subcategory(
    subcategory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom subcategory"""
    subcategory = db.query(Subcategory).filter(
        Subcategory.id == subcategory_id,
        Subcategory.user_id == current_user.id
    ).first()
    
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    # Check if subcategory is being used by transactions
    transaction_count = db.query(Transaction).filter(
        Transaction.custom_subcategory_id == subcategory_id
    ).count()
    
    if transaction_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete subcategory. It is being used by {transaction_count} transactions."
        )
    
    db.delete(subcategory)
    db.commit()
    return {"message": "Subcategory deleted successfully"}

# Analytics endpoints
@app.get("/analytics/spending-by-category")
def get_spending_by_category(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending breakdown by category (using transactions_as_category relationship)"""
    query = db.query(Transaction).join(Account).filter(
        Transaction.amount < 0  # Only expenses
    )
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    transactions = query.all()
    
    # Group by category using the relationship
    category_totals = {}
    for transaction in transactions:
        category_name = "Uncategorized"
        if transaction.custom_subcategory_id:
            subcategory = db.query(Subcategory).filter(Subcategory.id == transaction.custom_subcategory_id).first()
            if subcategory and subcategory.category:
                category_name = subcategory.category.name
        
        if category_name not in category_totals:
            category_totals[category_name] = 0
        category_totals[category_name] += abs(transaction.amount)
    
    return category_totals

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)