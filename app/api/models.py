from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, DECIMAL, ForeignKey, ARRAY, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from api.database import Base

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
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    subcategories = relationship("Subcategory", back_populates="user", cascade="all, delete-orphan")
    budget_settings = relationship("UserBudgetSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    budget_templates = relationship("BudgetTemplate", back_populates="user", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    plaid_item_id = Column(Integer)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7))
    icon = Column(String(50))
    is_system = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="categories")
    subcategories = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan")
    # Direct transactions assigned to this category
    transactions_as_custom_category = relationship("Transaction", foreign_keys="Transaction.custom_category_id", back_populates="custom_category")
    # Transactions where subcategory belongs to this category (parent-child relationship)
    # Gets all transactions whose subcategory has this category as its parent
    transactions_as_category = relationship(
        "Transaction",
        secondary="subcategories",
        primaryjoin="Category.id == Subcategory.category_id",
        secondaryjoin="Subcategory.id == Transaction.custom_subcategory_id",
        viewonly=True
    )
    
    # Unique constraint: each user can only have one category with the same name
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_category_name'),
    )

class Subcategory(Base):
    __tablename__ = "subcategories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    description = Column(Text)
    color = Column(String(7))
    icon = Column(String(50))
    is_system = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subcategories")
    category = relationship("Category", back_populates="subcategories")
    transactions_as_subcategory = relationship("Transaction", foreign_keys="Transaction.custom_subcategory_id", back_populates="custom_subcategory")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True)
    plaid_transaction_id = Column(String(255), unique=True)
    amount = Column(DECIMAL(15, 2), nullable=False)
    iso_currency_code = Column(String(3))
    date = Column(DateTime(timezone=True), nullable=False)
    datetime = Column(DateTime(timezone=True))
    name = Column(String(500), nullable=False)
    merchant_name = Column(String(255))
    merchant_entity_id = Column(String(255))
    logo_url = Column(String(500))
    website = Column(String(500))
    authorized_date = Column(DateTime(timezone=True))
    authorized_datetime = Column(DateTime(timezone=True))
    pending = Column(Boolean, default=False)
    transaction_type = Column(String(50))
    
    # Custom categorization fields
    custom_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    custom_subcategory_id = Column(Integer, ForeignKey("subcategories.id", ondelete="SET NULL"))
    notes = Column(Text)
    tags = Column(ARRAY(String))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="transactions")
    custom_category = relationship("Category", foreign_keys=[custom_category_id], back_populates="transactions_as_custom_category")
    custom_subcategory = relationship("Subcategory", foreign_keys=[custom_subcategory_id], back_populates="transactions_as_subcategory")

class UserBudgetSettings(Base):
    """User's budget settings: monthly income and savings goal"""
    __tablename__ = "user_budget_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    monthly_income = Column(DECIMAL(15, 2), nullable=False)
    monthly_savings_goal = Column(DECIMAL(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budget_settings")

class BudgetTemplate(Base):
    """User's monthly budget - budget configuration by category/subcategory for a specific month"""
    __tablename__ = "budget_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)  # Month number (1-12)
    year = Column(Integer, nullable=False)  # Year (e.g., 2024)
    total_budget = Column(DECIMAL(15, 2), nullable=False)  # Total budget for the month
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budget_templates")
    entries = relationship("BudgetTemplateEntry", back_populates="template", cascade="all, delete-orphan")
    
    # Unique constraint: one budget per user per month/year
    __table_args__ = (
        UniqueConstraint('user_id', 'year', 'month', name='uq_user_monthly_budget'),
    )

class BudgetTemplateEntry(Base):
    """Individual budget entry for a category or subcategory"""
    __tablename__ = "budget_template_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("budget_templates.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id", ondelete="CASCADE"), nullable=True)
    budgeted_amount = Column(DECIMAL(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    template = relationship("BudgetTemplate", back_populates="entries")
    category = relationship("Category")
    subcategory = relationship("Subcategory")
    
    # Unique constraint: one entry per category/subcategory per template
    __table_args__ = (
        UniqueConstraint('template_id', 'category_id', 'subcategory_id', name='uq_template_entry'),
    )

