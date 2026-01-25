from supabase import create_client, Client
from app.config import get_settings
import psycopg
from typing import Union
import json

settings = get_settings()

# Direct PostgreSQL connection string (for local development without full Supabase stack)
POSTGRES_URL = "postgres://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres"

# Detect if we should use direct PostgreSQL connection (when URL points to raw Postgres port)
USE_DIRECT_POSTGRES = settings.supabase_url.endswith(":5432") or "localhost:5432" in settings.supabase_url


def get_supabase_client() -> Union[Client, "PostgresDirectClient"]:
    """Get Supabase client with service role key for backend operations.

    Uses direct PostgreSQL connection when Supabase REST API is not available.
    """
    if USE_DIRECT_POSTGRES:
        return PostgresDirectClient()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon_client() -> Union[Client, "PostgresDirectClient"]:
    """Get Supabase client with anon key for user-facing operations.

    Uses direct PostgreSQL connection when Supabase REST API is not available.
    """
    if USE_DIRECT_POSTGRES:
        return PostgresDirectClient()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


class PostgresDirectClient:
    """Direct PostgreSQL client for when Supabase REST API is not available.

    Provides a minimal table()-like interface compatible with Supabase client.
    """

    def __init__(self):
        self._conn = None

    @property
    def conn(self):
        if self._conn is None:
            self._conn = psycopg.connect(POSTGRES_URL, autocommit=True)
        return self._conn

    def table(self, table_name: str):
        """Return a query builder for the specified table."""
        return PostgresTableBuilder(self.conn, table_name)


class PostgresTableBuilder:
    """Query builder that mimics Supabase's table API."""

    def __init__(self, conn, table_name: str):
        self.conn = conn
        self.table_name = table_name
        self._select_columns = "*"
        self._where_conditions = []
        self._order_clause = None
        self._limit_value = None
        self._single_result = False
        self._insert_data = None
        self._update_data = None
        self._delete_flag = False

    def select(self, columns: str = "*"):
        self._select_columns = columns
        return self

    def eq(self, column: str, value):
        self._where_conditions.append(f"{column} = %s")
        self._where_values = getattr(self, "_where_values", [])
        self._where_values.append(value)
        return self

    def in_(self, column: str, values: list):
        placeholders = ",".join(["%s"] * len(values))
        self._where_conditions.append(f"{column} IN ({placeholders})")
        self._where_values = getattr(self, "_where_values", [])
        self._where_values.extend(values)
        return self

    def order(self, column: str, desc: bool = False):
        direction = "DESC" if desc else "ASC"
        self._order_clause = f"ORDER BY {column} {direction}"
        return self

    def limit(self, count: int):
        self._limit_value = count
        return self

    def single(self):
        self._single_result = True
        return self

    def _serialize_value(self, value):
        """Serialize values for PostgreSQL, handling JSONB/dict/types."""
        if isinstance(value, dict):
            from psycopg.types.json import Jsonb
            return Jsonb(value)
        # Lists: check if they should be JSONB (contain dicts) or arrays
        if isinstance(value, list):
            # If list contains dicts, it's a JSONB array
            if value and isinstance(value[0], dict):
                from psycopg.types.json import Jsonb
                return Jsonb(value)
            # Otherwise it's a native array (like UUID[])
            return value
        return value

    def execute(self):
        """Execute the query and return Supabase-like response."""
        cur = self.conn.cursor()

        if self._insert_data is not None:
            # INSERT operation
            columns = list(self._insert_data.keys())
            values = [self._serialize_value(v) for v in self._insert_data.values()]
            placeholders = ",".join(["%s"] * len(values))
            query = f"""
                INSERT INTO {self.table_name} ({','.join(columns)})
                VALUES ({placeholders})
                RETURNING *
            """
            cur.execute(query, values)
            rows = cur.fetchall()
            columns_desc = [desc[0] for desc in cur.description]
            data = [dict(zip(columns_desc, row)) for row in rows]

        elif self._update_data is not None:
            # UPDATE operation
            set_clause = ",".join([f"{k} = %s" for k in self._update_data.keys()])
            values = [self._serialize_value(v) for v in self._update_data.values()]
            if self._where_conditions:
                where_clause = " AND ".join(self._where_conditions)
                values.extend(self._where_values)
                query = f"UPDATE {self.table_name} SET {set_clause} WHERE {where_clause} RETURNING *"
            else:
                query = f"UPDATE {self.table_name} SET {set_clause} RETURNING *"
            cur.execute(query, values)
            rows = cur.fetchall()
            columns_desc = [desc[0] for desc in cur.description]
            data = [dict(zip(columns_desc, row)) for row in rows]

        elif self._delete_flag:
            # DELETE operation
            if self._where_conditions:
                where_clause = " AND ".join(self._where_conditions)
                values = self._where_values
                query = f"DELETE FROM {self.table_name} WHERE {where_clause} RETURNING *"
                cur.execute(query, values)
                rows = cur.fetchall()
                columns_desc = [desc[0] for desc in cur.description]
                data = [dict(zip(columns_desc, row)) for row in rows]
            else:
                data = []

        else:
            # SELECT operation
            query_parts = [f"SELECT {self._select_columns} FROM {self.table_name}"]
            values = []

            if self._where_conditions:
                where_clause = " AND ".join(self._where_conditions)
                query_parts.append(f"WHERE {where_clause}")
                values = self._where_values

            if self._order_clause:
                query_parts.append(self._order_clause)

            if self._limit_value:
                query_parts.append(f"LIMIT {self._limit_value}")

            query = " ".join(query_parts)
            cur.execute(query, values)
            rows = cur.fetchall()
            columns_desc = [desc[0] for desc in cur.description]
            data = [dict(zip(columns_desc, row)) for row in rows]

        cur.close()

        # Handle single() result
        if self._single_result:
            if len(data) == 0:
                return PostgresResponse(data=None)
            return PostgresResponse(data=data[0])

        return PostgresResponse(data=data)

    def insert(self, data: dict):
        self._insert_data = data
        return self

    def update(self, data: dict):
        self._update_data = data
        return self

    def delete(self):
        self._delete_flag = True
        return self


class PostgresResponse:
    """Response object that mimics Supabase's response format."""

    def __init__(self, data):
        self.data = data
