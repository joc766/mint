from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, DECIMAL, ForeignKey, ARRAY, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    plaid_user_id = Column(String(255), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    plaid_items = relationship("PlaidItem", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="user", cascade="all, delete-orphan")

class PlaidItem(Base):
    __tablename__ = "plaid_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(String(255), unique=True, nullable=False)
    access_token = Column(String(255), nullable=False)
    institution_id = Column(String(255), nullable=False)
    institution_name = Column(String(255), nullable=False)
    webhook_url = Column(String(500))
    error_code = Column(String(50))
    error_message = Column(Text)
    available_products = Column(ARRAY(String))
    billed_products = Column(ARRAY(String))
    consent_expiration_time = Column(DateTime(timezone=True))
    update_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="plaid_items")
    accounts = relationship("Account", back_populates="plaid_item", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    plaid_item_id = Column(Integer, ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    official_name = Column(String(500))
    type = Column(String(50), nullable=False)
    subtype = Column(String(50))
    mask = Column(String(10))
    balance_available = Column(DECIMAL(15, 2))
    balance_current = Column(DECIMAL(15, 2))
    balance_limit = Column(DECIMAL(15, 2))
    balance_iso_currency_code = Column(String(3))
    verification_status = Column(String(50))
    persistent_account_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    plaid_item = relationship("PlaidItem", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="account", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7))
    icon = Column(String(50))
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    is_system = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side=[id])
    children = relationship("Category", back_populates="parent")
    transactions_as_category = relationship("Transaction", foreign_keys="Transaction.custom_category_id", back_populates="custom_category")
    transactions_as_subcategory = relationship("Transaction", foreign_keys="Transaction.custom_subcategory_id", back_populates="custom_subcategory")
    transaction_splits_as_category = relationship("TransactionSplit", foreign_keys="TransactionSplit.category_id", back_populates="category")
    transaction_splits_as_subcategory = relationship("TransactionSplit", foreign_keys="TransactionSplit.subcategory_id", back_populates="subcategory")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String(255), unique=True, nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    iso_currency_code = Column(String(3))
    unofficial_currency_code = Column(String(10))
    date = Column(DateTime(timezone=True), nullable=False)
    datetime = Column(DateTime(timezone=True))
    name = Column(String(500), nullable=False)
    merchant_name = Column(String(255))
    merchant_entity_id = Column(String(255))
    logo_url = Column(String(500))
    website = Column(String(500))
    authorized_date = Column(DateTime(timezone=True))
    authorized_datetime = Column(DateTime(timezone=True))
    location = Column(JSON)
    payment_meta = Column(JSON)
    payment_channel = Column(String(50))
    pending = Column(Boolean, default=False)
    pending_transaction_id = Column(String(255))
    account_owner = Column(String(255))
    transaction_code = Column(String(50))
    transaction_type = Column(String(50))
    
    # Custom categorization fields
    custom_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    custom_subcategory_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    notes = Column(Text)
    tags = Column(ARRAY(String))
    is_recurring = Column(Boolean, default=False)
    is_transfer = Column(Boolean, default=False)
    
    # Plaid category data
    plaid_category_id = Column(String(50))
    plaid_category = Column(ARRAY(String))
    plaid_subcategory = Column(ARRAY(String))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="transactions")
    custom_category = relationship("Category", foreign_keys=[custom_category_id], back_populates="transactions_as_category")
    custom_subcategory = relationship("Category", foreign_keys=[custom_subcategory_id], back_populates="transactions_as_subcategory")
    splits = relationship("TransactionSplit", back_populates="transaction", cascade="all, delete-orphan")

class TransactionSplit(Base):
    __tablename__ = "transaction_splits"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    subcategory_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="splits")
    category = relationship("Category", foreign_keys=[category_id], back_populates="transaction_splits_as_category")
    subcategory = relationship("Category", foreign_keys=[subcategory_id], back_populates="transaction_splits_as_subcategory")

class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    merchant_name = Column(String(255))
    average_amount = Column(DECIMAL(15, 2))
    frequency = Column(String(20))
    last_occurrence = Column(DateTime(timezone=True))
    next_expected_date = Column(DateTime(timezone=True))
    confidence_score = Column(DECIMAL(3, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="recurring_transactions")
    account = relationship("Account", back_populates="recurring_transactions")