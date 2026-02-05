-- Metal prices snapshot table
CREATE TABLE metal_prices (
    id SERIAL PRIMARY KEY,
    ss_price DECIMAL(10, 2) NOT NULL,
    gold_price DECIMAL(10, 2) NOT NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory items table (combines catalog and destination items)
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    sku VARCHAR(50),
    description VARCHAR(100) NOT NULL,
    cat_page INTEGER,
    cat_page_order INTEGER,
    category VARCHAR(50),
    destination VARCHAR(50),
    total_ws_price DECIMAL(10, 2) NOT NULL,
    is_catalog BOOLEAN NOT NULL,
    inactive BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_item_code ON inventory_items(item_code);
CREATE INDEX idx_sku ON inventory_items(sku);
CREATE INDEX idx_is_catalog ON inventory_items(is_catalog);
CREATE INDEX idx_destination ON inventory_items(destination);
CREATE INDEX idx_category ON inventory_items(category);

-- Dropbox files table
CREATE TABLE dropbox_files (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_name_no_ext TEXT NOT NULL,
    file_extension TEXT,
    folder_path TEXT NOT NULL,
    shared_link TEXT,
    file_size BIGINT,
    modified_date TIMESTAMP,
    dropbox_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_name_no_ext ON dropbox_files(file_name_no_ext);
CREATE INDEX idx_file_extension ON dropbox_files(file_extension);
CREATE INDEX idx_folder_path ON dropbox_files(folder_path);
CREATE INDEX idx_dropbox_files_shared_link ON dropbox_files(shared_link) WHERE shared_link IS NOT NULL;

CREATE TABLE sku_images (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  image_id INTEGER NOT NULL REFERENCES dropbox_files(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  match_type VARCHAR(20) CHECK (match_type IN ('exact', 'contains', 'manual')),
  confidence DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sku, image_id)
);
CREATE INDEX idx_sku_images_sku ON sku_images(sku);
CREATE INDEX idx_sku_images_image_id ON sku_images(image_id);
CREATE INDEX idx_sku_images_primary ON sku_images(sku, is_primary) WHERE is_primary = TRUE;

-- Sync log table
CREATE TABLE sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_seconds NUMERIC(10, 2),
    items_synced INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_log_type ON sync_log(sync_type);
CREATE INDEX idx_sync_log_user ON sync_log(user_name);
CREATE INDEX idx_sync_log_status ON sync_log(status);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- User orders + items tables
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    notes TEXT,
    deleted_at TIMESTAMP,
    deleted_by INTEGER,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    sku VARCHAR(50),
    description VARCHAR(100),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_code ON order_items(item_code);