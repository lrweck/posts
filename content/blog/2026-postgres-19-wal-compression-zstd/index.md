---
title: "PostgreSQL 19: wal_compression=on now means something else"
date: 2026-11-14
description: "The setting used to mean pglz. In 19 it picks the best method available, which on my build is zstd"
tags: ["postgres", "database", "twil", "benchmark", "wal"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 4
draft: false
---

Small config change, easy to miss: in PostgreSQL 19, setting `wal_compression = on` no longer means "use pglz". It means "use the best compression method available in this build". On the Debian packages I tested, asking for `on` resolves to zstd:

```sql
SET wal_compression = on;
SHOW wal_compression;
-- zstd
```

In 18.7 the same sequence prints `pglz`.

## The benchmark

I wanted numbers that look like real traffic, not a synthetic single-statement update. So I used pgbench with a fixed number of transactions instead of a time limit: 4 clients, 5,000 transactions each, 20,000 transactions per run. Every transaction updates one random row in a 1 million row table (244 MB) with a JSON-ish payload.

```sql
CREATE TABLE walb (id int PRIMARY KEY, payload text NOT NULL);
INSERT INTO walb
SELECT g, repeat(format('{"id":%s,"service":"orders-api","msg":"request completed","path":"/api/v1/orders/%s"}', g, g * 7), 2)
FROM generate_series(1, 1000000) g;

-- pgbench script
\set id random(1, 1000000)
UPDATE walb SET payload = payload || 'x' WHERE id = :id;
```

Before each run: `CHECKPOINT`, then read the `pg_stat_wal` counters. After the run, subtract. No `pg_stat_reset_shared()` involved, because resets on a live cluster can mix pending stats from earlier runs and give you nonsense. I also checked the same bytes with `pg_wal_lsn_diff()`, and the two agreed within 2%.

Five runs per configuration, medians:

| cluster | `wal_compression` | method | WAL | per transaction | tps |
|---|---|---|---|---|---|
| 18.7 | `on` | pglz | 13.37 MB | 669 B | 4,752 |
| 18.7 | `zstd` | zstd | 10.90 MB | 545 B | 4,700 |
| 19rc1 | `on` | zstd | 11.13 MB | 556 B | 4,643 |
| 19rc1 | `pglz` | pglz | 13.23 MB | 662 B | 4,664 |

zstd produced 16% to 18% less WAL than pglz in this workload. The cross checks are the part that convinced me:

- 18 with explicit `zstd` (10.90 MB) lands on 19 with `on` (11.13 MB).
- 19 with explicit `pglz` (13.23 MB) lands on 18 with `on` (13.37 MB).

So the difference is the compression method, not something else that changed between the two majors.

Throughput stayed between 4,643 and 4,752 tps in every configuration, which is inside the noise of this machine. With a 244 MB table, most of the read side is in shared memory, and the CPU cost of zstd did not show up as a measurable slowdown. On a write-heavy box with a colder cache, the tradeoff may look different.

## A note about the stats

If you build dashboards on these views, 19 changed `pg_stat_wal`: `wal_write` and `wal_sync` are gone, and `wal_fpi_bytes` was added. Also, `wal_fpi` is not directly comparable between 18 and 19. In 18 a compressed full page image can be split into several chunks and each chunk counts as an FPI; in 19 the counter tracks the original page. Compare `wal_bytes` across versions, not `wal_fpi`.

I learned that the hard way: my first attempt used `pg_stat_reset_shared('wal')` between runs and produced FPI counts that made no sense, including 17,000 FPIs for a run that touched about 5,000 pages. Deltas of cumulative counters fixed it.

## Why it matters

Less WAL means less disk traffic during writes, less data to archive, and less to ship to replicas. It is not free: zstd takes more CPU than pglz, and on a workload with poorly compressible WAL the ratio gets close to 1 while the CPU cost stays. If you tuned your write path around pglz, set it explicitly instead of relying on `on`:

```sql
-- pin the old behavior
ALTER SYSTEM SET wal_compression = 'pglz';
SELECT pg_reload_conf();
```

Or go the other way and ask for zstd by name, if your build has it. Both the Debian and the Alpine builds I used report zstd, lz4 and pglz as options, and `on` picked zstd.

## Reproducibility note

My very first measurement compared WAL bytes on a freshly created table and got identical numbers for every method, which made no sense. The reason: pages created after a checkpoint do not need full page images, so the workload never reached the compression path. A table with real data, checkpointed before the run, does. If you try this at home, force full page writes and use a table big enough to touch many pages.

Tested with `postgres:18-alpine` (18.7) and `postgres:19rc1-alpine` in Docker, on disk-backed volumes, both with `shared_buffers=1GB`, `max_wal_size=4GB`, `work_mem=64MB`, `full_page_writes=on`.
