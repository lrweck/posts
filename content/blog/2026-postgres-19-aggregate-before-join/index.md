---
title: "PostgreSQL 19: aggregating before the join"
date: 2026-11-14
description: "The planner can now run a partial aggregate below the join and feed it fewer rows"
tags: ["postgres", "database", "twil", "benchmark", "planner"]
categories: ["dev"]
series: ["postgres-19"]
series_order: 3
draft: false
---

Here is a query shape I write all the time: join a large fact table to a small dimension and group by a column of the dimension.

```sql
SELECT c.region, sum(o.amount)
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.region;
```

With 2 million orders and 5,000 customers, both versions have to scan all the orders. The difference is what happens before that: in 18 the group by sits above the join, so the hash aggregate consumes the joined rows. In 19 the planner can run a partial aggregate on the orders side first, grouped by `customer_id`, which collapses 2 million rows into 5,000 before the join.

PostgreSQL 19 release notes describe this as allowing "some aggregate processing to be performed before joins". Key word: some. This is not a general pushdown of arbitrary aggregates. It applies when the aggregate can be split into partial and final parts and the grouping columns come from one side, and the planner still needs to prove the transformation is safe. If the join could duplicate rows on the aggregated side, moving the aggregate would change the result.

## The plans

18.7:

```text
Finalize HashAggregate
  Group Key: c.region
  ->  Gather
        ->  Partial HashAggregate
              Group Key: c.region
              ->  Hash Join
                    Hash Cond: (o.customer_id = c.id)
                    ->  Parallel Seq Scan on orders o
                    ->  Hash
                          ->  Seq Scan on customers c
```

19 RC2:

```text
Finalize HashAggregate
  Group Key: c.region
  ->  Gather
        ->  Partial HashAggregate
              Group Key: c.region
              ->  Hash Join
                    Hash Cond: (o.customer_id = c.id)
                    ->  Partial HashAggregate
                          Group Key: o.customer_id
                          ->  Parallel Seq Scan on orders o
                    ->  Hash
                          ->  Seq Scan on customers c
```

The extra `Partial HashAggregate` under the hash join is the whole feature. It also changes the sort below the finalize: each worker now sorts 5,000 groups instead of emitting many more rows into the join, which shows up as a jump in sort memory from 29 kB to 622 kB in the plan.

## Numbers

Two query shapes, same dataset, three runs each, warm cache.

| query | 18.7 | 19 RC2 |
|---|---|---|
| group by region (50 groups) | 179 ms | 114 ms |
| count per customer (5,000 groups) | 122 ms | 83 ms |

About 1.5x faster in both cases. Not a dramatic win, but it comes from doing less work, not from a faster loop, so it should hold as the fact table grows.

## Reproducing

```sql
CREATE TABLE customers (id int PRIMARY KEY, region text NOT NULL);
INSERT INTO customers SELECT g, 'r' || (g % 50) FROM generate_series(1, 5000) g;

CREATE TABLE orders (
  id int PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  amount numeric
);
INSERT INTO orders
SELECT g, 1 + (g % 5000), (g % 1000)::numeric
FROM generate_series(1, 2000000) g;
ANALYZE;
```

The second shape I tested was `SELECT c.id, count(*) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id`, which gets the same partial aggregate but then a `Gather Merge` with a sort because the finalize uses a GroupAggregate instead of a HashAggregate. The plan shape changes, the speedup is the same order of magnitude.

Everything ran in Docker with `postgres:18` and `postgres:19rc2`, `shared_buffers=128MB`, `work_mem=64MB`, default parallelism.
