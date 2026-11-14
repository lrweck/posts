---
title: "PostgreSQL 19: Memoize finally works for anti joins"
date: 2026-11-14
description: "Nested loop anti joins can cache repeated lookups when the inner side is unique"
tags: ["postgres", "database", "twil", "benchmark", "planner"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 2
draft: false
---

Anti joins are everywhere once you notice them: customers without orders, products without sales, users without a login this month. Most people write them as `NOT EXISTS` or as a `LEFT JOIN ... WHERE right.id IS NULL`.

PostgreSQL has a Memoize node that caches inner side lookups for nested loop joins, so repeated outer keys do not hit the index again. Until 19 it was disabled for anti joins, and the reason is easy to miss.

A nested loop anti join stops scanning the inner side at the first match. Memoize wants to mark a cache entry as "complete" after a full scan, and it cannot do that here. Marking complete after the first tuple would also be wrong: if that tuple does not satisfy the join clause, a later matching tuple would find the entry already marked complete and be skipped. In 19, the planner checks whether the inner side is provably unique. With a unique inner side there can be at most one match, so marking complete after one tuple is safe.

## The test

I built an outer table with 4 million rows over 10,000 keys, plus a few keys that do not exist on the inner side, and a 10,000 row inner table with a primary key.

```sql
CREATE TABLE inner_big (k int PRIMARY KEY, v text);
INSERT INTO inner_big SELECT g, 'v' || g FROM generate_series(1, 10000) g;

CREATE TABLE outer_big (id int PRIMARY KEY, k int NOT NULL);
INSERT INTO outer_big
SELECT g, CASE WHEN g % 400 = 0 THEN 10000 + g ELSE 1 + (g % 10000) END
FROM generate_series(1, 4000000) g;
```

Then the anti join:

```sql
SELECT count(*)
FROM outer_big o
LEFT JOIN inner_big i ON i.k = o.k
WHERE i.k IS NULL;
```

One caveat about this benchmark: I disabled hash joins and merge joins to force the nested loop shape. With default settings both versions may pick a hash anti join, where Memoize never enters the picture, and then you see no difference at all.

## Plans

18.7 picks a parallel nested loop anti join with an index only scan on the inner side, once per outer row.

19 RC2 picks the same join, but inserts a Memoize node:

```text
Nested Loop Anti Join
  ->  Parallel Seq Scan on outer_big o
  ->  Memoize
        Cache Key: o.k
        Cache Mode: logical
        ->  Index Only Scan using inner_big_pkey on inner_big i
```

The run details are the interesting part. Each worker reports around 1.3 million cache hits and about 13 thousand misses. Those misses correspond to the 10,000 distinct keys plus the keys that are absent from the inner table.

| version | plan | time |
|---|---|---|
| 18.7 | parallel nested loop anti join | 1,096 ms |
| 19 RC2 | nested loop anti join + Memoize | 231 ms |

About 4.7x faster on this shape.

## What to watch out for

Memoize is not free. It keeps a hash table of keys, 1.2 MB here, and it only pays off when outer keys repeat. If every outer row has a distinct key you get all misses, a bit of extra memory and a bit of extra CPU, which is why the planner still costs the path before choosing it.

The other condition is the uniqueness proof. If the inner side is not provably unique, 19 keeps the old behavior, and that is not a bug you can work around with a hint. Making the inner key a real primary key or unique index is what enables the path.

Reproduced with `postgres:18` (18.7) and `postgres:19rc2` in Docker, same `shared_buffers=128MB`, on a 20 core machine with the default `max_parallel_workers_per_gather=2`.
