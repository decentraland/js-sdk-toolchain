# Electron Builder Tag Matching

## How electron-builder finds Git tags

When electron-builder runs with `--config.extraMetadata.version=0.21.2` and `--publish always`:

1. **Build phase**: Uses `0.21.2` for app metadata and file naming
2. **Publish phase**: Searches Git tags for one that **ends with** `0.21.2`
3. **Tag match**: Finds `creator-hub-v0.21.2` and uses it for the GitHub release

```bash
# What we create:
git tag creator-hub-v0.21.2

# What electron-builder receives:
--config.extraMetadata.version=0.21.2

# electron-builder logic:
# "Which tag ends with 0.21.2?" → creator-hub-v0.21.2 ✓
```

## Why multiple releases don't collide

Our repository has different tag formats that **cannot conflict**:

```
Repository tags:
├── creator-hub-v0.21.2  ← Our Creator Hub release
└── 7.9.3                ← Other product release
```

**Scenario**: Both products release version `1.0.0` on the same day:

```
Result:
├── creator-hub-v1.0.0   ← electron-builder matches this for Creator Hub
└── 1.0.0                ← Different release, ignored by Creator Hub workflow
```

- electron-builder building Creator Hub with `--version=1.0.0` will find `creator-hub-v1.0.0`
- electron-builder building other product with `--version=1.0.0` will find `1.0.0`
- **No collision** because the tag names are different

## Key Points

- electron-builder uses **flexible tag matching** - it looks for tags containing the version number
- Different tag **prefixes** (`creator-hub-v` vs plain semver) prevent conflicts
- Each workflow only sees its own release tags due to different naming patterns
