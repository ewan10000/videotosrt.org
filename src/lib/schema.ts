import type { Bindings } from "../types";

type UserTableColumn = {
  name: string;
};

type RequiredUserColumn = {
  name: string;
  alterSql: string;
};

const REQUIRED_USER_COLUMNS: RequiredUserColumn[] = [
  {
    name: "plan",
    alterSql: "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'",
  },
  {
    name: "extra_credit_hours",
    alterSql: "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0",
  },
  {
    name: "last_login_at",
    alterSql: "ALTER TABLE users ADD COLUMN last_login_at TEXT",
  },
];

let schemaBootstrapPromise: Promise<void> | undefined;

export function missingUserColumnAlterStatements(columns: Iterable<UserTableColumn>) {
  const existingColumns = new Set([...columns].map((column) => column.name));
  return REQUIRED_USER_COLUMNS
    .filter((column) => !existingColumns.has(column.name))
    .map((column) => column.alterSql);
}

async function readUserColumns(env: Bindings) {
  const usersTable = await env.DB.prepare("PRAGMA table_info(users)").all<UserTableColumn>();
  return usersTable.results ?? [];
}

function hasUserColumn(columns: Iterable<UserTableColumn>, columnName: string) {
  for (const column of columns) {
    if (column.name === columnName) return true;
  }
  return false;
}

async function runMissingUserColumnAlter(env: Bindings, column: RequiredUserColumn) {
  try {
    await env.DB.prepare(column.alterSql).run();
  } catch (error) {
    const refreshedColumns = await readUserColumns(env);
    if (hasUserColumn(refreshedColumns, column.name)) return;

    throw error;
  }
}

async function runSchemaBootstrap(env: Bindings) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS creem_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();

  const existingColumns = new Set((await readUserColumns(env)).map((column) => column.name));
  for (const column of REQUIRED_USER_COLUMNS) {
    if (!existingColumns.has(column.name)) {
      await runMissingUserColumnAlter(env, column);
    }
  }
}

export async function bootstrapSchema(env: Bindings) {
  schemaBootstrapPromise ??= runSchemaBootstrap(env).catch((error) => {
    schemaBootstrapPromise = undefined;
    throw error;
  });

  return schemaBootstrapPromise;
}
