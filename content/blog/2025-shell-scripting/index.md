---
title: "Shell Scripting That Doesn't Suck"
date: 2025-11-07
description: "set -euo pipefail and other survival habits"
tags: ["shell", "dev"]
categories: ["dev"]
draft: false
---

The difference between a script that survives and one that eats data is usually three flags:

```bash
#!/usr/bin/env bash
set -euo pipefail

name="${1:-default}"
echo "Running with $name"
```

- `-e` stops on error
- `-u` catches unset variables
- `-o pipefail` stops pipelines mid-stream

Quote every variable, use `[[ ]]` instead of `[ ]`, and let `ShellCheck` be your reviewer. That's the whole trick.