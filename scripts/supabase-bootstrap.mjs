import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function splitSql(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const dbUrl = required("SUPABASE_DB_URL");
  const bucketId = process.env.SUPABASE_STORAGE_BUCKET ?? "listing-images";
  const bucketPublic = (process.env.SUPABASE_STORAGE_PUBLIC ?? "true") === "true";

  const root = process.cwd();
  const policiesPath = path.join(root, "public", "docs", "storage-policies.sql");
  const policySql = await fs.readFile(policiesPath, "utf8");

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      `insert into storage.buckets (id, name, public)
       values ($1, $1, $2)
       on conflict (id) do update set public = excluded.public`,
      [bucketId, bucketPublic]
    );

    for (const stmt of splitSql(policySql)) {
      await client.query(stmt);
    }

    const checkBucket = await client.query(`select id, public from storage.buckets where id = $1`, [bucketId]);
    if (!checkBucket.rowCount) throw new Error(`Bucket not found after creation: ${bucketId}`);

    const checkPolicies = await client.query(
      `select polname
       from pg_policies
       where schemaname = 'storage' and tablename = 'objects'
         and polname like 'listing_images_%'
       order by polname`
    );
    if (checkPolicies.rowCount < 4) throw new Error(`Expected 4 storage policies, found ${checkPolicies.rowCount}`);

    process.stdout.write(`OK\nbucket=${bucketId}\npolicies=${checkPolicies.rowCount}\n`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});

