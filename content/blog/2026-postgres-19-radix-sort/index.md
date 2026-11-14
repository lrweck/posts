---
title: "PostgreSQL 19: radix sort is faster than the label suggests"
date: 2026-11-14
description: "Sorting 5 million integers got 1.7x faster, and EXPLAIN still calls it quicksort"
tags: ["postgres", "database", "twil", "benchmark", "sorting"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 5
draft: false
---

I like changes like this one because nothing about the query changes, no config, no new syntax. The release note is one line: "Improve sort performance using radix sort".

The commit behind it explains the constraint: radix sort works on sequences of unsigned bytes. To sort tuples, the leading datum gets normalized first. Signed integers get their sign bit flipped so they compare like unsigned, descending order is handled by complementing the value, and NULLs get partitioned to the correct side before the radix pass. It only handles a single leading key that is a pass-by-value datum, and ties fall back to qsort. Below 40 tuples it just uses qsort, because the setup cost is not worth it.

That last detail turned out to be the most fun part of testing.

## The benchmark

5 million random integers, no index, `work_mem = 1GB` so the sort stays in memory.

```sql
CREATE TABLE sort_i (id int NOT NULL);
INSERT INTO sort_i SELECT (random() * 100000000)::int FROM generate_series(1, 5000000) g;
ANALYZE sort_i;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT * FROM sort_i ORDER BY id;
```

18.7 took about 909 ms. 19 RC2 took about 526 ms. That is 1.73x.

The detail that made me smile: `EXPLAIN` still reports `Sort Method: quicksort` in 19. The plan label did not change, because the method was never exposed as a named sort method. The only way to notice is the clock.

## Low cardinality behaves differently

The commit says moderately low cardinality inputs show modest improvements, because our qsort is strongly optimized for very low cardinality. So I tested 5 million rows with only 100 distinct values:

| input | 18.7 | 19 RC2 | speedup |
|---|---|---|---|
| 5M distinct ints | 909 ms | 526 ms | 1.73x |
| 100 distinct ints | 419 ms | 338 ms | 1.24x |

The pattern matches the commit's claim, and it is a useful reminder that the fast path is not automatically faster for every shape. Radix sort wins when the leading key has high cardinality.

## What is not covered

Multi-key sorts still go through qsort. Text sorts still use abbreviated keys and the usual machinery, and the commit mentions that extending the normalization to multiple keys is left for future work. So do not expect a blanket 1.7x on every `ORDER BY`.

External sorts get the benefit too, since the radix path is also used when sorting runs before spilling to disk, but I did not benchmark that case.

If you maintain a read-heavy reporting database and spend time looking at sort nodes in slow query plans, this is one of those upgrades you get for free by moving to 19. Reproduced with `postgres:18` and `postgres:19rc2`, `work_mem=1GB`, warm cache. The sort ran without parallelism in both versions.
