import pyodbc
import psycopg2
from datetime import datetime, timedelta
import re

# PostgreSQL connection
pg_config = {
    'dbname': 'instaquote',
    'user': 'postgres',
    'password': 'admin',
    'host': 'localhost',
    'port': '5432'
}

def extract_sku(item_code):
    """Extract SKU from item_code using dash or digit logic"""
    if not item_code:
        return None
    
    # Skip 3-digit sizes -- todo: double-check this
    skip_sizes = ('100', '110', '120', '130', '160', '180', '500', '550', '600', '700', '750', '800', '850', '851', '900', '950')
    for skip in skip_sizes:
        if skip in item_code:
            return item_code
    
    # Remove size suffixes (10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 15.5, 16, 17, 18, 40, 4.5, 50, 5.5, 60, 6.25, 6.5, 70, 7.5, 80, 8.5, 90, 9.5) from anywhere in the string
    size_suffixes = ('105', '115', '125', '155', '50', '55', '40', '45', '60', '625', '65', '70', '75', '80', '85', '90', '95', '10', '11', '12', '13', '14', '15', '16', '17', '18')
    for suffix in size_suffixes:
        if suffix in item_code:
            return item_code.replace(suffix, '', 1)
    
    # Remove size name suffixes (SM, MD, LG) from anywhere in the string
    size_names = ('LG', 'MD', 'SM')
    for suffix in size_names:
        if suffix in item_code:
            return item_code.replace(suffix, '', 1)
    
    # No size found
    return item_code

def get_item_list(repo_cursor):
    """Get UNION of all BOM Header tables (Item List)"""
    item_list = []
    
    tables = [
        '6 - BOM Header-CBC',
        '6 - BOM Header-DestA-L',
        '6 - BOM Header-DestM-Z'
    ]
    
    for table in tables:
        repo_cursor.execute(f"SELECT * FROM [{table}] WHERE Inactive = False OR Inactive IS NULL")
        item_list.extend(repo_cursor.fetchall())
    
    return item_list

def get_costing_data(repo_cursor):
    """Get all Data tables separately (to track is_catalog)"""
    costing_by_catalog = {}  # Track by (item_code, is_catalog)
    
    tables = [
        ('Dest_A-L_Data', False),
        ('Dest_M-Z_Data', False),
        ('CBC_Data', True),
        ('SpecialtyData', False)
    ]
    
    for table, is_catalog in tables:
        repo_cursor.execute(f"SELECT * FROM [{table}]")
        for row in repo_cursor.fetchall():
            item_code = row[0]
            if item_code:
                key = (item_code, is_catalog)
                # Keep first occurrence for each (item_code, is_catalog) combination
                if key not in costing_by_catalog:
                    costing_by_catalog[key] = (row, is_catalog)
    
    return list(costing_by_catalog.values())

def get_categories(repo_cursor):
    """Get categories lookup"""
    repo_cursor.execute("SELECT Category, [Category Group], Sub FROM [1 - Categories]")
    return {row[0]: {'category_group': row[1], 'sub': row[2]} for row in repo_cursor.fetchall()}

def calculate_total_ws(item_code, description, total_ws):
    """Calculate Total WS$ with TITANIUM/IBLS logic"""
    if total_ws is None:
        return None
    
    # Convert to float if Decimal
    total_ws = float(total_ws)
    
    adjustment = 0
    
    if 'TITANIUM' in description.upper():
        adjustment = 14.5
    elif 'IBLS6' in item_code:
        adjustment = 17.5
    elif 'IBLS4' in item_code:
        adjustment = 16.5
    elif 'IBLS' in item_code:
        adjustment = 16.5
    
    return round(total_ws + adjustment, 2)
    
def import_items(pg_cursor):
    """Import items using Access query logic"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting import...")
    
    # Connect to Costing Repository
    repo_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        r"DBQ=T:\Costing Repository.mdb;"
    )
    repo_conn = pyodbc.connect(repo_conn_str)
    repo_cursor = repo_conn.cursor()
    
    # Excluded item codes from WHERE clause (**this is ported directly from Access 'Catalog – Export – Full' script)
    excluded_items = {
        'MARPWMD', 'USVIC465', 'FMC480', 'FMS465-R', 'FMS470-R',
        'FMS475-R', 'FMS480-R', 'CBVS680', 'CBVS665', 'CBVS670',
        'CBVS675', 'FMS675-R', 'FMS665-R', 'FMS680-R', 'FMS670-R', 'SAMPLE'
    }
    
    # Get all data
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Item List...")
    item_list = get_item_list(repo_cursor)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Costing Data...")
    costing_data = get_costing_data(repo_cursor)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Categories...")
    categories = get_categories(repo_cursor)
    
    # Build lookups
    # Item List columns: Item Code, Description, Destination, Cat, ibdesign, PO Cat, Cat Page, Cat Page Order, Inactive, LastUpdated
    item_lookup = {}
    for item in item_list:
        item_code = item[0]
        if item_code:
            item_lookup[item_code] = {
                'description': item[1],
                'destination': item[2],
                'cat': item[3],
                'inactive': item[8]
            }
    
    # Costing Data columns: Item Code, Description, [lots of $ fields], Total WS $, [more fields], Destination, Category Group, LastUpdated
    # Total WS $ is at index 64, Destination at 66, LastUpdated at 68
    costing_list = []
    for cost_row, is_catalog in costing_data:
        item_code = cost_row[0]
        if item_code:
            costing_list.append((
                item_code,
                {
                    'description': cost_row[1],
                    'total_ws': cost_row[64],
                    'destination': cost_row[66],
                    'last_updated': cost_row[68]
                },
                is_catalog
            ))
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing items...")
    
    count = 0
    # Join Item List with Costing Data and Categories
    for item_code, cost_data, is_catalog in costing_list:
        # Skip excluded items
        if item_code in excluded_items:
            continue
        
        # Must exist in item list
        if item_code not in item_lookup:
            continue
        
        item_data = item_lookup[item_code]
        
        # Must have Total WS $
        if cost_data['total_ws'] is None:
            continue
        
        # Get category info
        cat = item_data['cat']
        if cat not in categories:
            continue
        
        cat_info = categories[cat]
        
        # Replace description
        description = cost_data['description']
        if description:
            description = description.replace('INLAY BLANK', 'OPAL INLAY')
        
        # Calculate Total WS$
        total_ws = calculate_total_ws(item_code, item_data['description'] or '', cost_data['total_ws'])
        
        # Extract SKU
        sku = extract_sku(item_code)
        
        # Convert Access date (numeric) to Python datetime if needed
        last_updated = cost_data['last_updated']
        if isinstance(last_updated, (int, float)):
            # Access stores dates as days since 1899-12-30
            last_updated = datetime(1899, 12, 30) + timedelta(days=last_updated)
        
        # Insert into PostgreSQL
        pg_cursor.execute("""
            INSERT INTO inventory_items 
            (item_code, sku, description, category, destination, total_ws_price, inactive, is_catalog, last_updated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            item_code,
            sku,
            description,
            cat_info['category_group'],
            cost_data['destination'],
            total_ws,
            item_data['inactive'],
            is_catalog,
            last_updated
        ))
        count += 1
    
    repo_cursor.close()
    repo_conn.close()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    print(f"[{end_time.strftime('%H:%M:%S')}] Imported {count} items ({duration:.2f}s)")
    return count

