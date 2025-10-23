-- Plaid API Database Schema
-- This schema supports Plaid API data with added categorization capabilities

-- Users table - stores user information and Plaid access tokens
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    plaid_user_id VARCHAR(255) UNIQUE, -- Plaid's internal user ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plaid items table - represents a connection to a financial institution
CREATE TABLE plaid_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(255) UNIQUE NOT NULL, -- Plaid item ID
    access_token VARCHAR(255) NOT NULL, -- Encrypted access token
    institution_id VARCHAR(255) NOT NULL, -- Plaid institution ID
    institution_name VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    error_code VARCHAR(50), -- Plaid error code if any
    error_message TEXT, -- Plaid error message if any
    available_products TEXT[], -- Array of available products
    billed_products TEXT[], -- Array of billed products
    consent_expiration_time TIMESTAMP,
    update_type VARCHAR(50), -- 'background', 'user_present', 'user_requested'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table - represents individual accounts from Plaid
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    plaid_item_id INTEGER REFERENCES plaid_items(id) ON DELETE CASCADE,
    account_id VARCHAR(255) UNIQUE NOT NULL, -- Plaid account ID
    name VARCHAR(255) NOT NULL,
    official_name VARCHAR(500),
    type VARCHAR(50) NOT NULL, -- 'depository', 'credit', 'loan', 'investment', 'other'
    subtype VARCHAR(50), -- 'checking', 'savings', 'credit_card', etc.
    mask VARCHAR(10), -- Last 4 digits of account number
    balance_available DECIMAL(15,2), -- Available balance
    balance_current DECIMAL(15,2), -- Current balance
    balance_limit DECIMAL(15,2), -- Credit limit
    balance_iso_currency_code VARCHAR(3), -- Currency code (USD, EUR, etc.)
    verification_status VARCHAR(50), -- 'automatically_verified', 'pending_automatic_verification', etc.
    persistent_account_id VARCHAR(255), -- Persistent account identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table - for custom transaction categorization
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code for UI
    icon VARCHAR(50), -- Icon identifier
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- For subcategories
    is_system BOOLEAN DEFAULT FALSE, -- System-defined vs user-defined
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL for system categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table - stores transaction data from Plaid
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) UNIQUE NOT NULL, -- Plaid transaction ID
    amount DECIMAL(15,2) NOT NULL,
    iso_currency_code VARCHAR(3),
    unofficial_currency_code VARCHAR(10),
    date DATE NOT NULL,
    datetime TIMESTAMP, -- More precise timestamp if available
    name VARCHAR(500) NOT NULL,
    merchant_name VARCHAR(255),
    merchant_entity_id VARCHAR(255),
    logo_url VARCHAR(500),
    website VARCHAR(500),
    authorized_date DATE,
    authorized_datetime TIMESTAMP,
    location JSONB, -- Store location data as JSON
    payment_meta JSONB, -- Store payment metadata as JSON
    payment_channel VARCHAR(50), -- 'online', 'in_store', 'atm', etc.
    pending BOOLEAN DEFAULT FALSE,
    pending_transaction_id VARCHAR(255),
    account_owner VARCHAR(255),
    transaction_code VARCHAR(50),
    transaction_type VARCHAR(50), -- 'place', 'digital', 'special', 'unresolved'
    -- Custom categorization fields
    custom_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    custom_subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    notes TEXT, -- User notes
    tags TEXT[], -- Array of user-defined tags
    is_recurring BOOLEAN DEFAULT FALSE,
    is_transfer BOOLEAN DEFAULT FALSE,
    -- Plaid category data (stored as arrays)
    plaid_category_id VARCHAR(50),
    plaid_category TEXT[], -- Array of category strings from Plaid
    plaid_subcategory TEXT[], -- Array of subcategory strings from Plaid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction splits table - for split transactions
