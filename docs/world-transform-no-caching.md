---
title: "World Transform Caching Decision"
slug: "contributor/sdk/decisions/world-transform-no-caching"
---

# World Transform: No Caching

This document explains the decision to **not implement caching** for the `getWorldPosition` and `getWorldRotation` helper functions in `@dcl/ecs`.

## Context

The `getWorldPosition` and `getWorldRotation` functions compute an entity's world-space position and rotation by traversing the parent hierarchy. Each call walks up the Transform chain, accumulating transformations.

## Current Implementation

The implementation uses a single internal function `getWorldTransformInternal` that computes position, rotation, and scale in **one hierarchy traversal**. This is O(depth) where depth is the number of ancestors.

Key characteristics:
- Single-pass computation for all three transform components
- Circular dependency detection via a visited set
- Returns identity values for entities without Transform

## Why No Caching

### 1. Cache Invalidation Complexity

Transforms change frequently (animations, physics, user input). Implementing caching would require either:
- Clearing the cache every frame (simple, but loses intra-frame benefits)
- Tracking dirty transforms (complex, requires hooks into the component system)

### 2. CRDT Synchronization Risk

The SDK uses CRDT for network state synchronization. Remote transform updates can arrive at any point during frame execution, potentially making cached values stale mid-frame without any local indication.

### 3. System Ordering Issues

If system A modifies a parent's transform and system B later reads a child's cached world position, the cached value would be incorrect. These bugs are subtle and difficult to debug.

### 4. Memory Overhead

Storing cached world transforms for entities adds memory pressure with uncertain performance benefit, especially for scenes with many entities but shallow hierarchies.

### 5. Typical Usage Patterns

In ECS patterns, `getWorldPosition`/`getWorldRotation` are typically called once per entity per system per frame. The traversal cost is acceptable for the shallow hierarchies common in Decentraland scenes.

## When Caching Would Be Reconsidered

Caching might be worth revisiting if:
- Profiling demonstrates world transform computation as an actual bottleneck
- Scenes commonly use very deep hierarchies (10+ levels)
- Multiple systems need the same entity's world transform per frame

If caching is implemented in the future, the recommended approach would be a per-frame cache explicitly invalidated at frame boundaries to avoid mid-frame staleness.

## Conclusion

The current implementation prioritizes **simplicity and correctness** over speculative optimization. The O(depth) traversal cost is acceptable for typical use cases, and avoiding caching eliminates an entire class of potential bugs related to stale data.
