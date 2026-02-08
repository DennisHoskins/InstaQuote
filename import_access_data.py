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
    # System/placeholder
    '---',
    '1CBIMAP',
    
    # Beads (explicit list)
    'ADK BEADS',
    'AV BEADS',
    'BEADS',
    'BHI BEADS',
    'HHI BEADS',
    'LBK BEADS',
    'ME BEADS',
    'NASSAU BAH BEADS',
    'NHK BEADS',
    'NNK BEADS',
    'NWW BEADS',
    'OBX BEADS',
    'OC BEADS',
    'RHM BEADS',
    'SH BEADS',
    'SIC BEADS',
    'WW BEADS',
    
    # Customer exclusions
    'AZURA JAMAICA',
    'BITTER END YACHT',
    'BRISA VIRGIN GORDA',
    'CAMP LEJEUNE',
    'CITRIX',
    'CLEMSON UNIVERSITY',
    'CLEMSOM UNIVERSITY',
    'CRUISE PLANNERS',
    'DOM REP',
    'DUKE UNIVERSITY',
    'EQUESTRIAN 1',
    'EQUESTRIAN 2',
    'EQUESTRIAN 3',
    'EQUIESTRIAN 1',
    'EQUIESTRIAN 2',
    'EQUIESTRIAN 3',
    'FATIMA',
    'FINGER LAKE',
    'FLORIDA STATE UNIVERSITY',
    'FLORIDA STATE UNIVESRITY',
    'FLORIDA STATE UNVERSITY',
    'GEORGETOWN LOGO',
    'HOC SPECIAL',
    'HUG & KISSES',
    'JAM FLAG HOOK',
    'JERUSALEM',
    'KEY WEST CHARMS',
    'KING FISH',
    'KW SPECIAL',
    'LIBERTY UNIVERSITY',
    'LIBERTY UNIVERSITY II',
    'MAHI MAHI',
    'MARCO SPECIAL',
    'MARK EDWARDS',
    'MARLIN',
    'MARSOC',
    'MORRO BAY SPECIAL',
    'MSC',
    'PH LIBERTY BELL',
    'RADFORD UNIVERSITY',
    'RAILROAD COUPLING',
    'RED FISH',
    'RODEO CHINA',
    'SAIL FISH',
    'SEA-CRETS',
    'ST EDWARDS SCHOOL',
    'STANFORD UNIVERSITY',
    'SUN VALLEY SPECIAL',
    'SURF CITY SHELL',
    'TARHEEL',
    'TERRY QUINN',
    'UCLA',
    'UNI OF SOUTH CAROLINA GAMECOCKS',
    'UNI SOUTH CAROLINA BASEBALL MARKS',
    'UNIVERSITY OF FLORIDA',
    'UNIVERSITY OF GEORGIA',
    'UNIVERSITY OF MIAMI',
    'UNIVERSITY OF NOTRE DAME',
    'UNIVERSITY OF TENNESSEE',
    'UNIVERSITY OF WASHINGTON',
    'UNIVERSITY OF WASHINGTON 01',
    'UPPER ARLINGTON',
    'US VIRIGIN ISLANDS',
    'UT HOOK UNIVERSITY',
    'UT HOOK UNVERSITY',
    'VERY BEAUTIFUL',
    'VIRGINIA SHUMAN YOUNG',
    'VIRGINIA TECH',
    'VIRGINIA TECH LOGO',
    'VIRINGIA TECH',
    'VIRGNIA TECH',
    'W AND M UNIVERSITY',
    'WARE ACADEMY',
    'WEST VIRGINIA UNIVERSITY',
    'WEST VIRGINIA UNIVERSITY HOOK',
]

