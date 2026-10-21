ALTER TABLE products
  ADD COLUMN vendor_id VARCHAR(36) NULL,
  ADD KEY products_vendor_active (vendor_id, is_active);
