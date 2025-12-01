"""
Mass Import Service for Transaction Data

This service handles bulk importing of transactions from CSV/external data sources.
It mirrors the Plaid API data structure while supporting optional categorization fields.
"""

from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session

from api.models import User, Account, Transaction, Category, Subcategory, BudgetTemplate, BudgetTemplateEntry, user_accounts
from api.schemas import (
    MassImportTransactionRow,
    MassImportRequest,
    MassImportResponse,
    MassImportTransactionResult,
    MassImportAccountResult,
    UnrecognizedCategorization,
)


def build_account_cache(user_id: int, db: Session) -> Dict[str, Account]:
    """
    Build a cache of existing accounts (by lowercase name) for the user.
    Returns a dict mapping lowercase account names to Account objects.
    """
    accounts = db.query(Account).join(Account.users).filter(User.id == user_id).all()
    return {account.name.lower(): account for account in accounts}


def build_category_cache(user_id: int, db: Session) -> Dict[str, Category]:
    """
    Build a cache of existing categories (by lowercase name) for the user.
    Includes both user-specific and system categories.
    """
    categories = db.query(Category).filter(
        (Category.user_id == user_id) | (Category.is_system == True)
    ).all()
    return {category.name.lower(): category for category in categories}


def build_subcategory_cache(user_id: int, db: Session) -> Dict[str, List[Subcategory]]:
    """
    Build a cache of existing subcategories (by lowercase name) for the user.
    Returns a dict mapping lowercase subcategory names to list of Subcategory objects
    (since same name can exist under different categories).
    """
    subcategories = db.query(Subcategory).filter(
        (Subcategory.user_id == user_id) | (Subcategory.is_system == True)
    ).all()
    
    cache: Dict[str, List[Subcategory]] = {}
    for subcategory in subcategories:
        key = subcategory.name.lower()
        if key not in cache:
            cache[key] = []
        cache[key].append(subcategory)
    
    return cache


def resolve_account(
    account_name: Optional[str],
    account_type: Optional[str],
    account_subtype: Optional[str],
    user: User,
    db: Session,
    account_cache: Dict[str, Account],
    created_accounts: Dict[str, MassImportAccountResult],
    used_accounts: Dict[str, MassImportAccountResult],
) -> Optional[int]:
    """
    Find or create an account by name.
    
    Returns the account_id or None if no account_name provided.
    Updates account_cache, created_accounts, and used_accounts as side effects.
    """
    if not account_name:
        return None
    
    account_name_lower = account_name.lower()
    
    # Check if we already have this account in cache
    if account_name_lower in account_cache:
        account = account_cache[account_name_lower]
        # Track as used account (if not already tracked)
        if account_name_lower not in used_accounts and account_name_lower not in created_accounts:
            used_accounts[account_name_lower] = MassImportAccountResult(
                account_name=account.name,
                account_id=account.id,
                created=False,
                account_type=account.type
            )
        return account.id
    
    # Account doesn't exist - create it
    new_account = Account(
        name=account_name,
        type=account_type or "other",
        subtype=account_subtype,
    )
    db.add(new_account)
    db.flush()  # Get the ID
    
    # Associate with user
    new_account.users.append(user)
    
    # Update cache
    account_cache[account_name_lower] = new_account
    
    # Track as created account
    created_accounts[account_name_lower] = MassImportAccountResult(
        account_name=new_account.name,
        account_id=new_account.id,
        created=True,
        account_type=new_account.type
    )
    
    return new_account.id


