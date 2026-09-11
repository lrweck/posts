---
title: "Test Code Post"
date: 2026-09-10
description: "A post focused on syntax highlighting with several languages"
tags: ["test", "code"]
categories: ["testing"]
draft: false
---

This post checks the code copy button and syntax highlighting across languages.

## Go

```go
package main

import "fmt"

func main() {
    m := map[string]int{"a": 1, "b": 2}
    for k, v := range m {
        fmt.Printf("%s=%d\n", k, v)
    }
}
```

## Bash

```bash
#!/bin/bash
for f in *.md; do
    echo "Processing $f"
    wc -l "$f"
done
```

## SQL

```sql
SELECT user_id, count(*) AS total
FROM events
WHERE created_at > NOW() - interval '1 day'
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;
```

## Inline

Wrap code like `docker compose up` and `go test ./...` to see inline styles.

## JSON

```json
{
  "site": "posts",
  "build": { "hugo": "0.165.0", "docker": true },
  "theme": "blowfish"
}
```

That's it for code highlighting tests.