# Destination name normalization - maps raw names to clean display names
# Format: 'Clean Name': ['raw_variation1', 'raw_variation2', ...]
DESTINATION_ALIASES = {
    # === ADD STATE ABBREVIATIONS ===
    # Florida
    'Amelia Island, FL': ['AMELIA ISLAND'],
    'Anna Maria Island, FL': ['ANNA MARIA ISLAND', 'Anna Maria Island'],
    'Bonita Springs, FL': ['BONITA SPRING', 'BONITA SPRINGS'],
    'Cape Canaveral, FL': ['CAPE CANAVERAL'],
    'Cape Coral, FL': ['CAPE CORAL'],
    'Celebration, FL': ['CELEBRATION FLORIDA'],
    'Crystal River, FL': ['CRYSTAL RIVER'],
    'Daytona Beach, FL': ['DAYTONA BEACH'],
    'Delray Beach, FL': ['DELRAY BEACH'],
    'Destin, FL': ['DESTIN'],
    'Estero, FL': ['ESTERO FL'],
    'Ft. Myers, FL': ['FORT MYERS', 'FT MYERS HOOK'],
    'Islamorada, FL': ['ISLA MORADA'],
    'Jacksonville, FL': ['JACKSONVILLE'],
    'Key Biscayne, FL': ['KEY BISCAYNE'],
    'Key Largo, FL': ['KEY LARGO'],
    'Key West, FL': ['KEY WEST'],
    'Longboat Key, FL': ['LONGBOAT KEY'],
    'Marathon, FL': ['MARATHON'],
    'Marco Island, FL': ['MARCO ISLAND'],
    'Naples, FL': ['NAPLES'],
    'New Smyrna Beach, FL': ['NEW SMYRNA'],
    'Orlando, FL': ['ORLANDO FL'],
    'Palm Beach, FL': ['PALM BEACH', 'PALM BEACH GARDEN'],
    'Panama City Beach, FL': ['PANAMA CITY BEACH'],
    'Port St. Joe, FL': ['PORT ST JOE'],
    'Port St. Lucie, FL': ['PORT ST LUCIE'],
    'Sanibel Island, FL': ['SANIBEL ISLAND'],
    'Sarasota, FL': ['SARASOTA'],
    'Siesta Key, FL': ['SIESTA KEY'],
    'St. Augustine, FL': ['ST AUGUSTINE'],
    'St. Petersburg, FL': ['ST PETERSBURG', 'ST PETERSBURG SPECIAL'],
    'Stuart, FL': ['STUART FL'],
    'Tampa, FL': ['TAMPA'],
    'Tarpon Springs, FL': ['TARPON SPRINGS'],
    'Treasure Coast, FL': ['TREASURE COAST'],
    'Venice, FL': ['VENICE FL'],
    'Vero Beach, FL': ['VERO BEACH'],
    'West Palm Beach, FL': ['WEST PALM BEACH'],
    
    # North Carolina
    'Atlantic Beach, NC': ['ATLANTIC BEACH'],
    'Banner Elk, NC': ['BANNER ELK NC'],
    'Beaufort, NC': ['BEAUFORT NC'],
    'Bodie Island, NC': ['BODIE ISLAND'],
    'Blowing Rock, NC': ['BLOWING ROCK'],
    'Cape Hatteras, NC': ['CAPE HATTERAS'],
    'Cape Lookout, NC': ['CAPE LOOKOUT'],
    'Carolina Beach, NC': ['CAROLINA BEACH'],
    'Charlotte, NC': ['CHARLOTTE NC'],
    'Currituck, NC': ['CURRITUCK'],
    'Durham, NC': ['DURHAM NC'],
    'Emerald Isle, NC': ['EMERALD ISLAND', 'EMERALD ISLE'],
    'Holden Beach, NC': ['HOLDEN BEACH'],
    'Kure Beach, NC': ['KURE BEACH'],
    'New Bern, NC': ['NEW BERN NC', 'NEW BERN NC ANNIVERSARY'],
    'Oak Island, NC': ['OAK ISLAND'],
    'Ocean Isle Beach, NC': ['OCEAN ISLE BEACH'],
    'Ocracoke Island, NC': ['OCRACOKE ISLAND'],
    'Outer Banks, NC': ['OUTER BANKS', 'OBX'],
    'Sunset Beach, NC': ['SUNSET BEACH'],
    'Surf City, NC': ['SURF CITY'],
    'Topsail Island, NC': ['TOPSAIL ISLAND'],
    'Washington, NC': ['WASHINGTON NC'],
    'Wilmington, NC': ['WILMINGTON NC'],
    
    # South Carolina
    'Aiken, SC': ['AIKEN SC'],
    'Beaufort, SC': ['BEAUFORT SC'],
    'Charleston, SC': ['CHARLESTON'],
    'Edisto Beach, SC': ['EDISTO BEACH'],
    'Hilton Head Island, SC': ['HILTON HEAD ISLAND'],
    'Kiawah Island, SC': ['KIAWAH ISLAND'],
    'Mt. Pleasant, SC': ['MT PLEASANT'],
    'Myrtle Beach, SC': ['MYRTLE BEACH'],
    "Pawley's Island, SC": ["PAWLEY'S ISLAND"],
    'Seabrook Island, SC': ['SEABROOK ISLAND'],
    
    # Georgia
    'Jekyll Island, GA': ['JEKYLL ISLAND'],
    'Savannah, GA': ['SAVANNAH', 'NEW SAVANNAH'],
    'St. Simons Island, GA': ['ST SIMONS'],
    
    # Virginia
    'Chesapeake Bay, VA': ['CHESAPEAKE BAY VA'],
    'Chincoteague, VA': ['CHINCOTEAUGE', 'CHINCOTEAGUE'],
    'Colonial Williamsburg, VA': ['COLONIAL WILLIAMSBURG'],
    'Gloucester, VA': ['GLOUCESTER VA'],
    'Jamestown, VA': ['JAMESTOWN VA'],
    'Lynchburg, VA': ['LYNCHBURG VA'],
    'Northern Neck, VA': ['NORTHERN NECK'],
    'Occoquan, VA': ['OCCOQUAN VA'],
    'Roanoke, VA': ['ROANOKE VA'],
    'Virginia Beach, VA': ['VIRGINIA BEACH', 'VIRGNIA BEACH'],
    'Yorktown, VA': ['YORK TOWN', 'YORKTOWN'],
    
    # Maryland
    'Annapolis, MD': ['ANNAPOLIS MD'],
    'Assateague Island, MD': ['ASSATEAGUE ISLAND'],
    'Chestertown, MD': ['CHESTERTOWN MD'],
    'Ocean City, MD': ['OCEAN CITY MD', 'OC MD ANNIVERSARY', "OC HENRY'S SPECIAL"],
    'Ocean Pines, MD': ['OCEAN PINES'],
    'Rock Hall, MD': ['ROCK HALL MD'],
    "St. Mary's County, MD": ["ST MARY'S COUNTY"],
    'St. Michaels, MD': ['ST MICHAEL ISLAND'],
    'Tolchester, MD': ['TOLCHESTER'],
    
    # New Jersey
    'Asbury Park, NJ': ['ASBURY PARK, NJ', 'ASBURY PARK NJ', 'ASBURY PARK'],
    'Atlantic City, NJ': ['ATLANTIC CITY'],
    'Avalon, NJ': ['AVALON', 'AVALON II'],
    'Long Beach Island, NJ': ['LONG BEACH ISLAND', 'LBI SPECIAL'],
    'Longport, NJ': ['LONG PORT', 'LONGPORT'],
    'Margate, NJ': ['MARGATE'],
    'Ocean City, NJ': ['OCEAN CITY NJ', 'OC NJ ANNIVERSARY', 'OC NJ BEACH TAG', 'OC NJ JH', 'OC NJ SPECIAL'],
    'Sea Isle City, NJ': ['SEA ISLE CITY'],
    'Seaside Heights, NJ': ['SEA SIDE HEIGHTS', 'SEASIDE HEIGHTS'],
    'Stone Harbor, NJ': ['STONE HARBOR', 'STONE HARBOR II', 'STONE HARBOR BIRD SANCTUARY'],
    'Ventnor, NJ': ['VENTNOR'],
    'Wildwood, NJ': ['WILDWOOD'],
    
    # Delaware
    'Bethany Beach, DE': ['BETHANY BEACH'],
    'Fenwick Island, DE': ['FENWICK ISLAND DE'],
    'Lewes, DE': ['LEWES DE'],
    'Long Neck, DE': ['LONG NECK DE'],
    'Rehoboth Beach, DE': ['REHOBOTH BEACH'],
    'South Bethany, DE': ['SOUTH BETHANY'],
    
    # Massachusetts
    'Bar Harbor, ME': ['BAR HARBOR'],
    'Boston, MA': ['BOSTON MA'],
    'Cape Cod, MA': ['CAPE COD', 'CAPE COD FISH', 'CAPE COD SHELL'],
    'Harwich Port, MA': ['HARDWICH PORT MA', 'HARWICH PORT'],
    "Martha's Vineyard, MA": ["MARTHA'S VINEYARD"],
    'Nantucket, MA': ['NANTUCKET'],
    'Nobska Light, MA': ['NOBSKA LIGHT'],
    'Plymouth, MA': ['PLYMOUTH'],
    'Provincetown, MA': ['PROVINCE TOWN', 'PROVINCETOWN'],
    
    # Rhode Island
    'Block Island, RI': ['BLOCK ISLAND'],
    'Newport, RI': ['NEWPORT RI', 'NEW PORT RI', 'NEWPORT', 'NEW PORT'],
    
    # New York
    'Montauk, NY': ['MONTAUK NY'],
    'Port Jefferson, NY': ['PORT JEFFERSON'],
    
    # Texas
    'Austin, TX': ['AUSTIN TX'],
    'Fredericksburg, TX': ['FREDRICKSBURG TX', 'FREDERICKSBURG TX'],
    'Galveston, TX': ['GALVESTON'],
    'Houston, TX': ['HOUSTON TX'],
    'South Padre Island, TX': ['SOUTH PADRE ISLAND'],
    'The Woodlands, TX': ['THE WOODLANDS TX'],
    
    # Louisiana
    'New Orleans, LA': ['NEW ORLEANS', 'NOLA'],
    
    # Tennessee
    'Gatlinburg, TN': ['GATLINBURG TN'],
    'Nashville, TN': ['NASHVILLE'],
    
    # Kentucky
    'Bardstown, KY': ['BARDSTOWN KY'],
    'Lexington, KY': ['LEXINGTON KY'],
    'Louisville, KY': ['LOUISVILLE KY'],
    
    # Alabama
    'Gulf Shores, AL': ['GULF SHORES', 'GULF SHORES II'],
    'Orange Beach, AL': ['ORANGE BEACH'],
    
    # Mississippi
    'Biloxi, MS': ['BILOXI'],
    'Gulfport, MS': ['GULFPORT'],
    'Ocean Springs, MS': ['OCEAN SPRINGS'],
    
    # Ohio
    'Catawba Island, OH': ['CATAWBA ISLAND'],
    'Kelleys Island, OH': ['KELLEYS ISLAND'],
    'Marblehead, OH': ['MARBLEHEAD OH'],
    'Port Clinton, OH': ['PORT CLINTON OH'],
    'Put-in-Bay, OH': ['PUT IN BAY OH'],
    
    # Michigan
    'Fishtown, MI': ['FISH TOWN'],
    'Oscoda, MI': ['OSCODA, MICHIGAN', 'OSCODA MI'],
    'Tawas, MI': ['TAWAS MI'],
    'West Branch, MI': ['WEST BRANCH MI'],
    
    # Wisconsin
    'Door County, WI': ['DOOR COUNTY WI'],
    'Green Bay, WI': ['GREEN BAY'],
    
    # Minnesota
    'Nisswa, MN': ['NISSWA'],
    
    # Colorado
    'Aspen, CO': ['ASPEN CO'],
    'Steamboat Springs, CO': ['STEAM BOAT SPRINGS', 'STEAMBOAT SPRINGS'],
    'Vail, CO': ['VAIL CO'],
    
    # Wyoming
    'Jackson Hole, WY': ['JACKSON HOLE WY', 'JACKSON WY'],
    
    # Idaho
    'Sun Valley, ID': ['SUN VALLEY', 'SUN VALLEY ID'],
    
    # California
    'Morro Bay, CA': ['MORRO BAY', 'MORRO ROCK'],
    'Northern California': ['NORTHERN CALIFORNIA'],
    'San Francisco, CA': ['SAN FRANCISCO'],
    
    # Washington
    'Lake Chelan, WA': ['LAKE CHELAN'],
    'Seattle, WA': ['SEATTLE'],
    
    # Alaska
    'Juneau, AK': ['JUNEAU'],
    'Ketchikan, AK': ['KETCHIKAN', 'KETCHIKAN/JENEAU/SKAGWAY'],
    'Skagway, AK': ['SKAGWAY'],
    
    # Nevada
    'Las Vegas, NV': ['LAS VEGAS'],
    
    # New Mexico
    'Santa Fe, NM': ['SANTA FE'],
    
    # Missouri
    'Branson, MO': ['BRANSON'],
    
    # Indiana
    'West Baden Springs, IN': ['WEST BADEN SPRINGS'],
    
    # Washington DC
    'Washington, DC': ['WASHINGTON DC'],
    
    # Hawaii
    'Maui, HI': ['MAUI HI', 'HAWAII'],
    
    # === INTERNATIONAL (no state, just clean up formatting) ===
    # Caribbean
    'Abaco, Bahamas': ['ABACO'],
    'Anguilla': ['ANGUILLA'],
    'Antigua': ['ANTIGUA'],
    'Aruba': ['ARUBA'],
    'Bahamas': ['BAHAMAS CONCH', 'BAHAMAS CRUISE SHIP'],
    'Barbados': ['BARBADOS'],
    'Bermuda': ['BERMUDA'],
    'British Virgin Islands': ['BRITISH VIRGIN ISLAND'],
    'Cayman Islands': ['CAYMAN ISLAND'],
    'Curacao': ['CURACAO'],
    'Grenada': ['GRENADA'],
    'Jamaica': ['JAMAICA', 'CHULANI JAMAICA'],
    'Nassau, Bahamas': ['NASSAU'],
    'Puerto Rico': ['PUERTO RICO'],
    'St. Barts': ['ST BARTS'],
    'St. Croix, USVI': ['ST CROIX', 'ST CROIX LIZARD', 'ST CROIX PALM'],
    'St. John, USVI': ['ST JOHN', 'ST JOHN LIZARD', 'ST JOHN PALM', 'JD ST JOHN', 'JVD'],
    'St. Kitts': ['ST KITTS'],
    'St. Lucia': ['ST LUCIA'],
    'St. Martin': ['ST MARTIN', 'ST MARTIN LIZARD', 'SXM HOOK'],
    'St. Thomas, USVI': ['ST THOMAS', 'ST THOMAS LIZARD', 'ST THOMAS PALM'],
    'Tortola, BVI': ['TORTOLA'],
    'Turks and Caicos': ['TURKS AND CAICOS'],
    'US Virgin Islands': ['US VIRGIN ISLANDS', 'USVI HOOK', 'VI HOOK'],
    'Virgin Gorda, BVI': ['VIRGIN GORDA'],
    
    # Mexico
    'Cabo San Lucas, Mexico': ['CABO'],
    
    # === US STATES (general) ===
    'Arkansas': ['ARKANSAS'],
    'Kentucky': ['KENTUCKY'],
    'Louisiana': ['LOUISIANA'],
    'Mississippi': ['MISSISSIPPI'],
    'North Carolina': ['NORTH CAROLINA'],
    'South Carolina': ['SOUTH CAROLINA'],
    'Vermont': ['VERMONT HOOK'],
    'Virginia': ['VIRGINIA', 'VIRGINIA CARDINAL DOGWOOD'],
    
    # === SPECIAL/OTHER ===
    'ABC Islands': ['ABC ISLAND'],
    'Adirondacks, NY': ['ADIRONDACK'],
    'B&O Railroad': ['B&O RAILROAD'],
    'Bald Head Island, NC': ['BALD HEAD ISLAND'],
    'BBQ': ['BBQ'],
    'Biltmore Estate, NC': ['BILTMORE ESTATE'],
    'Blue Ridge Mountains': ['BLUE RIDGE'],
    'Cape May, NJ': ['CAPE MAY', 'CAPE MAY ANI', 'CAPE MAY SPECIAL'],
    'George Town, Cayman': ['GEORGE TOWN', 'GEORGE TOWN LOGO'],
    'Island Packet': ['ISLAND PACKET'],
    'Keller Williams': ['KELLER WILLIAMS/REAL ESTATE CO'],
    'Lauderdale-by-the-Sea, FL': ['LAUDERDALE BY THE SEA', 'FT. LAUDERDALE'],
    'Lincoln Memorial': ['ABRAHAM LINCOLN'],
    "Mariner's Boat House": ["MARINER'S BOAT HOUSE"],
    'Maison Mythe': ['MAISON MYTHE'],
    'Mar Azul Larimar': ['MAR AZUL LARIMAR'],
    'Navy': ['NAVY'],
    'Ocean City Shell': ['OCEAN CITY SHELL'],
    'Philadelphia, PA': ['PHILADELPHIA LIBERTY BELL'],
    'Sandy Hook, NJ': ['SANDY HOOK'],
    'Shag Dancing': ['SHAGGERS'],
    'South Beach, FL': ['SOUTH BEACH'],
    'Southport, NC': ['SOUTHPORT', 'South Port', 'SOUTH PORT'],
    "St. Armand's Circle, FL": ['ST ARMAND CIRCLE'],
    'The Village': ['THE VILLAGE'],
    'University of Notre Dame': ['UNIVERSITY OF NOTRE DAME'],
    'Custom Clasp Collection': ['CUSTOM CLASP COLLECTION'],
    
    # === AWAITING CUSTOMER CLARIFICATION ===
    # These will be updated once customer responds
    'Madison, WI': ['MADISON'],
    'Maryville, TN': ['MARYVILLE'],
    'Muscle Shoals, AL': ['MUSCLE SHOALS'],
    'Peachtree City, GA': ['PEACHTREE CITY'],
    'Sumter, SC': ['SUMTER'],
    'Twin Ports, MN': ['TWIN PORT'],
    'Westchester, NY': ['WESTCHESTER'],
}

# Build reverse lookup (variation -> canonical name)
DESTINATION_MAP = {}
for canonical, variations in DESTINATION_ALIASES.items():
    for variation in variations:
        DESTINATION_MAP[variation] = canonical
    # Also map canonical to itself for consistency
    DESTINATION_MAP[canonical] = canonical

def clean_destination(destination):
    """Clean and normalize destination name"""
    if not destination:
        return None
    
    # Strip whitespace
    destination = destination.strip()
    
    # Character substitutions
    for old_char, new_char in CHAR_SUBSTITUTIONS.items():
        destination = destination.replace(old_char, new_char)
    
    # Skip if in skip list (case insensitive)
    if destination.upper() in [s.upper() for s in SKIP_DESTINATIONS]:
        return None
    
    # Map to canonical name if alias exists
    # Try exact match first
    if destination in DESTINATION_MAP:
        return DESTINATION_MAP[destination]
    
    # Try uppercase match
    destination_upper = destination.upper()
    for variation, canonical in DESTINATION_MAP.items():
        if variation.upper() == destination_upper:
            return canonical
    
    # No match found - return as-is (title case)
    return destination.title()

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