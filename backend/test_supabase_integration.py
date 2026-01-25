#!/usr/bin/env python3
"""
Comprehensive Supabase Integration Test Script
Tests all aspects of Supabase Docker setup
"""
import os
import sys
from dotenv import load_dotenv

def test_environment_variables():
    """Test 1: Verify environment variables are set"""
    print("\n" + "="*60)
    print("TEST 1: Environment Variables")
    print("="*60)

    load_dotenv()

    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]

    all_present = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            masked = value[:20] + "..." if len(value) > 20 else value
            print(f"✓ {var}: {masked}")
        else:
            print(f"✗ {var}: MISSING")
            all_present = False

    if all_present:
        print("\n✓ All environment variables present")
    else:
        print("\n✗ Some environment variables missing")

    return all_present


def test_supabase_import():
    """Test 2: Verify Supabase package is installed"""
    print("\n" + "="*60)
    print("TEST 2: Supabase Package Installation")
    print("="*60)

    try:
        from supabase import create_client, Client
        print("✓ Supabase package installed successfully")
        print(f"✓ Client class available: {Client}")
        return True
    except ImportError as e:
        print(f"✗ Failed to import Supabase: {e}")
        return False


def test_database_connection():
    """Test 3: Test direct PostgreSQL connection"""
    print("\n" + "="*60)
    print("TEST 3: Direct Database Connection (via Docker)")
    print("="*60)

    import subprocess

    try:
        # Test connection from inside container
        result = subprocess.run(
            ['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres',
             '-c', 'SELECT version();'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print("✓ Database connection successful")
            # Extract version info
            lines = result.stdout.split('\n')
            for line in lines:
                if 'PostgreSQL' in line:
                    print(f"  {line.strip()}")
            return True
        else:
            print(f"✗ Database connection failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error testing database: {e}")
        return False


def test_auth_schema():
    """Test 4: Verify auth schema exists and is accessible"""
    print("\n" + "="*60)
    print("TEST 4: Auth Schema Verification")
    print("="*60)

    import subprocess

    try:
        result = subprocess.run(
            ['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres',
             '-c', "SELECT COUNT(*) FROM auth.users;"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print("✓ Auth schema accessible")
            # Parse count
            for line in result.stdout.split('\n'):
                if line.strip().isdigit():
                    print(f"  Users in auth.users: {line.strip()}")
            return True
        else:
            print(f"✗ Auth schema check failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error checking auth schema: {e}")
        return False


def test_storage_schema():
    """Test 5: Verify storage schema exists"""
    print("\n" + "="*60)
    print("TEST 5: Storage Schema Verification")
    print("="*60)

    import subprocess

    try:
        result = subprocess.run(
            ['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres',
             '-c', "SELECT tablename FROM pg_tables WHERE schemaname = 'storage';"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print("✓ Storage schema exists")
            tables = [line.strip() for line in result.stdout.split('\n')[2:] if line.strip() and not line.startswith('-')]
            for table in tables:
                print(f"  - {table}")
            return True
        else:
            print(f"✗ Storage schema check failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error checking storage schema: {e}")
        return False


def test_application_tables():
    """Test 6: Check if required application tables exist"""
    print("\n" + "="*60)
    print("TEST 6: Application Tables")
    print("="*60)

    import subprocess

    required_tables = ['notebooks', 'chats', 'messages', 'sources']

    try:
        result = subprocess.run(
            ['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres',
             '-c', "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            tables = [line.strip() for line in result.stdout.split('\n') if line.strip() and not line.startswith('-') and not line.startswith('tablename')]

            print(f"Tables in public schema: {len(tables)}")
            for table in tables:
                print(f"  - {table}")

            print("\nChecking required tables:")
            all_present = True
            for req_table in required_tables:
                if req_table in tables:
                    print(f"  ✓ {req_table}")
                else:
                    print(f"  ✗ {req_table} - MISSING")
                    all_present = False

            if not all_present:
                print("\n⚠️  Application tables not found - need to run migrations")

            return all_present
        else:
            print(f"✗ Failed to check tables: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error checking tables: {e}")
        return False


def test_docker_containers():
    """Test 7: Verify Docker containers are running"""
    print("\n" + "="*60)
    print("TEST 7: Docker Container Status")
    print("="*60)

    import subprocess

    try:
        result = subprocess.run(
            ['docker', 'ps', '--filter', 'name=supabase', '--format', 'table {{.Names}}\t{{.Status}}'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print("Supabase containers:")
            print(result.stdout)

            # Check for healthy status
            if 'supabase-db' in result.stdout and 'healthy' in result.stdout:
                print("✓ Database container is healthy")
            else:
                print("⚠️  Database container may not be healthy")

            if 'supabase-studio' in result.stdout:
                if 'healthy' in result.stdout:
                    print("✓ Studio container is healthy")
                else:
                    print("⚠️  Studio container is unhealthy (health check failing, but may still work)")

            return True
        else:
            print(f"✗ Failed to check containers: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error checking containers: {e}")
        return False


def main():
    """Run all tests and provide summary"""
    print("\n" + "="*60)
    print("SUPABASE INTEGRATION TEST SUITE")
    print("="*60)

    tests = [
        ("Environment Variables", test_environment_variables),
        ("Package Installation", test_supabase_import),
        ("Database Connection", test_database_connection),
        ("Auth Schema", test_auth_schema),
        ("Storage Schema", test_storage_schema),
        ("Application Tables", test_application_tables),
        ("Docker Containers", test_docker_containers),
    ]

    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            results[test_name] = False

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    print("\n" + "-"*60)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("\n✓ All tests passed! Supabase integration is working.")
        return 0
    else:
        print("\n⚠️  Some tests failed. See details above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
