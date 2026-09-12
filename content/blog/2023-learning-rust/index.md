---
title: "Learning Rust, Part 1"
date: 2023-08-02
description: "First week with Rust — borrow checker memories"
tags: ["rust", "learning"]
categories: ["dev"]
series: ["rust-series"]
series_order: 1
draft: false
---

Week one with Rust. The borrow checker and I are not friends yet, but we are negotiating.

```rust
fn main() {
    let s = String::from("hello");
    let n = &s;
    let m = &s;
    println!("{n} {m}");
    println!("{}", s);
}
```

Key insight so far: immutable borrows can coexist, mutable borrows are exclusive. Once that sank in, half the compiler errors started making sense. More in part two.