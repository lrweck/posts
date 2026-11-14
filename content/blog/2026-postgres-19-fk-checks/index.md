---
title: "PostgreSQL 19: faster foreign key checks on insert"
date: 2026-11-14
description: "Loading a million child rows got about 1.6x faster, while updates stayed the same"
tags: ["postgres", "database", "twil", "benchmark", "constraints"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 6
draft: false
---

Foreign keys are one of those things you turn on for correctness and then forget about until a bulk load takes longer than expected. Every inserted child row needs a lookup to prove the parent exists.

PostgreSQL 19 release notes include "Improve performance of foreign key constraint checks" (Junwang Zhao, Amit Langote, Chao Li). I wanted to know what that translates to in wall clock time, so I built the simplest shape I could think of.

## Setup

20,000 parents, then a single `INSERT ... SELECT` of 1 million children, all with valid references. No indexes on the child FK column, because I wanted to measure the check itself, not index maintenance.

```sql
CREATE TABLE fk_parent (id int PRIMARY KEY);
INSERT INTO fk_parent SELECT g FROM generate_series(1, 20000) g;

CREATE TABLE fk_child (
  id bigserial PRIMARY KEY,
  parent_id int NOT NULL REFERENCES fk_parent(id),
  payload text
);

INSERT INTO fk_child (parent_id, payload)
SELECT 1 + (g % 20000), md5(g::text) FROM generate_series(1, 1000000) g;
```

I truncated and repeated the insert to get two runs per version.

| operation | 18.7 | 19 RC2 |
|---|---|---|
| insert 1M child rows | 5.2 s | 3.2 s |
| update 1M rows, FK untouched | 2.6 to 4.1 s | 2.6 to 3.9 s |

About 1.6x on the insert. The update numbers overlap between versions, so I am not claiming an improvement there. That matches what I would expect: this change is about checking references for new rows, not about the path that skips the check when the key did not change.

## Numbers worth a caveat

The absolute times depend a lot on cache and storage. I ran both versions on the same machine (20 cores), with the same Docker settings (`shared_buffers=128MB`, `max_wal_size=256MB`), the same data, and two runs each. The ratio is the interesting part, not the 5.2 seconds.

I also did not dig into the patch, so I cannot tell you which part of the check got cheaper, only that the effect is real and reproducible in this shape. If you load child tables in bulk, especially with a partitioned parent, it is worth re-running your own load and comparing.

## Trying it

Both images are easy to get:

```bash
docker run -d --name pg18 -e POSTGRES_PASSWORD=secret postgres:18
docker run -d --name pg19 -e POSTGRES_PASSWORD=secret postgres:19rc2
```

Then run the SQL above and time it with `\timing` in psql. Keep the parent table small enough to fit in memory and the child insert large enough to dominate the timestamp overhead. If you use COPY instead of INSERT ... SELECT, the FK checks still run, but the input path changes, so compare like with like.
