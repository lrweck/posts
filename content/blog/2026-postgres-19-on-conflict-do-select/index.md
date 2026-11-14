---
title: "PostgreSQL 19: the upsert can return the row it found"
date: 2026-11-14
description: "INSERT ... ON CONFLICT DO SELECT closes a gap that pushed every upsert into two statements"
tags: ["postgres", "database", "twil", "benchmark", "sql"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 1
draft: false
---

For years the standard upsert dance in Postgres was two statements: try the insert with `ON CONFLICT DO NOTHING`, then run a `SELECT ... FOR UPDATE` to fetch the row that was already there. It works, but there is a gap between the two statements where another transaction can delete or change the row you just "locked".

PostgreSQL 19 adds `ON CONFLICT DO SELECT`, so the insert itself can return and lock the conflicting row.

```sql
BEGIN;
INSERT INTO accounts (id, balance) VALUES (42, 0)
ON CONFLICT (id) DO SELECT FOR UPDATE
RETURNING *;
COMMIT;
```

Two details I hit right away. The clause requires `RETURNING`, otherwise you get `ON CONFLICT DO SELECT requires a RETURNING clause`. And it only returns rows that actually conflicted: if the insert succeeded, you get zero rows, so it does not replace `INSERT ... RETURNING` for the insert case.

## Measuring the saved round trip

I loaded 100,000 accounts and ran the same logical operation through pgbench with 4 clients for 10 seconds, once against 18.7 and once against 19 RC2.

```sql
CREATE TABLE accounts (
  id int PRIMARY KEY,
  balance numeric NOT NULL
);
INSERT INTO accounts SELECT g, 100 FROM generate_series(1, 100000) g;
```

The PG18 script:

```sql
BEGIN;
INSERT INTO accounts (id, balance) VALUES (:id, 0) ON CONFLICT DO NOTHING;
SELECT * FROM accounts WHERE id = :id FOR UPDATE;
COMMIT;
```

The PG19 script:

```sql
BEGIN;
INSERT INTO accounts (id, balance) VALUES (:id, 0)
ON CONFLICT (id) DO SELECT FOR UPDATE RETURNING *;
COMMIT;
```

| version | statements per upsert | tps |
|---|---|---|
| 18.7 | 2 | 49,967 |
| 19 RC2 | 1 | 72,401 |

That is about 45% more transactions per second on a local socket. On a real application with network round trips the saving should be bigger, since one of the two trips disappears.

## When you should care

If your code reads a row right after an upsert and the row must stay locked, this is the feature to use. The lock and the conflict resolution happen in the same statement, so there is no window where the row can disappear between the insert and the select.

The locking clause accepts the same options as `SELECT`: `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`, plus an optional `WHERE`. The `WHERE` is applied to the conflicting row before returning it, which is handy when you only want to act on rows in a given state.

I tested with 19 RC2 in Docker (`postgres:19rc2`, `shared_buffers=128MB`), and 18.7 with the same settings. Since 19 is not GA yet, treat the numbers as a preview; the syntax is the part that matters.