CREATE TABLE transaction_splits (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring transactions table - for identifying recurring patterns
CREATE TABLE recurring_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    merchant_name VARCHAR(255),
    average_amount DECIMAL(15,2),
    frequency VARCHAR(20), -- 'weekly', 'monthly', 'yearly', etc.
    last_occurrence DATE,
    next_expected_date DATE,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_name ON transactions(name);
CREATE INDEX idx_transactions_custom_category ON transactions(custom_category_id);
CREATE INDEX idx_transactions_plaid_category ON transactions(plaid_category_id);
CREATE INDEX idx_accounts_plaid_item_id ON accounts(plaid_item_id);
CREATE INDEX idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Insert default system categories
INSERT INTO categories (name, description, is_system, color, icon) VALUES
('Food & Dining', 'Restaurants, groceries, and food-related expenses', TRUE, '#FF6B6B', 'restaurant'),
('Transportation', 'Gas, public transit, rideshare, and vehicle expenses', TRUE, '#4ECDC4', 'car'),
('Shopping', 'Retail purchases, clothing, and general merchandise', TRUE, '#45B7D1', 'shopping'),
('Entertainment', 'Movies, games, subscriptions, and leisure activities', TRUE, '#96CEB4', 'entertainment'),
('Bills & Utilities', 'Rent, utilities, phone, internet, and recurring bills', TRUE, '#FFEAA7', 'bills'),
('Healthcare', 'Medical expenses, pharmacy, and health-related costs', TRUE, '#DDA0DD', 'healthcare'),
('Education', 'School, courses, books, and educational expenses', TRUE, '#98D8C8', 'education'),
('Travel', 'Hotels, flights, vacation, and travel expenses', TRUE, '#F7DC6F', 'travel'),
('Income', 'Salary, freelance, investments, and other income', TRUE, '#82E0AA', 'income'),
('Transfer', 'Money transfers between accounts', TRUE, '#BB8FCE', 'transfer'),
('Other', 'Miscellaneous expenses not fitting other categories', TRUE, '#85C1E9', 'other');

-- Insert subcategories for major categories
INSERT INTO categories (name, description, parent_id, is_system, color, icon) VALUES
-- Food & Dining subcategories
('Groceries', 'Grocery store purchases', 1, TRUE, '#FF6B6B', 'grocery'),
('Restaurants', 'Dining out at restaurants', 1, TRUE, '#FF6B6B', 'restaurant'),
('Fast Food', 'Quick service restaurants', 1, TRUE, '#FF6B6B', 'fast-food'),
('Coffee & Tea', 'Coffee shops and tea houses', 1, TRUE, '#FF6B6B', 'coffee'),

-- Transportation subcategories
('Gas', 'Fuel for vehicles', 2, TRUE, '#4ECDC4', 'gas'),
('Public Transit', 'Buses, trains, subways', 2, TRUE, '#4ECDC4', 'transit'),
('Rideshare', 'Uber, Lyft, and similar services', 2, TRUE, '#4ECDC4', 'rideshare'),
('Parking', 'Parking fees and permits', 2, TRUE, '#4ECDC4', 'parking'),

-- Shopping subcategories
('Clothing', 'Apparel and accessories', 3, TRUE, '#45B7D1', 'clothing'),
('Electronics', 'Computers, phones, gadgets', 3, TRUE, '#45B7D1', 'electronics'),
('Home & Garden', 'Furniture, decor, tools', 3, TRUE, '#45B7D1', 'home'),
('Online Shopping', 'E-commerce purchases', 3, TRUE, '#45B7D1', 'online-shopping'),

-- Bills & Utilities subcategories
('Rent/Mortgage', 'Housing payments', 5, TRUE, '#FFEAA7', 'rent'),
('Electricity', 'Electric utility bills', 5, TRUE, '#FFEAA7', 'electricity'),
('Water', 'Water utility bills', 5, TRUE, '#FFEAA7', 'water'),
('Internet', 'Internet service bills', 5, TRUE, '#FFEAA7', 'internet'),
('Phone', 'Mobile and landline bills', 5, TRUE, '#FFEAA7', 'phone');