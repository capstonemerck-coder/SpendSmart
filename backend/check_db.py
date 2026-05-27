"""
Quick connectivity test — run this before starting the server
to verify PostgreSQL is set up correctly.

Usage:
    python check_db.py

Exit code 0 = everything OK
Exit code 1 = something is wrong (instructions printed)
"""
import asyncio
import sys


async def check():
    print("SpendSmart — Database Connection Check")
    print("=" * 45)

    # 1. Check asyncpg import
    try:
        import asyncpg
        print("✓  asyncpg installed")
    except ImportError:
        print("✗  asyncpg not installed")
        print("   Run: pip install asyncpg")
        return False

    # 2. Load settings
    try:
        from app.core.config import settings
        print(f"✓  Config loaded (env={settings.app_env})")
        print(f"   DATABASE_URL = {settings.database_url}")
    except Exception as e:
        print(f"✗  Config error: {e}")
        return False

    # 3. Try connecting
    try:
        import asyncpg
        # Parse URL for asyncpg direct connect
        url = settings.database_url
        # Convert asyncpg URL format
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(url, timeout=5)
        result = await conn.fetchval("SELECT version()")
        await conn.close()
        print(f"✓  Connected to PostgreSQL")
        print(f"   {result[:60]}...")
        return True
    except Exception as e:
        print(f"\n✗  Connection FAILED: {e}")
        print()
        print("Fix:")
        print("  1. Make sure PostgreSQL is running")
        print("  2. Run these commands in psql:")
        print()
        print("     psql -U postgres  (or: sudo -u postgres psql)")
        print()
        print("     CREATE USER spendsmart WITH PASSWORD 'spendsmart';")
        print("     CREATE DATABASE spendsmart OWNER spendsmart;")
        print("     GRANT ALL PRIVILEGES ON DATABASE spendsmart TO spendsmart;")
        print("     \\q")
        print()
        print("  3. Run this script again")
        print()
        print("  See: ../config/docs/local-setup.md for full OS-specific guide")
        return False


if __name__ == "__main__":
    ok = asyncio.run(check())
    if ok:
        print()
        print("All checks passed!")
        print("Start the server with: uvicorn app.main:app --reload --port 8000")
    sys.exit(0 if ok else 1)
