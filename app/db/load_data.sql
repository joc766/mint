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