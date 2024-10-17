---
category: "notes/distributed-systems"
title: "#5 Replication"
date: "2024-8-10"
description: "Fifth chapter of DDIA"
tags: []
---
You replicate data on multiple machines for:
1) Keeping data geographically closer to your users (reduce latency)
2) Allow system to continue working even with partitions (increase availability)
3) Scale out number of machines that can serve read queries (increase read throughput)

How do we replicate changes between nodes?

1) Single-leader
2) Multi-leader
3) Leaderless 