def resolve_categorization(
    row_index: int,
    category_name: Optional[str],
    subcategory_name: Optional[str],
    user_id: int,
    db: Session,
    category_cache: Dict[str, Category],
    subcategory_cache: Dict[str, List[Subcategory]],
    unrecognized: List[UnrecognizedCategorization],
) -> Tuple[Optional[int], Optional[int], List[str]]:
    """
    Resolve category and subcategory names to IDs.
    
    Returns (category_id, subcategory_id, warnings).
    Appends to unrecognized list if category/subcategory not found.
    """
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    warnings: List[str] = []
    
    if not category_name and not subcategory_name:
        return None, None, []
    
    # Resolve category if provided
    if category_name:
        category_name_lower = category_name.lower()
        if category_name_lower in category_cache:
            category_id = category_cache[category_name_lower].id
        else:
            unrecognized.append(UnrecognizedCategorization(
                row_index=row_index,
                category_name=category_name,
                subcategory_name=subcategory_name,
                reason="category_not_found"
            ))
            warnings.append(f"Category '{category_name}' not found")
            # If category not found, we can't match subcategory either
            if subcategory_name:
                warnings.append(f"Subcategory '{subcategory_name}' skipped because category not found")
            return None, None, warnings
    
    # Resolve subcategory if provided
    if subcategory_name:
        subcategory_name_lower = subcategory_name.lower()
        if subcategory_name_lower in subcategory_cache:
            matching_subcategories = subcategory_cache[subcategory_name_lower]
            
            if category_id:
                # Find subcategory that belongs to the specified category
                matching = [s for s in matching_subcategories if s.category_id == category_id]
                if matching:
                    subcategory_id = matching[0].id
                else:
                    # Subcategory exists but not under this category
                    unrecognized.append(UnrecognizedCategorization(
                        row_index=row_index,
                        category_name=category_name,
                        subcategory_name=subcategory_name,
                        reason="subcategory_mismatch"
                    ))
                    warnings.append(f"Subcategory '{subcategory_name}' exists but not under category '{category_name}'")
            else:
                # No category specified - use the first matching subcategory
                subcategory = matching_subcategories[0]
                subcategory_id = subcategory.id
                # Also set the category_id from the subcategory's parent
                category_id = subcategory.category_id
        else:
            unrecognized.append(UnrecognizedCategorization(
                row_index=row_index,
                category_name=category_name,
                subcategory_name=subcategory_name,
                reason="subcategory_not_found"
            ))
            warnings.append(f"Subcategory '{subcategory_name}' not found")
    
    return category_id, subcategory_id, warnings


def auto_create_monthly_budget_from_default(
    db: Session,
    user_id: int,
    year: int,
    month: int
) -> bool:
    """
    Auto-create a monthly budget from the default template if it doesn't exist.
    Returns True if a new budget was created, False otherwise.
    """
    # Check if monthly budget already exists
    existing_monthly = db.query(BudgetTemplate).filter(
        BudgetTemplate.user_id == user_id,
        BudgetTemplate.year == year,
        BudgetTemplate.month == month,
        BudgetTemplate.is_default == False
    ).first()
    
    if existing_monthly:
        return False
    
    # Check if default budget exists
    default_budget = db.query(BudgetTemplate).filter(
        BudgetTemplate.user_id == user_id,
        BudgetTemplate.is_default == True
    ).first()
    
    if not default_budget:
        return False
    
    # Create new monthly budget from default
    new_monthly_budget = BudgetTemplate(
        user_id=user_id,
        month=month,
        year=year,
        is_default=False,
        total_budget=default_budget.total_budget
    )
    db.add(new_monthly_budget)
    db.flush()
    
    # Copy budget entries from default
    for default_entry in default_budget.entries:
        new_entry = BudgetTemplateEntry(
            template_id=new_monthly_budget.id,
            category_id=default_entry.category_id,
            subcategory_id=default_entry.subcategory_id,
            budgeted_amount=default_entry.budgeted_amount
        )
        db.add(new_entry)
    
    return True


