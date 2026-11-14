---
title: "PostgreSQL 19: NOT IN becomes an anti join when nothing can be NULL"
date: 2026-11-14
description: "A proof about nullability unlocks a completely different plan"
tags: ["postgres", "database", "twil", "benchmark", "planner"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 7
draft: false
---

This one is a small lesson in SQL semantics disguised as a planner feature.

`x NOT IN (SELECT y ...)` is not the same thing as an anti join. If `y` contains a NULL, then `x = y` evaluates to NULL for that comparison, and the whole `NOT IN` becomes NULL, which filters the row out. An anti join would keep the row because no match was found. Because of that mismatch, the planner has never been able to turn `NOT IN` into an anti join, and it fell back to a filter with a hashed subplan.

PostgreSQL 19 changes that, but only when it can prove the special case does not apply: both sides of the comparison must be non-nullable, and the operator must belong to a B-tree or hash operator family, which is used as a proxy for "this operator does not return NULL for non-null inputs". If both conditions hold, `NOT IN` and the anti join produce identical results and the planner is free to pick the better join strategy.

## The plan change

2 million rows on the outer side, a 2 million row subquery, both columns `NOT NULL`.

```sql
CREATE TABLE t_nums (id int NOT NULL, payload text);
INSERT INTO t_nums SELECT g, md5(g::text) FROM generate_series(1, 2000000) g;

CREATE TABLE t_blocks_big (id int NOT NULL);
INSERT INTO t_blocks_big SELECT g * 2 FROM generate_series(1, 2000000) g;

SELECT count(*) FROM t_nums WHERE id NOT IN (SELECT id FROM t_blocks_big);
```

18.7:

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Seq Scan on t_nums
                    Filter: (NOT (ANY (id = (hashed SubPlan 1).col1)))
                    SubPlan 1
                      ->  Seq Scan on t_blocks_big
```

19 RC2:

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Hash Anti Join
                    Hash Cond: (t_nums.id = t_blocks_big.id)
                    ->  Parallel Seq Scan on t_nums
                    ->  Hash
                          ->  Seq Scan on t_blocks_big
```

The interesting bit in the 18 plan is `loops=3` on the subplan scan. Each parallel worker builds its own hashed subplan, so the 2 million row table is scanned three times. The anti join builds one shared hash table for all workers.

| version | plan | time |
|---|---|---|
| 18.7 | parallel seq scan + hashed subplan | 719 ms |
| 19 RC2 | parallel hash anti join | 410 ms |

1.75x here. The gap should grow with the size of the subquery and with the number of workers, because that is exactly the work being duplicated.

## It only happens when it is safe

If either column is nullable, the plan looks like 18 again. That is not a missed optimization, it is the semantics of `NOT IN` with NULLs. So do not add `NOT NULL` to a column just to get the faster plan, unless the column really cannot be null.

There is a second condition I appreciate: the operator has to be a standard index operator. In practice that means the normal comparison operators, not a custom one that might return NULL for non-null inputs. The commit notes that the check is conservative on purpose and may miss cases where non-nullability could be proven through more elaborate analysis. Missing a conversion is fine. Making a wrong conversion would be a correctness bug.

One more benefit mentioned in the commit: once the sublink becomes a real relation, the planner can consider global join orders, not just the fixed order of the subplan filter. So on more complex queries the win can be larger than the simple scan here shows.

Reproduced with `postgres:18` and `postgres:19rc2`, default parallelism, warm cache, `shared_buffers=128MB`, `work_mem=64MB`.
