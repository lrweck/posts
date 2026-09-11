# lrweck

Personal blog built with [Hugo](https://gohugo.io/) + the [Blowfish](https://blowfish.page/) theme, deployed to GitHub Pages.

## Local development

Hugo runs in a Docker container — no local install needed.

```bash
docker compose up
# Visit http://localhost:1313
```

## Writing a post

Posts live in `content/posts/`. Each post is a page bundle:

```text
content/posts/my-post/
└── index.md
```

Front matter example:

```yaml
---
title: "My Post"
date: 2026-09-11
description: "Short summary"
tags: ["tech"]
categories: ["general"]
---
```

To translate a post to another language, create a sibling bundle:

```text
content/posts/my-post/
├── index.md          # English
└── index.pt.md       # Portuguese (add languages.pt.toml config to enable)
```

## Deploying

Push to `main` — the GitHub Action builds and deploys to
https://lweck.github.io/lrweck/

First deploy: enable Pages in repo **Settings → Pages** and set source to **GitHub Actions**.

## Config

| File                        | Purpose                |
|-----------------------------|------------------------|
| `config/_default/hugo.toml`   | Site config (baseURL)  |
| `config/_default/params.toml` | Theme options          |
| `config/_default/languages.en.toml` | Language + author |
| `config/_default/menus.en.toml`   | Menus            |