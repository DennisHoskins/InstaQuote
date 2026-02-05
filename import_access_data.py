import pyodbc
import psycopg2
from datetime import datetime
import sys

# PostgreSQL connection
pg_config = {
    'dbname': 'instaquote',
    'user': 'postgres',
    'password': 'admin',
    'host': 'localhost',
    'port': '5432'
}

# Access database paths
CBC_DB_PATH = r"T:\Costing - CBC.mdb"
DESTINATION_DBS = [
    r"T:\Costing - Destination A-L.mdb",
    r"T:\Costing - Destination M-Z.mdb",
]

# Character substitutions
CHAR_SUBSTITUTIONS = {
    'Ñ': 'N',
    '╤': 'N',
}

# Destinations to skip entirely (case insensitive)
SKIP_DESTINATIONS = [
    '---',
    '1CBIMAP',
    'BEADS',
]

# Patterns to skip (if destination contains these)
SKIP_PATTERNS = [
    ' BEAD',
]

# Destination aliases - map variations to canonical name
DESTINATION_ALIASES = {
    # Typos / spelling variations
    'ANNA MARIA ISLAND': ['Anna Maria Island'],
    'NEWPORT': ['NEW PORT'],
    'VIRGINIA TECH': ['VIRINGIA TECH', 'VIRGNIA TECH', 'VIRGINIA TECH LOGO'],
    'VIRGINIA BEACH': ['VIRGNIA BEACH'],
    'US VIRGIN ISLANDS': ['US VIRIGIN ISLANDS', 'USVI HOOK'],
    'FLORIDA STATE UNIVERSITY': ['FLORIDA STATE UNIVESRITY', 'FLORIDA STATE UNVERSITY'],
    'UNIVERSITY OF TENNESSEE': ['UT HOOK UNVERSITY'],
    'WEST VIRGINIA UNIVERSITY': ['WEST VIRGINIA UNIVERSITY HOOK'],
    'SOUTHPORT': ['South Port', 'SOUTH PORT'],
    
    # Consolidate numbered/special versions
    'GULF SHORES': ['GULF SHORES II'],
    'STONE HARBOR': ['STONE HARBOR II', 'STONE HARBOR BIRD SANCTUARY'],
    'LIBERTY UNIVERSITY': ['LIBERTY UNIVERSITY II'],
    'UNIVERSITY OF WASHINGTON': ['UNIVERSITY OF WASHINGTON 01'],
    'AVALON': ['AVALON II'],
    
    # Consolidate location specials/anniversaries
    'OCEAN CITY NJ': ['OC NJ ANNIVERSARY', 'OC NJ BEACH TAG', 'OC NJ JH', 'OC NJ SPECIAL'],
    'OCEAN CITY MD': ['OC MD ANNIVERSARY', 'OC HENRY\'S SPECIAL'],
    'CAPE MAY': ['CAPE MAY ANI', 'CAPE MAY SPECIAL'],
    'KEY WEST': ['KEY WEST CHARMS', 'KW SPECIAL'],
    'MARCO ISLAND': ['MARCO SPECIAL'],
    'LONG BEACH ISLAND': ['LBI SPECIAL'],
    'SUN VALLEY': ['SUN VALLEY ID', 'SUN VALLEY SPECIAL'],
    'ST PETERSBURG': ['ST PETERSBURG SPECIAL'],
    'MORRO BAY': ['MORRO BAY SPECIAL', 'MORRO ROCK'],
    'NEW BERN NC': ['NEW BERN NC ANNIVERSARY'],
    'HOC': ['HOC SPECIAL'],
    'PALM BEACH': ['PALM BEACH GARDEN'],
    
    # Consolidate palm/lizard variations
    'CAPE COD': ['CAPE COD FISH', 'CAPE COD SHELL'],
    'ST CROIX': ['ST CROIX LIZARD', 'ST CROIX PALM'],
    'ST JOHN': ['ST JOHN LIZARD', 'ST JOHN PALM', 'JD ST JOHN'],
    'ST THOMAS': ['ST THOMAS LIZARD', 'ST THOMAS PALM'],
    'ST MARTIN': ['ST MARTIN LIZARD', 'SXM HOOK'],
    'SURF CITY': ['SURF CITY SHELL'],
    
    # Consolidate logo variations
    'GEORGE TOWN': ['GEORGE TOWN LOGO'],
    
    # Consolidate equestrian
    'EQUESTRIAN': ['EQUIESTRIAN 1', 'EQUIESTRIAN 2', 'EQUIESTRIAN 3', 'EQUESTRIAN 1', 'EQUESTRIAN 2', 'EQUESTRIAN 3'],
    
    # Consolidate universities
    'UNIVERSITY OF SOUTH CAROLINA': ['UNI OF SOUTH CAROLINA GAMECOCKS', 'UNI SOUTH CAROLINA BASEBALL MARKS'],
    'WILLIAM AND MARY': ['W AND M UNIVERSITY'],
    
    # Fort variations
    'FORT MYERS': ['FT MYERS HOOK', 'FT. LAUDERDALE'],
    
    # Jamaica consolidation
    'JAMAICA': ['AZURA JAMAICA', 'CHULANI JAMAICA', 'JAM FLAG HOOK'],
}

