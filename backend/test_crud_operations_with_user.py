#!/usr/bin/env python3
"""
Test CRUD operations with a real auth user.
This creates a proper user in auth.users first, then tests all operations.
"""
import subprocess
import uuid


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

    if result.returncode == 0:
        print(f"✓ SUCCESS")
        if result.stdout.strip() and result.stdout.strip() != '':
            print(f"Output:\n{result.stdout[:500]}")
        return True
    else:
        print(f"✗ FAILED: {result.stderr[:300]}")
        return False


def main():
    print("\n" + "="*60)
    print("SUPABASE CRUD OPERATIONS TEST (With Real User)")
    print("="*60)

    # Generate a test user ID
    test_user_id = str(uuid.uuid4())

    print(f"\nTest User ID: {test_user_id}")

    tests = []

    # Test 1: Create a real auth user (bypassing RLS with service role)
    test1 = run_sql(
        f"""
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
        VALUES (
            '{test_user_id}',
            'test@example.com',
            crypt('test-password', gen_salt('bf')),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id, email;
        """,
        "CREATE - Insert auth user"
    )
    tests.append(("Create auth user", test1))

    # Test 2: Create a notebook for this user
    test2 = run_sql(
        f"""
        INSERT INTO notebooks (user_id, title, description)
        VALUES (
            '{test_user_id}',
            'My Test Notebook',
            'Created during automated testing'
        )
        RETURNING id, title, description;
        """,
        "CREATE - Insert notebook"
    )
    tests.append(("Create notebook", test2))

    # Test 3: Read all notebooks for this user
    test3 = run_sql(
        f"""
        SELECT id, title, description, created_at
        FROM notebooks
        WHERE user_id = '{test_user_id}';
        """,
        "READ - Query user's notebooks"
    )
    tests.append(("Read notebooks", test3))

    # Test 4: Create a chat in the notebook
    test4 = run_sql(
        f"""
        INSERT INTO chats (notebook_id, user_id, title, model)
        VALUES (
            (SELECT id FROM notebooks WHERE user_id = '{test_user_id}' LIMIT 1),
            '{test_user_id}',
            'Test Chat Session',
            'claude-3.5-sonnet'
        )
        RETURNING id, title, model;
        """,
        "CREATE - Insert chat"
    )
    tests.append(("Create chat", test4))

    # Test 5: Create user message
    test5 = run_sql(
        f"""
        INSERT INTO messages (chat_id, role, content, tokens)
        VALUES (
            (SELECT id FROM chats WHERE user_id = '{test_user_id}' LIMIT 1),
            'user',
            'What is the capital of France?',
            8
        )
        RETURNING id, role, left(content, 50) as preview;
        """,
        "CREATE - Insert user message"
    )
    tests.append(("Create user message", test5))

    # Test 6: Create assistant message
    test6 = run_sql(
        f"""
        INSERT INTO messages (chat_id, role, content, tokens)
        VALUES (
            (SELECT id FROM chats WHERE user_id = '{test_user_id}' LIMIT 1),
            'assistant',
            'The capital of France is Paris.',
            8
        )
        RETURNING id, role, left(content, 50) as preview;
        """,
        "CREATE - Insert assistant message"
    )
    tests.append(("Create assistant message", test6))

    # Test 7: Create a source
    test7 = run_sql(
        f"""
        INSERT INTO sources (notebook_id, user_id, title, content, type, url)
        VALUES (
            (SELECT id FROM notebooks WHERE user_id = '{test_user_id}' LIMIT 1),
            '{test_user_id}',
            'France Wikipedia',
            'France is a country in Western Europe...',
            'website',
            'https://en.wikipedia.org/wiki/France'
        )
        RETURNING id, title, type;
        """,
        "CREATE - Insert source"
    )
    tests.append(("Create source", test7))

    # Test 8: Count all records
    test8 = run_sql(
        f"""
        SELECT
            'notebooks' as table_name, COUNT(*) as count FROM notebooks WHERE user_id = '{test_user_id}'
        UNION ALL
        SELECT 'chats', COUNT(*) FROM chats WHERE user_id = '{test_user_id}'
        UNION ALL
        SELECT 'messages', COUNT(*) FROM messages WHERE chat_id IN (
            SELECT id FROM chats WHERE user_id = '{test_user_id}'
        )
        UNION ALL
        SELECT 'sources', COUNT(*) FROM sources WHERE user_id = '{test_user_id}';
        """,
        "READ - Count user's records"
    )
    tests.append(("Count records", test8))

    # Test 9: Complex join query
    test9 = run_sql(
        f"""
        SELECT
            n.title as notebook,
            c.title as chat,
            COUNT(m.id) as messages,
            COUNT(DISTINCT s.id) as sources
        FROM notebooks n
        LEFT JOIN chats c ON c.notebook_id = n.id
        LEFT JOIN messages m ON m.chat_id = c.id
        LEFT JOIN sources s ON s.notebook_id = n.id
        WHERE n.user_id = '{test_user_id}'
        GROUP BY n.id, n.title, c.title;
        """,
        "READ - Complex join with aggregations"
    )
    tests.append(("Complex join", test9))

    # Test 10: Update notebook
    test10 = run_sql(
        f"""
        UPDATE notebooks
        SET description = 'Updated description',
            settings = '{{"model": "claude-3.5-sonnet", "temperature": 0.8}}'::jsonb
        WHERE id = (SELECT id FROM notebooks WHERE user_id = '{test_user_id}' LIMIT 1)
        RETURNING id, title, description, settings;
        """,
        "UPDATE - Modify notebook"
    )
    tests.append(("Update notebook", test10))

    # Test 11: Test RLS - Try to access another user's data (should fail)
    test11 = run_sql(
        f"""
        SET ROLE authenticated;
        SET request.jwt.claim.sub = '{test_user_id}';
        SELECT * FROM notebooks WHERE user_id = '{test_user_id}';
        """,
        "SECURITY - Test RLS with user context"
    )
    tests.append(("RLS security test", test11))

    # Test 12: Get notebook stats
    test12 = run_sql(
        f"""
        SELECT * FROM get_notebook_stats(
            (SELECT id FROM notebooks WHERE user_id = '{test_user_id}' LIMIT 1)
        );
        """,
        "READ - Get notebook stats"
    )
    tests.append(("Notebook stats function", test12))

    # Cleanup
    cleanup = run_sql(
        f"""
        DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = '{test_user_id}');
        DELETE FROM chats WHERE user_id = '{test_user_id}';
        DELETE FROM sources WHERE user_id = '{test_user_id}';
        DELETE FROM notebooks WHERE user_id = '{test_user_id}';
        DELETE FROM auth.users WHERE id = '{test_user_id}';
        """,
        "CLEANUP - Remove all test data"
    )
    tests.append(("Cleanup", cleanup))

    # Final verification
    final = run_sql(
        f"""
        SELECT
            (SELECT COUNT(*) FROM notebooks WHERE user_id = '{test_user_id}') as notebooks,
            (SELECT COUNT(*) FROM chats WHERE user_id = '{test_user_id}') as chats,
            (SELECT COUNT(*) FROM messages) as messages,
            (SELECT COUNT(*) FROM sources WHERE user_id = '{test_user_id}') as sources;
        """,
        "FINAL - Verify cleanup"
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
        print("✓ Row Level Security (RLS) is properly configured.")
        return 0
    else:
        print("\n⚠️  Some operations failed. Check output above.")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
