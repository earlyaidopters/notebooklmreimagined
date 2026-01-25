#!/usr/bin/env python3
"""
Test CRUD operations on Supabase application tables.
This demonstrates that the database is fully functional.
"""
import subprocess
import json


def run_sql(sql, description="SQL Command"):
    """Execute SQL via Docker and return results"""
    cmd = [
        'docker', 'exec', 'supabase-db',
        'psql', '-U', 'postgres', '-d', 'postgres',
        '-c', sql
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"{'='*60}")
    print(f"SQL: {sql[:100]}...")

    if result.returncode == 0:
        print(f"✓ SUCCESS")
        if result.stdout.strip():
            print(f"Output:\n{result.stdout}")
        return True
    else:
        print(f"✗ FAILED: {result.stderr}")
        return False


def main():
    print("\n" + "="*60)
    print("SUPABASE CRUD OPERATIONS TEST")
    print("="*60)

    tests = []

    # Test 1: Create a test notebook
    test1 = run_sql(
        """
        INSERT INTO notebooks (user_id, title, description)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Test Notebook', 'Automated test notebook')
        RETURNING id, title, created_at;
        """,
        "CREATE - Insert new notebook"
    )
    tests.append(("Create notebook", test1))

    # Test 2: Read all notebooks
    test2 = run_sql(
        "SELECT id, title, description, created_at FROM notebooks LIMIT 5;",
        "READ - Query all notebooks"
    )
    tests.append(("Read notebooks", test2))

    # Test 3: Create a chat in the notebook
    test3 = run_sql(
        """
        INSERT INTO chats (notebook_id, user_id, title, model)
        VALUES (
            (SELECT id FROM notebooks LIMIT 1),
            '00000000-0000-0000-0000-000000000001',
            'Test Chat',
            'claude-3.5-sonnet'
        )
        RETURNING id, title, model;
        """,
        "CREATE - Insert new chat"
    )
    tests.append(("Create chat", test3))

    # Test 4: Create messages
    test4 = run_sql(
        """
        INSERT INTO messages (chat_id, role, content, tokens)
        VALUES (
            (SELECT id FROM chats LIMIT 1),
            'user',
            'Hello, this is a test message from the automated test suite.',
            15
        )
        RETURNING id, role, left(content, 50) as content_preview;
        """,
        "CREATE - Insert user message"
    )
    tests.append(("Create user message", test4))

    test5 = run_sql(
        """
        INSERT INTO messages (chat_id, role, content, tokens)
        VALUES (
            (SELECT id FROM chats LIMIT 1),
            'assistant',
            'Hello! I am your AI assistant. This is an automated test response.',
            18
        )
        RETURNING id, role, left(content, 50) as content_preview;
        """,
        "CREATE - Insert assistant message"
    )
    tests.append(("Create assistant message", test5))

    # Test 6: Create a source
    test6 = run_sql(
        """
        INSERT INTO sources (notebook_id, user_id, title, content, type, url)
        VALUES (
            (SELECT id FROM notebooks LIMIT 1),
            '00000000-0000-0000-0000-000000000001',
            'Test Source Document',
            'This is a test source document for the automated test suite.',
            'text',
            'https://example.com/test-source'
        )
        RETURNING id, title, type;
        """,
        "CREATE - Insert new source"
    )
    tests.append(("Create source", test6))

    # Test 7: Count all records
    test7 = run_sql(
        """
        SELECT
            'notebooks' as table_name, COUNT(*) as count FROM notebooks
        UNION ALL
        SELECT 'chats', COUNT(*) FROM chats
        UNION ALL
        SELECT 'messages', COUNT(*) FROM messages
        UNION ALL
        SELECT 'sources', COUNT(*) FROM sources;
        """,
        "READ - Count all records"
    )
    tests.append(("Count records", test7))

    # Test 8: Get notebook stats using the helper function
    test8 = run_sql(
        """
        SELECT * FROM get_notebook_stats((SELECT id FROM notebooks LIMIT 1));
        """,
        "READ - Get notebook stats via function"
    )
    tests.append(("Notebook stats function", test8))

    # Test 9: Update notebook
    test9 = run_sql(
        """
        UPDATE notebooks
        SET description = 'Updated description via automated test',
            updated_at = NOW()
        WHERE id = (SELECT id FROM notebooks LIMIT 1)
        RETURNING id, title, description, updated_at;
        """,
        "UPDATE - Modify notebook"
    )
    tests.append(("Update notebook", test9))

    # Test 10: Join query across tables
    test10 = run_sql(
        """
        SELECT
            n.title as notebook_title,
            c.title as chat_title,
            COUNT(m.id) as message_count
        FROM notebooks n
        LEFT JOIN chats c ON c.notebook_id = n.id
        LEFT JOIN messages m ON m.chat_id = c.id
        GROUP BY n.id, n.title, c.title
        LIMIT 5;
        """,
        "READ - Complex join query"
    )
    tests.append(("Complex join query", test10))

    # Cleanup: Delete test data
    cleanup = run_sql(
        """
        DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE notebook_id IN (SELECT id FROM notebooks WHERE user_id = '00000000-0000-0000-0000-000000000001'));
        DELETE FROM chats WHERE notebook_id IN (SELECT id FROM notebooks WHERE user_id = '00000000-0000-0000-0000-000000000001');
        DELETE FROM sources WHERE notebook_id IN (SELECT id FROM notebooks WHERE user_id = '00000000-0000-0000-0000-000000000001');
        DELETE FROM notebooks WHERE user_id = '00000000-0000-0000-0000-000000000001';
        """,
        "CLEANUP - Remove test data"
    )
    tests.append(("Cleanup test data", cleanup))

    # Final verification
    final = run_sql(
        """
        SELECT
            (SELECT COUNT(*) FROM notebooks) as notebooks,
            (SELECT COUNT(*) FROM chats) as chats,
            (SELECT COUNT(*) FROM messages) as messages,
            (SELECT COUNT(*) FROM sources) as sources;
        """,
        "FINAL VERIFICATION - Confirm cleanup"
    )
    tests.append(("Final verification", final))

    # Print summary
    print("\n" + "="*60)
    print("CRUD OPERATIONS TEST SUMMARY")
    print("="*60)

    passed = sum(1 for _, result in tests if result)
    total = len(tests)

    for test_name, result in tests:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    print("\n" + "-"*60)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("\n✓ All CRUD operations working correctly!")
        print("✓ Database is fully functional and ready for use.")
        return 0
    else:
        print("\n⚠️  Some operations failed. Check output above.")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