# Build reverse lookup
DESTINATION_MAP = {}
for canonical, variations in DESTINATION_ALIASES.items():
    for variation in variations:
        DESTINATION_MAP[variation] = canonical
    DESTINATION_MAP[canonical] = canonical

def clean_destination(destination):
    """Clean and normalize destination name"""
    if not destination:
        return None
    
    # Character substitutions
    for old_char, new_char in CHAR_SUBSTITUTIONS.items():
        destination = destination.replace(old_char, new_char)
    
    # Skip if in skip list (case insensitive)
    if destination.upper().strip() in [s.upper() for s in SKIP_DESTINATIONS]:
        return None
    
    # Skip if matches a pattern (case insensitive)
    dest_upper = destination.upper()
    for pattern in SKIP_PATTERNS:
        if pattern in dest_upper:
            return None
    
    # Map to canonical name if alias exists
    destination = DESTINATION_MAP.get(destination, destination)
    
    return destination

def extract_sku(item_code):
    """Extract SKU from item_code using dash or digit logic"""
    if not item_code:
        return None
    
    # Skip 3-digit sizes
    skip_sizes = ('100', '110', '120', '130', '160', '180', '500', '550', '600', '700', '750', '800', '850', '851', '900', '950')
    for skip in skip_sizes:
        if skip in item_code:
            return item_code
    
    # Remove size suffixes
    size_suffixes = ('105', '115', '125', '155', '50', '55', '40', '45', '60', '625', '65', '70', '75', '80', '85', '90', '95', '10', '11', '12', '13', '14', '15', '16', '17', '18')
    for suffix in size_suffixes:
        if suffix in item_code:
            return item_code.replace(suffix, '', 1)
    
    # Remove size name suffixes (SM, MD, LG)
    size_names = ('LG', 'MD', 'SM')
    for suffix in size_names:
        if suffix in item_code:
            return item_code.replace(suffix, '', 1)
    
    return item_code


def nvl(value, default=0.0):
    """Return default if value is None, otherwise return float"""
    if value is None:
        return default
    return float(value)


def log_sync_start(pg_cursor, sync_type):
    """Log the start of a sync"""
    pg_cursor.execute("""
        INSERT INTO sync_log (started_at, user_name, status, sync_type)
        VALUES (%s, 'schedule', 'running', %s)        
        RETURNING id
    """, (datetime.now(), sync_type))
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