def import_metal_prices(pg_cursor):
    """Import metal prices from Access to PostgreSQL"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Importing metal prices...")
    
    cbc_db_path = r"T:\Costing - CBC.mdb"
    cbc_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={cbc_db_path};"
    )
    cbc_conn = pyodbc.connect(cbc_conn_str)
    cbc_cursor = cbc_conn.cursor()
    
    cbc_cursor.execute("SELECT [SS Price], [Gold Price] FROM [1 - Metal Prices]")
    row = cbc_cursor.fetchone()
    
    if row:
        pg_cursor.execute("""
            INSERT INTO metal_prices (ss_price, gold_price, synced_at)
            VALUES (%s, %s, %s)
        """, (row[0], row[1], datetime.now()))
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[{end_time.strftime('%H:%M:%S')}] Imported metal prices: SS=${row[0]}, Gold=${row[1]} ({duration:.2f}s)")
    else:
        print("No metal prices found")
    
    cbc_cursor.close()
    cbc_conn.close()

def log_sync_start(pg_cursor):
    """Log the start of a sync"""
    pg_cursor.execute("""
        INSERT INTO sync_log (started_at, user_name, status, sync_type)
        VALUES (%s, 'schedule', 'running', 'access')        
        RETURNING id
    """, (datetime.now(),))
    return pg_cursor.fetchone()[0]

def log_sync_complete(pg_cursor, sync_id, started_at, items_synced):
    """Log successful sync completion"""
    completed_at = datetime.now()
    duration = (completed_at - started_at).total_seconds()
    pg_cursor.execute("""
        UPDATE sync_log
        SET completed_at = %s,
            duration_seconds = %s,
            items_synced = %s,
            status = 'success'
        WHERE id = %s
    """, (completed_at, duration, items_synced, sync_id))

def log_sync_error(pg_cursor, sync_id, started_at, error_message):
    """Log sync failure"""
    completed_at = datetime.now()
    duration = (completed_at - started_at).total_seconds()
    pg_cursor.execute("""
        UPDATE sync_log
        SET completed_at = %s,
            duration_seconds = %s,
            status = 'failed',
            error_message = %s
        WHERE id = %s
    """, (completed_at, duration, error_message, sync_id))

try:
    overall_start = datetime.now()
    print(f"\n{'='*60}")
    print(f"SYNC STARTED: {overall_start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    pg_conn = psycopg2.connect(**pg_config)
    pg_cursor = pg_conn.cursor()
    
    # Log sync start
    sync_id = log_sync_start(pg_cursor)
    pg_conn.commit()
    
    # Clear existing data
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Clearing existing inventory items...")
    pg_cursor.execute("DELETE FROM inventory_items")
    
    # Import items
    total = import_items(pg_cursor)
    
    # Import metal prices
    import_metal_prices(pg_cursor)
    
    # Log successful completion
    log_sync_complete(pg_cursor, sync_id, overall_start, total)
    
    # Commit transaction
    pg_conn.commit()
    
    overall_end = datetime.now()
    overall_duration = (overall_end - overall_start).total_seconds()
    
    print(f"\n{'='*60}")
    print(f"SYNC COMPLETED: {overall_end.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"TOTAL DURATION: {overall_duration:.2f}s")
    print(f"{'='*60}\n")
    
    pg_cursor.close()
    pg_conn.close()

except Exception as e:
    print(f"\nERROR: {e}")
    if 'pg_conn' in locals() and pg_conn:
        if 'sync_id' in locals():
            log_sync_error(pg_cursor, sync_id, overall_start, str(e))
        pg_conn.rollback()
        print("Transaction rolled back")
    import traceback
    traceback.print_exc()
finally:
    if 'pg_cursor' in locals() and pg_cursor:
        pg_cursor.close()
    if 'pg_conn' in locals() and pg_conn:
        pg_conn.close()