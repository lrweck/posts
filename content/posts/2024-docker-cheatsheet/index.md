---
title: "Docker Cheatsheet"
date: 2024-05-10
description: "The docker commands I actually use"
tags: ["docker", "dev", "cheatsheet"]
categories: ["dev"]
draft: false
---

The commands I reach for most days, nothing more:

```bash
# build with a name
docker build -t myapp .

# run and remove after exit, with a volume
docker run --rm -p 8080:80 -v "$PWD":/app myapp

# exec into a running container
docker exec -it $(docker ps -q) bash

# clean everything
docker system prune -af
```

Save yourself the pain: put `DOCKER_BUILDKIT=1` in your shell profile.