def process_mass_import(
    request: MassImportRequest,
    user: User,
    db: Session
) -> MassImportResponse:
    """
    Process mass import of transactions.
    
    This is the main orchestration function that:
    1. Builds caches of existing accounts, categories, and subcategories
    2. Processes each transaction row
    3. Creates accounts as needed
    4. Resolves categorization (with warnings for unrecognized)
    5. Creates transactions
    6. Auto-creates monthly budgets as needed
    7. Returns comprehensive results
    """
    # Build caches
    account_cache = build_account_cache(user.id, db)
    category_cache = build_category_cache(user.id, db)
    subcategory_cache = build_subcategory_cache(user.id, db)
    
    # Track results
    transaction_results: List[MassImportTransactionResult] = []
    created_accounts: Dict[str, MassImportAccountResult] = {}
    used_accounts: Dict[str, MassImportAccountResult] = {}
    unrecognized_categorizations: List[UnrecognizedCategorization] = []
    budgets_created: Set[Tuple[int, int]] = set()  # Set of (year, month)
    
    successful_imports = 0
    failed_imports = 0
    
    # Track existing plaid_transaction_ids to detect duplicates
    existing_plaid_ids: Set[str] = set()
    if any(row.plaid_transaction_id for row in request.transactions):
        existing = db.query(Transaction.plaid_transaction_id).filter(
            Transaction.user_id == user.id,
            Transaction.plaid_transaction_id.isnot(None)
        ).all()
        existing_plaid_ids = {t[0] for t in existing}
    
    # Process each row
    for idx, row in enumerate(request.transactions):
        warnings: List[str] = []
        error: Optional[str] = None
        transaction_id: Optional[int] = None
        
        try:
            # Check for duplicate plaid_transaction_id
            if row.plaid_transaction_id and row.plaid_transaction_id in existing_plaid_ids:
                warnings.append(f"Duplicate plaid_transaction_id '{row.plaid_transaction_id}' - skipping")
                transaction_results.append(MassImportTransactionResult(
                    row_index=idx,
                    success=False,
                    error="Duplicate plaid_transaction_id",
                    warnings=warnings
                ))
                failed_imports += 1
                continue
            
            # Resolve account
            account_id = resolve_account(
                account_name=row.account_name,
                account_type=row.account_type,
                account_subtype=row.account_subtype,
                user=user,
                db=db,
                account_cache=account_cache,
                created_accounts=created_accounts,
                used_accounts=used_accounts,
            )
            
            # Resolve categorization
            category_id, subcategory_id, cat_warnings = resolve_categorization(
                row_index=idx,
                category_name=row.category_name,
                subcategory_name=row.subcategory_name,
                user_id=user.id,
                db=db,
                category_cache=category_cache,
                subcategory_cache=subcategory_cache,
                unrecognized=unrecognized_categorizations,
            )
            warnings.extend(cat_warnings)
            
            # Create transaction
            transaction = Transaction(
                user_id=user.id,
                account_id=account_id,
                plaid_transaction_id=row.plaid_transaction_id,
                amount=row.amount,
                iso_currency_code=row.iso_currency_code,
                date=row.date,
                name=row.name,
                merchant_name=row.merchant_name,
                pending=row.pending or False,
                transaction_type=row.transaction_type,
                custom_category_id=category_id,
                custom_subcategory_id=subcategory_id,
                notes=row.notes,
                tags=row.tags,
            )
            db.add(transaction)
            db.flush()
            transaction_id = transaction.id
            
            # Track plaid_transaction_id to prevent duplicates within this import
            if row.plaid_transaction_id:
                existing_plaid_ids.add(row.plaid_transaction_id)
            
            # Track month/year for budget auto-creation
            trans_date = row.date
            budget_key = (trans_date.year, trans_date.month)
            if budget_key not in budgets_created:
                if auto_create_monthly_budget_from_default(db, user.id, trans_date.year, trans_date.month):
                    budgets_created.add(budget_key)
            
            successful_imports += 1
            
        except Exception as e:
            error = str(e)
            failed_imports += 1
        
        transaction_results.append(MassImportTransactionResult(
            row_index=idx,
            success=error is None,
            transaction_id=transaction_id,
            error=error,
            warnings=warnings
        ))
    
    # Commit all changes
    db.commit()
    
    # Convert budgets_created set to list of dicts
    budgets_created_list = [{"year": year, "month": month} for year, month in sorted(budgets_created)]
    
    return MassImportResponse(
        total_rows=len(request.transactions),
        successful_imports=successful_imports,
        failed_imports=failed_imports,
        accounts_created=list(created_accounts.values()),
        accounts_used=list(used_accounts.values()),
        unrecognized_categorizations=unrecognized_categorizations,
        transaction_results=transaction_results,
        budgets_created=budgets_created_list
    )