def sync_catalog(pg_cursor):
    """Sync catalog items from Access to PostgreSQL"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting Catalog sync...")
    
    # Connect to Access
    access_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={CBC_DB_PATH};"
    )
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    try:
        # Load catalog items from BOM Header
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading BOM Header...")
        access_cursor.execute("""
            SELECT 
                [6 - BOM Header].[Item Code],
                [6 - BOM Header].[Description],
                [6 - BOM Header].[Cat],
                [6 - BOM Header].[Cat Page],
                [6 - BOM Header].[Cat Page Order],
                [6 - BOM Header].[Destination],
                [6 - BOM Header].[Inactive],
                [6 - BOM Header].[LastUpdated]
            FROM [6 - BOM Header]
            WHERE 
                [6 - BOM Header].[PO Cat] = 'Catalog' 
                AND ([6 - BOM Header].Inactive = False OR [6 - BOM Header].Inactive IS NULL)
            ORDER BY 
                [6 - BOM Header].[Cat Page], 
                [6 - BOM Header].[Cat Page Order]
        """)
        items = {}
        for row in access_cursor.fetchall():
            items[row[0]] = {
                'item_code': row[0],
                'description': row[1],
                'cat': row[2],
                'cat_page': row[3],
                'cat_page_order': row[4],
                'destination': row[5],
                'inactive': row[6],
                'last_updated': row[7],
            }
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(items)} catalog items")
        
        # Load categories
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Categories...")
        access_cursor.execute("SELECT Category, [Category Group], Sub FROM [1 - Categories]")
        categories = {}
        for row in access_cursor.fetchall():
            categories[row[0]] = {'category_group': row[1], 'sub': row[2]}
        
        # Load markup adjustments
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Markup Adjustments...")
        access_cursor.execute("SELECT [Category Group], [CBC/Cable Markup], [Special Markup] FROM [1 - Markup Adjustment]")
        markup_adj = {}
        for row in access_cursor.fetchall():
            markup_adj[row[0]] = {'cbc_cable': nvl(row[1]), 'special': nvl(row[2])}
        
        # Load SS costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading SS costs...")
        access_cursor.execute("SELECT [Item Code], [SS $], [SS GR] FROM [Costing - SS BOM Pricing]")
        ss_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                ss_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load 14K costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading 14K costs...")
        access_cursor.execute("SELECT [Item Code], [14K $], [14K GR] FROM [Costing - 14K BOM Pricing]")
        gold_14k_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gold_14k_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load 10K costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading 10K costs...")
        access_cursor.execute("SELECT [Item Code], [10K $], [10K GR] FROM [Costing - 10K BOM Pricing]")
        gold_10k_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gold_10k_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load Gemstone costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Gemstone costs...")
        access_cursor.execute("SELECT [Item Code], [GS $] FROM [Costing - Gemstones by Item]")
        gs_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gs_costs[row[0]] = nvl(row[1])
        
        # Load Diamond costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Diamond costs...")
        access_cursor.execute("SELECT [Item Code], [Diamond $] FROM [Costing - Diamonds by Item]")
        diamond_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                diamond_costs[row[0]] = nvl(row[1])
        
        # Load Labor costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Labor costs...")
        access_cursor.execute("SELECT [Item Code], [Total Labor $], [Overhead $] FROM [Costing - Labor by Item]")
        labor_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                labor_costs[row[0]] = {'labor': nvl(row[1]), 'overhead': nvl(row[2])}
        
        # Clear existing catalog items
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Clearing existing catalog items...")
        pg_cursor.execute("DELETE FROM inventory_items WHERE is_catalog = TRUE")
        
        # Process and insert items
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing and inserting items...")
        count = 0
        for item_code, item in items.items():
            if not item_code:
                continue
            
            # Clean destination
            destination = clean_destination(item['destination'])
            
            # Get category info
            cat = item['cat']
            cat_info = categories.get(cat, {})
            category_group = cat_info.get('category_group', '')
            
            # Get costs
            ss = ss_costs.get(item_code, {'cost': 0, 'gr': 0})
            gold_14k = gold_14k_costs.get(item_code, {'cost': 0, 'gr': 0})
            gold_10k = gold_10k_costs.get(item_code, {'cost': 0, 'gr': 0})
            gs = gs_costs.get(item_code, 0)
            diamond = diamond_costs.get(item_code, 0)
            labor = labor_costs.get(item_code, {'labor': 0, 'overhead': 0})
            
            # Calculate total material cost
            total_cost = (ss['cost'] + gold_14k['cost'] + gold_10k['cost'] + 
                         gs + diamond + labor['labor'] + labor['overhead'])
            
            if total_cost == 0:
                continue
            
            # Get markup based on category group and weight
            adj = markup_adj.get(category_group, {'cbc_cable': 0, 'special': 0})
            
            if category_group == 'SS':
                if ss['gr'] < 5:
                    markup = adj['special']
                else:
                    markup = adj['cbc_cable']
            elif category_group in ('10KY', '10KW'):
                if gold_10k['gr'] > 20:
                    markup = adj['special']
                else:
                    markup = adj['cbc_cable']
            elif category_group in ('14KY', '14KW'):
                if gold_14k['gr'] > 20:
                    markup = adj['special']
                else:
                    markup = adj['cbc_cable']
            else:
                markup = adj['cbc_cable']
            
            # Calculate Total WS $
            ws_mu = total_cost * markup
            total_ws = total_cost + ws_mu
            
            # Apply TITANIUM/IBLS adjustments
            description = item['description']
            if description and 'TITANIUM' in description.upper():
                total_ws += 14.5
            elif item_code and 'IBLS6' in item_code:
                total_ws += 17.5
            elif item_code and 'IBLS4' in item_code:
                total_ws += 16.5
            elif item_code and 'IBLS' in item_code:
                total_ws += 16.5
            
            # Apply description replacement
            if description:
                description = description.replace('INLAY BLANK', 'OPAL INLAY')
            
            # Extract SKU
            sku = extract_sku(item_code)
            
            # Insert into PostgreSQL
            pg_cursor.execute("""
                INSERT INTO inventory_items 
                (item_code, sku, description, category, destination, total_ws_price, 
                 is_catalog, inactive, cat_page, cat_page_order, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item_code,
                sku,
                description,
                category_group,
                destination,
                round(total_ws, 2),
                True,
                item['inactive'] or False,
                item['cat_page'],
                item['cat_page_order'],
                item['last_updated'],
            ))
            count += 1
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[{end_time.strftime('%H:%M:%S')}] Imported {count} catalog items ({duration:.2f}s)")
        return count
        
    finally:
        access_cursor.close()
        access_conn.close()


