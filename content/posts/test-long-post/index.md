---
title: "Test Long Post"
date: 2026-09-11
description: "A long-form test with headings, lists, quotes, tables and math"
tags: ["test", "long", "markdown"]
categories: ["testing"]
draft: false
---

{{< katex >}}

This is a long-form test post to check typography, headings, table of contents, reading time and pagination across many sections.

## What is a long post?

A long post gives the browser a chance to show scrollable content, sticky table of contents and the author box at the bottom.

### Paragraphs and emphasis

Lorem ipsum dolor sit amet, consectetur adipiscing elit. **Bold text** works well, as does *italic text* and `inline code`. You can also have ~~strikethrough~~ and `[links](https://gohugo.io)`.

> Blockquotes are rendered as callouts. This is a quoted paragraph that spans multiple lines of text to force a nice blockquote visual with proper spacing and indentation on both light and dark themes.

### Lists

1. First item
2. Second item
3. Third item with a long explanation that wraps across multiple lines so we can see how list padding behaves
   - Nested item
   - Another nested item
4. Fourth item

Unordered list:

- Item one
- Item two
- Item three

### Code block

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")
```

## Second major heading

Some content with `inline code` and [external links](https://example.com).

| Column A | Column B | Column C |
|----------|----------|----------|
| 1        | 2        | 3        |
| 4        | 5        | 6        |
| 7        | 8        | 9        |

### Math block

$$E = mc^2$$

## Third major heading

This section is mostly filler text so the page has real length. The idea is to make a scrollable article that demonstrates all the components in a realistic way.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Another paragraph follows, because real blog posts have many paragraphs and we want the reading time to show something meaningful like "2 min" instead of "1 min".

## Conclusion

End of the test article. The footer should show author, tags and categories, plus previous/next pagination.