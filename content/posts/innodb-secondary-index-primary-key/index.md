---
title: "The Primary Key You Didn't Add to Your MySQL Index"
date: 2026-11-14
description: "A small InnoDB detail with surprisingly practical consequences: secondary index entries carry the table's primary key."
tags: ["mysql", "innodb", "databases", "indexes"]
categories: ["databases"]
---

This week I stumbled across a MySQL detail that I found genuinely fascinating, and naturally, I had to dig a little deeper.

When you create a secondary index in InnoDB, there is something quietly added to it even though you never explicitly asked for it: the table's primary key.

Wait, what?

To understand why, it helps to remember how InnoDB stores table data.

InnoDB uses a clustered index. In a table with a primary key, that primary key defines the clustered index, and the leaf pages of that B+Tree contain the actual row data.

Secondary indexes work differently. Their leaf records contain the indexed columns **and the primary key columns needed to identify the corresponding clustered record**. When a query finds a row through a secondary index, InnoDB can use that primary key value to look up the full row in the clustered index.

So the primary key is not just a constraint or a way to identify rows. It is also part of the storage story for every secondary index.

### Let's try to prove it

I wanted to check this with a small experiment rather than just take the explanation for granted.

Imagine a table with `id` as its primary key and `name` as another column:

```sql
CREATE TABLE test_table (
    id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;
```

Now let's create two secondary indexes:

**Index A — explicitly include the primary key:**

```sql
CREATE INDEX idx_name_id ON test_table (name, id);
```

**Index B — leave the primary key out:**

```sql
CREATE INDEX idx_name ON test_table (name);
```

My expectation is that InnoDB will effectively store the same key columns for both indexes: `(name, id)`.

In other words, the primary key that we explicitly declared in the first index should already be present in the second one, implicitly.

If that is correct, the two indexes should have the same effective key structure and, with the same data and index settings, their storage footprints should be very close — potentially identical.

I'll verify this by inspecting InnoDB's index metadata and comparing the allocated and leaf pages after loading the same dataset.

**[EXPERIMENT RESULTS TO BE ADDED]**

### Why should we care?

Because this has a practical consequence for schema design: the primary key influences more than just the clustered index.

Every secondary index needs enough information to identify the corresponding row. That means the size of the primary key can affect the storage footprint of all those secondary indexes too.

For example, a `BIGINT` primary key takes less space than a 16-byte UUID. On a table with several secondary indexes and millions of rows, that difference can add up.

This is one of those small implementation details that makes you look at database design a little differently once you understand what's happening under the hood.

I love finding things like this: noticing a detail, getting curious, setting up a little experiment, and learning something concrete from it. And sharing the discovery is half the fun.

More experiments soon!