def sync_destination_db(access_db_path, pg_cursor):
    """Sync destination items from a single Access database"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing {access_db_path}...")
    
    # Connect to Access
    access_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={access_db_path};"
    )
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    try:
        # Load destination items from BOM Header (exclude CBC)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading BOM Header...")
        access_cursor.execute("""
            SELECT 
                [6 - BOM Header].[Item Code],
                [6 - BOM Header].[Description],
                [6 - BOM Header].[Cat],
                [6 - BOM Header].[Destination],
                [6 - BOM Header].[Inactive],
                [6 - BOM Header].[LastUpdated]
            FROM [6 - BOM Header]
            WHERE 
                [6 - BOM Header].[Destination] <> 'CBC'
                AND ([6 - BOM Header].Inactive = False OR [6 - BOM Header].Inactive IS NULL)
        """)
        items = {}
        for row in access_cursor.fetchall():
            items[row[0]] = {
                'item_code': row[0],
                'description': row[1],
                'cat': row[2],
                'destination': row[3],
                'inactive': row[4],
                'last_updated': row[5],
            }
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(items)} destination items")
        
        # Load categories
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Categories...")
        access_cursor.execute("SELECT Category, [Category Group], Sub FROM [1 - Categories]")
        categories = {}
        for row in access_cursor.fetchall():
            categories[row[0]] = {'category_group': row[1], 'sub': row[2]}
        
        # Load markup adjustments (using Destination Markup)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Markup Adjustments...")
        access_cursor.execute("SELECT [Category Group], [Destination Markup], [Special Markup] FROM [1 - Markup Adjustment]")
        markup_adj = {}
        for row in access_cursor.fetchall():
            markup_adj[row[0]] = {'destination': nvl(row[1]), 'special': nvl(row[2])}
        
        # Load SS costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading SS costs...")
        access_cursor.execute("SELECT [Item Code], [SS $], [SS GR] FROM [Costing - SS BOM Pricing]")
        ss_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                ss_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load 14K costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading 14K costs...")
        access_cursor.execute("SELECT [Item Code], [14K $], [14K GR] FROM [Costing - 14K BOM Pricing]")
        gold_14k_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gold_14k_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load 10K costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading 10K costs...")
        access_cursor.execute("SELECT [Item Code], [10K $], [10K GR] FROM [Costing - 10K BOM Pricing]")
        gold_10k_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gold_10k_costs[row[0]] = {'cost': nvl(row[1]), 'gr': nvl(row[2])}
        
        # Load Gemstone costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Gemstone costs...")
        access_cursor.execute("SELECT [Item Code], [GS $] FROM [Costing - Gemstones by Item]")
        gs_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                gs_costs[row[0]] = nvl(row[1])
        
        # Load Diamond costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Diamond costs...")
        access_cursor.execute("SELECT [Item Code], [Diamond $] FROM [Costing - Diamonds by Item]")
        diamond_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                diamond_costs[row[0]] = nvl(row[1])
        
        # Load Labor costs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Labor costs...")
        access_cursor.execute("SELECT [Item Code], [Total Labor $], [Overhead $] FROM [Costing - Labor by Item]")
        labor_costs = {}
        for row in access_cursor.fetchall():
            if row[0]:
                labor_costs[row[0]] = {'labor': nvl(row[1]), 'overhead': nvl(row[2])}
        
        # Process and insert items
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing and inserting items...")
        count = 0
        skipped = 0
        for item_code, item in items.items():
            if not item_code:
                continue
            
            # Clean destination
            destination = clean_destination(item['destination'])
            if destination is None:
                skipped += 1
                continue
            
            # Get category info
            cat = item['cat']
            cat_info = categories.get(cat, {})
            category_group = cat_info.get('category_group', '')
            
            # Get costs
            ss = ss_costs.get(item_code, {'cost': 0, 'gr': 0})
            gold_14k = gold_14k_costs.get(item_code, {'cost': 0, 'gr': 0})
            gold_10k = gold_10k_costs.get(item_code, {'cost': 0, 'gr': 0})
            gs = gs_costs.get(item_code, 0)
            diamond = diamond_costs.get(item_code, 0)
            labor = labor_costs.get(item_code, {'labor': 0, 'overhead': 0})
            
            # Calculate total material cost
            total_cost = (ss['cost'] + gold_14k['cost'] + gold_10k['cost'] + 
                         gs + diamond + labor['labor'] + labor['overhead'])
            
            if total_cost == 0:
                continue
            
            # Get markup based on category group and weight
            adj = markup_adj.get(category_group, {'destination': 0, 'special': 0})
            
            if category_group == 'SS':
                if ss['gr'] < 5:
                    markup = adj['special']
                else:
                    markup = adj['destination']
            elif category_group in ('10KY', '10KW'):
                if gold_10k['gr'] > 20:
                    markup = adj['special']
                else:
                    markup = adj['destination']
            elif category_group in ('14KY', '14KW'):
                if gold_14k['gr'] > 20:
                    markup = adj['special']
                else:
                    markup = adj['destination']
            elif category_group in ('COMBO', 'TT'):
                # Check if category starts with CBL
                if cat and cat.upper().startswith('CBL'):
                    markup = adj['special']
                else:
                    markup = adj['destination']
            else:
                markup = adj['destination']
            
            # Calculate Total WS $
            ws_mu = total_cost * markup
            total_ws = total_cost + ws_mu
            
            # Apply TITANIUM/IBLS adjustments
            description = item['description']
            if description and 'TITANIUM' in description.upper():
                total_ws += 14.5
            elif item_code and 'IBLS6' in item_code:
                total_ws += 17.5
            elif item_code and 'IBLS4' in item_code:
                total_ws += 16.5
            elif item_code and 'IBLS' in item_code:
                total_ws += 16.5
            
            # Apply description replacement
            if description:
                description = description.replace('INLAY BLANK', 'OPAL INLAY')
            
            # Extract SKU
            sku = extract_sku(item_code)
            
            # Insert into PostgreSQL
            pg_cursor.execute("""
                INSERT INTO inventory_items 
                (item_code, sku, description, category, destination, total_ws_price, 
                 is_catalog, inactive, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item_code,
                sku,
                description,
                category_group,
                destination,
                round(total_ws, 2),
                False,
                item['inactive'] or False,
                item['last_updated'],
            ))
            count += 1
        
        if skipped > 0:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Skipped {skipped} items (filtered destinations)")
        
        return count
        
    finally:
        access_cursor.close()
        access_conn.close()


