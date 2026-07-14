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

Results include every measured sample, median duration, p95 duration, and median operations per second. Setup is excluded from the timed section, and every sample uses a fresh engine.

CI runs the default benchmark suite for every pull request commit and every push to `main` or `experimental`. The JSON and Markdown reports are uploaded as workflow artifacts and added to the job summary. For branches in this repository, CI also updates a single pull request comment with the latest commit and results table. GitHub does not grant write permission to pull-request workflows from forks, so forked pull requests receive the artifact and job summary without a comment.

## Compare a change

Wall-clock results vary between machines. Compare the base and feature branches on the same idle machine with the same Node version and arguments:

```bash
git switch main
make benchmark-ecs-json > /tmp/ecs-main.json

git switch my-feature-branch
make benchmark-ecs-json > /tmp/ecs-feature.json
```

Run each branch more than once when a difference is small. The suite currently reports measurements without enforcing a pass/fail threshold; a CI regression threshold should only be introduced after enough runs have established normal variance.

## Workloads

- Entity creation with one map component
- Entity removal with one map component
- One-, two-, and three-component queries with dense and sparse match rates
- Mutable component updates
- Wide entity hierarchy removal
- CRDT serialization, unchanged-mutable suppression, and multi-transport routing

Use deterministic input data and keep setup outside the timed section when adding a workload. Prefer one isolated ECS behavior per benchmark so regressions have an identifiable source.
