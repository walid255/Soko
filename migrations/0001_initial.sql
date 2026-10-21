CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  password_iterations INT NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'vendor',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_phone_unique (phone),
  KEY users_role_status (role, status)
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) NOT NULL,
  swahili_name VARCHAR(160) NOT NULL,
  english_name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  price_tzs INT UNSIGNED NOT NULL,
  weight_kg DECIMAL(10, 2) UNSIGNED NOT NULL,
  unit VARCHAR(80) NOT NULL,
  image_url VARCHAR(1024) NOT NULL,
  hub_availability TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY products_active_category (is_active, category)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  items_json MEDIUMTEXT NOT NULL,
  total_tzs INT UNSIGNED NOT NULL,
  weight_kg DECIMAL(10, 2) UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
  payment_method VARCHAR(32) NOT NULL,
  payment_phone VARCHAR(32) NOT NULL,
  hub VARCHAR(100) NOT NULL,
  delivery_slot VARCHAR(80) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  pin_hash VARCHAR(128) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY orders_user_date (user_id, created_at),
  KEY orders_status_date (status, created_at)
);

CREATE TABLE IF NOT EXISTS admin_bootstrap_lock (
  id TINYINT UNSIGNED NOT NULL,
  owner_id VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY admin_bootstrap_owner (owner_id)
);

INSERT IGNORE INTO products
  (id, swahili_name, english_name, category, price_tzs, weight_kg, unit, image_url, hub_availability, is_active)
VALUES
  ('prod-1', 'Mchele wa Kyela (25kg)', 'Kyela Super Rice (25kg)', 'Grains', 65000, 25, 'Gunia Dogo', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Kigamboni Stand 12","Ilala Market"]', 1),
  ('prod-2', 'Mahindi Lishe Safi (50kg)', 'Clean Grain Maize (50kg)', 'Grains', 48000, 50, 'Gunia Kubwa', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Mbeya Central","Arusha Central"]', 1),
  ('prod-3', 'Nyanya za Tengeru (Tenga)', 'Fresh Tomatoes Crate', 'Vegetables', 35000, 20, 'Tenga', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Kigamboni Stand 12","Arusha Central"]', 1),
  ('prod-4', 'Vitunguu Maji Sumbawanga (10kg)', 'Red Onions Bag (10kg)', 'Vegetables', 22000, 10, 'Mfuko', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cf?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Ilala Market","Mbeya Central"]', 1),
  ('prod-5', 'Mafuta ya Kula Safi (Dumu Lita 20)', 'Refined Cooking Oil (20L)', 'Cooking Oil', 82000, 18, 'Dumu 20L', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Kigamboni Stand 12","Ilala Market","Arusha Central"]', 1),
  ('prod-6', 'Trei la Mayai ya Kienyeji (Trei 5)', 'Local Eggs Bundle (5 Trays)', 'Poultry', 45000, 8, 'Trei 5', 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80', '["Kariakoo Hub","Kigamboni Stand 12"]', 1);