def sync_destinations(pg_cursor):
    """Sync destination items from both Access databases to PostgreSQL"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting Destination sync...")
    
    # Clear existing destination items
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Clearing existing destination items...")
    pg_cursor.execute("DELETE FROM inventory_items WHERE is_catalog = FALSE")
    
    # Process each destination database
    total_count = 0
    for db_path in DESTINATION_DBS:
        count = sync_destination_db(db_path, pg_cursor)
        total_count += count
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Imported {count} items from {db_path}")
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    print(f"[{end_time.strftime('%H:%M:%S')}] Total imported: {total_count} destination items ({duration:.2f}s)")
    return total_count


def print_usage():
    print("Usage: python sync_access.py [catalog|destinations|all]")
    print("  catalog      - Sync catalog items from CBC database")
    print("  destinations - Sync destination items from A-L and M-Z databases")
    print("  all          - Sync both catalog and destination items")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    if command not in ('catalog', 'destinations', 'all'):
        print(f"Unknown command: {command}")
        print_usage()
        sys.exit(1)
    
    overall_start = datetime.now()
    print(f"\n{'='*60}")
    print(f"SYNC STARTED: {overall_start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Command: {command}")
    print(f"{'='*60}\n")
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(**pg_config)
    pg_cursor = pg_conn.cursor()
    
    # Log sync start and commit immediately so it persists
    sync_id = log_sync_start(pg_cursor, 'access')
    pg_conn.commit()
    
    try:
        total = 0
        if command == 'catalog':
            total = sync_catalog(pg_cursor)
        elif command == 'destinations':
            total = sync_destinations(pg_cursor)
        elif command == 'all':
            catalog_count = sync_catalog(pg_cursor)
            print()  # blank line between
            dest_count = sync_destinations(pg_cursor)
            total = catalog_count + dest_count
        
        # Log successful completion
        log_sync_complete(pg_cursor, sync_id, overall_start, total)
        
        # Commit transaction
        pg_conn.commit()
        
        print(f"\n{'='*60}")
        print(f"SYNC COMPLETED: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        pg_conn.rollback()
        
        # Log error in separate transaction so it persists
        log_sync_error(pg_cursor, sync_id, overall_start, str(e))
        pg_conn.commit()
        
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        pg_cursor.close()
        pg_conn.close()