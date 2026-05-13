import pyodbc
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone

import sys

# PostgreSQL connection
pg_config = {
    'dbname': 'instaquote',
    'user': '',
    'password': '',
    'host': 'dennishoskins.com',
    'port': '5432'
}

# pg_config = {
#    'dbname': 'instaquote',
#    'user': '',
#    'password': '',
#    'host': 'localhost',
#    'port': '5432'
# }

# REPOSITORY_DB_PATH = r"D:\Shared Folders\Costing\Costing Repository.mdb"
# CBC_DB_PATH = r"D:\Shared Folders\Costing\Costing - CBC.mdb"

REPOSITORY_DB_PATH = r"T:\Costing Repository.mdb"
CBC_DB_PATH = r"T:\Costing - CBC.mdb"


def log_sync_start(pg_cursor, sync_type):
    pg_cursor.execute("""
        INSERT INTO sync_log (started_at, user_name, status, sync_type)
        VALUES (%s, 'schedule', 'running', %s)
        RETURNING id
    """, (datetime.now(timezone.utc), sync_type))
    return pg_cursor.fetchone()[0]


def log_sync_complete(pg_cursor, sync_id, started_at, items_synced):
    completed_at = datetime.now(timezone.utc)
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
    completed_at = datetime.now(timezone.utc)
    duration = (completed_at - started_at).total_seconds()
    pg_cursor.execute("""
        UPDATE sync_log
        SET completed_at = %s,
            duration_seconds = %s,
            status = 'failed',
            error_message = %s
        WHERE id = %s
    """, (completed_at, duration, error_message, sync_id))


def import_metal_prices(pg_cursor):
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Importing metal prices...")

    cbc_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={CBC_DB_PATH};"
    )
    cbc_conn = pyodbc.connect(cbc_conn_str)
    cbc_cursor = cbc_conn.cursor()

    cbc_cursor.execute("SELECT [SS Price], [Gold Price] FROM [1 - Metal Prices]")
    row = cbc_cursor.fetchone()

    if row:
        pg_cursor.execute("""
            INSERT INTO metal_prices (ss_price, gold_price, synced_at)
            VALUES (%s, %s, %s)
        """, (row[0], row[1], datetime.now(timezone.utc)))
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[{end_time.strftime('%H:%M:%S')}] Imported metal prices: SS=${row[0]}, Gold=${row[1]} ({duration:.2f}s)")
    else:
        print("No metal prices found")

    cbc_cursor.close()
    cbc_conn.close()


def sync_catalog(pg_cursor):
    """Sync catalog items by calling the Catalog query in Costing Repository.mdb"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting Catalog sync...")

    access_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={REPOSITORY_DB_PATH};"
    )
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()

    try:
        # Run the Catalog query exactly as defined in Access
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Running [Catalog] query...")
        access_cursor.execute("SELECT * FROM [Catalog]")

        rows = []
        sort_order = 0
        for row in access_cursor.fetchall():
            row_dict = {col[0]: row[i] for i, col in enumerate(access_cursor.description)}

            item_code = row_dict.get('Item Code')
            if not item_code:
                continue

            description = row_dict.get('Description')
            category = row_dict.get('Category Group')
            total_ws_price = row_dict.get('Total WS$')

            if total_ws_price is None:
                continue

            sort_order += 1
            rows.append((
                item_code,
                description,
                category,
                total_ws_price,
                'CBC',       # destination
                True,        # is_catalog
                False,       # inactive
                sort_order,
            ))

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetched {len(rows)} catalog items")

        # Clear existing catalog items
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Clearing existing catalog items...")
        pg_cursor.execute("DELETE FROM inventory_items WHERE is_catalog = TRUE")

        # Insert
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Inserting catalog items...")
        execute_values(pg_cursor, """
            INSERT INTO inventory_items
                (item_code, description, category, total_ws_price,
                 destination, is_catalog, inactive, sort_order)
            VALUES %s
        """, rows)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[{end_time.strftime('%H:%M:%S')}] Catalog sync complete: {len(rows)} items ({duration:.2f}s)")

        return len(rows)

    finally:
        access_cursor.close()
        access_conn.close()


def sync_destinations(pg_cursor):
    """Sync destination items by calling the [Catalog - Destination] query in Costing Repository.mdb"""
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting Destination sync...")

    access_conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={REPOSITORY_DB_PATH};"
    )
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()

    try:
        # Run the Catalog - Destination query exactly as defined in Access
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Running [Catalog - Destination] query...")
        access_cursor.execute("SELECT * FROM [Catalog - Destination]")

        rows = []
        sort_order = 0
        for row in access_cursor.fetchall():
            row_dict = {col[0]: row[i] for i, col in enumerate(access_cursor.description)}

            item_code = row_dict.get('Item Code')
            if not item_code:
                continue

            description = row_dict.get('Description')
            category = row_dict.get('Category Group')
            total_ws_price = row_dict.get('Total WS$')
            destination = row_dict.get('Destination')

            if total_ws_price is None:
                continue

            sort_order += 1
            rows.append((
                item_code,
                description,
                category,
                total_ws_price,
                destination,    # destination
                False,          # is_catalog
                False,          # inactive
                sort_order,
            ))

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetched {len(rows)} destination items")

        # Clear existing destination items
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Clearing existing destination items...")
        pg_cursor.execute("DELETE FROM inventory_items WHERE is_catalog = FALSE")

        # Insert
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Inserting destination items...")
        execute_values(pg_cursor, """
            INSERT INTO inventory_items
                (item_code, description, category, total_ws_price,
                 destination, is_catalog, inactive, sort_order)
            VALUES %s
        """, rows)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[{end_time.strftime('%H:%M:%S')}] Destination sync complete: {len(rows)} items ({duration:.2f}s)")

        return len(rows)

    finally:
        access_cursor.close()
        access_conn.close()


def print_usage():
    print("Usage: python import_access_data.py [catalog|destinations|all]")
    print("  catalog      - Sync catalog items from Costing Repository [Catalog] query")
    print("  destinations - Sync destination items from Costing Repository [Catalog - Destination] query")
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

    overall_start = datetime.now(timezone.utc)
    print(f"\n{'='*60}")
    print(f"SYNC STARTED: {overall_start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Command: {command}")
    print(f"{'='*60}\n")

    pg_conn = psycopg2.connect(**pg_config)
    pg_cursor = pg_conn.cursor()

    sync_id = log_sync_start(pg_cursor, 'access')
    pg_conn.commit()

    try:
        import_metal_prices(pg_cursor)

        total = 0
        if command == 'catalog':
            total = sync_catalog(pg_cursor)
        elif command == 'destinations':
            total = sync_destinations(pg_cursor)
        elif command == 'all':
            catalog_count = sync_catalog(pg_cursor)
            print()
            dest_count = sync_destinations(pg_cursor)
            total = catalog_count + dest_count

        log_sync_complete(pg_cursor, sync_id, overall_start, total)
        pg_conn.commit()

        print(f"\n{'='*60}")
        print(f"SYNC COMPLETED: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

    except Exception as e:
        pg_conn.rollback()

        log_sync_error(pg_cursor, sync_id, overall_start, str(e))
        pg_conn.commit()

        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        pg_cursor.close()
        pg_conn.close()