---
title: "This Week I Learned: MySQL Sneaks Your Primary Key Into Every Secondary Index"
date: 2026-11-14
description: "I declared KEY (a) and got KEY (a, id) for free — and I can prove it with index sizes"
tags: ["mysql", "database", "index"]
categories: ["dev"]
draft: false
---

This week I discovered something about MySQL that genuinely surprised me — the kind of thing where you read it, go "wait, really?", and immediately have to go test it yourself.

Here it is: **in InnoDB, every secondary index silently appends the table's primary key to itself.** You declare `KEY (a)`, and what you actually get on disk is effectively `KEY (a, id)`.

I had always pictured a secondary index as containing just the columns I listed, plus a little pointer back to the row. Nope. The "pointer" *is* the primary key value, stored right there in the index entry. Which means if you write `KEY (a, id)` by hand — redundantly including the PK — you should end up with exactly the same index as plain `KEY (a)`.

That's a testable claim. So I tested it.

## The experiment

Two identical tables, 100,000 rows each, same data — the only difference is the index definition:

```sql
CREATE TABLE t_explicit (
  id INT PRIMARY KEY,
  a INT NOT NULL,
  KEY idx_a_id (a, id)   -- PK included by hand
) ENGINE=InnoDB;

CREATE TABLE t_implicit (
  id INT PRIMARY KEY,
  a INT NOT NULL,
  KEY idx_a (a)          -- just (a)... or is it?
) ENGINE=InnoDB;
```

Same 100k rows in both, then rebuild to rule out fragmentation noise (more on that below), and compare real index sizes from `mysql.innodb_index_stats`:

| index | pages | leaf pages |
|---|---|---|
| `idx_a_id` (explicit `(a, id)`) | 97 | 84 |
| `idx_a` (plain `(a)`) | 97 | 84 |

Byte-for-byte identical. The plain `KEY (a)` is carrying the PK around just like the explicit composite one. Theory confirmed.

To be extra sure it wasn't a quirk of comparing two tables, I did the cleaner version too: **one table, both indexes on it**, built by the same operation:

```sql
ALTER TABLE t_both ADD KEY idx_implicit (a), ADD KEY idx_explicit (a, id);
```

Same result — both indexes: 97 pages, 84 leaf pages. There is no difference because there is no difference; they *are* the same index.

## The sneaky part: nothing tells you

What I love about this is how invisible it is. `SHOW INDEX` happily shows `idx_a` as containing only column `a`:

```text
Key_name      Seq  Column_name
idx_implicit  1    a
idx_explicit  1    a
idx_explicit  2    id
```

The appended PK doesn't show up there at all. But `EXPLAIN` gives it away — this query is satisfied from the index alone, without touching the table:

```sql
EXPLAIN SELECT id FROM t_both WHERE a = 42;
-- type: ref, key: idx_implicit, Extra: Using index
```

`Using index` means it's a covering index: everything the query needs (`a` and `id`) came straight out of `idx_implicit`. The `id` had to be in there somewhere. Mystery solved.

## Two things I'm taking away from this

**1. Don't hand-append the PK to your secondary indexes.** `KEY (a, id)` where `id` is the PK is pure clutter — MySQL already does it. Save your future self the confusion of wondering whether that second column is load-bearing. (It isn't.)

**2. Keep primary keys short, because they get copied *everywhere*.** This is the real punchline. Every secondary index on the table carries a copy of the PK in every entry. A chunky UUID or long string PK doesn't just make the clustered index big — it inflates *each* secondary index too. An `INT` (or `BIGINT`) PK keeps all of them lean.

## One trap I fell into while testing

Honest footnote, because it bit me: my first comparison, before rebuilding the tables, showed *different* sizes (161 pages vs 97). I almost concluded the theory was wrong! Turns out one table had been loaded with `INSERT ... SELECT` and had different page fragmentation than the other. After `OPTIMIZE TABLE` (which for InnoDB is recreate + analyze), both landed on exactly 97 pages and the data files were the same size down to the byte. Lesson: if you're comparing index sizes, rebuild first, or build both indexes on the same table in one go.

Anyway — small discovery, but it changed how I think about index design, and it was genuinely fun to verify instead of just believing the docs. If you run MySQL, try it on one of your own tables. There's something deeply satisfying about watching two numbers come out exactly equal.
