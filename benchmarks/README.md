# Performance benchmarks

The benchmark suite measures isolated ECS operations. It complements the QuickJS golden snapshots in `test/snapshots`, which remain the end-to-end performance regression signal for bundled scenes.

## Run the ECS benchmarks

Build dependencies once, then run:

```bash
make benchmark-ecs
```

The default run uses 10,000 entities, two warmups, and ten measured samples. Override those values with `BENCHMARK_ARGS`:

```bash
make benchmark-ecs BENCHMARK_ARGS="--entities 1000 --samples 20 --warmups 3"
```

For machine-readable output:

```bash
make benchmark-ecs-json > ecs-benchmark.json
```

Results include every measured sample, median duration, p95 duration, and median operations per second. Setup is excluded from the timed section, and every iteration uses a fresh engine. Fast workloads are calibrated into batches targeting roughly 100 milliseconds of measured work so timer resolution and runner noise do not dominate their samples.

CI runs the default benchmark suite for every pull request commit and every push to `main` or `experimental`. It checks out the base and head commits, builds both, and runs the same benchmark definitions against each checkout on one runner. The JSON and Markdown comparison reports are uploaded as workflow artifacts and added to the job summary. For branches in this repository, CI also updates a single pull request comment with both commit hashes and the comparison table. GitHub does not grant write permission to pull-request workflows from forks, so forked pull requests receive the artifact and job summary without a comment.

## Compare a change

CI performs this comparison automatically. For local investigation, compare the base and feature branches on the same idle machine with the same Node version and arguments:

```bash
git switch main
make benchmark-ecs-json > /tmp/ecs-main.json

git switch my-feature-branch
make benchmark-ecs-json > /tmp/ecs-feature.json

node_modules/.bin/tsx benchmarks/ecs/format-markdown.ts \
  /tmp/ecs-feature.json /tmp/ecs-main.json
```

Run each branch more than once when a difference is small. The suite currently reports measurements without enforcing a pass/fail threshold; a CI regression threshold should only be introduced after enough runs have established normal variance.

## Workloads

- Entity creation with one map component
- Entity removal with one map component
- One-, two-, and three-component queries with dense and sparse match rates
- Mutable component updates and component churn
- Entity removal, identifier recycling, and wide/deep hierarchy operations
- CRDT serialization, unchanged-mutable suppression, and selective multi-transport routing
- Incoming CRDT updates, component deletes, and entity deletes
- A representative frame combining queries, mutations, systems, and CRDT flushing
- Small maps, nested maps and arrays, and generated protobuf component serialization
- Grow-only value-set appends

Use deterministic input data and keep setup outside the timed section when adding a workload. Prefer one isolated ECS behavior per benchmark so regressions have an identifiable source.
