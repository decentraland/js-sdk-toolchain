# Performance benchmarks

The benchmark suite measures isolated ECS operations. It complements the QuickJS golden snapshots in `test/snapshots`, which remain the end-to-end performance regression signal for bundled scenes.

## Run the ECS benchmarks

Build dependencies once, then run:

```bash
make benchmark-ecs
```

The default run uses 10,000 entities, three warmups, and ten measured samples. The `make` targets run Node with `--expose-gc` so the harness can force a garbage collection before every timed iteration; this keeps a previous benchmark's setup garbage from being collected inside the measured section, which is the largest source of per-sample variance. When the collector is not exposed the harness still runs and prints a note. Override the defaults with `BENCHMARK_ARGS`:

```bash
make benchmark-ecs BENCHMARK_ARGS="--entities 1000 --samples 20 --warmups 3"
```

For machine-readable output:

```bash
make benchmark-ecs-json > ecs-benchmark.json
```

Results include every measured sample, median duration, p95 duration, the relative margin of error at 95% confidence, and median operations per second. Statistics are computed after dropping the slowest fifth of samples: timing noise on shared runners is one-sided (scheduling, garbage collection and co-tenant bursts only make a sample slower), so trimming the slow tail removes contamination without discarding clean measurements and without hiding a real regression, which shifts every sample. The margin of error is the noise floor for a benchmark. A comparison report turns it into a 95% confidence interval on the change — the two commits' margins combined in quadrature — and flags any change that falls inside its own interval with `≈`, meaning it cannot be distinguished from runner jitter. Setup is excluded from the timed section, and every iteration uses a fresh engine. Fast workloads are calibrated into batches targeting roughly 100 milliseconds of measured work so timer resolution and runner noise do not dominate their samples.

The `.github/workflows/ecs-benchmark.yml` workflow runs the suite on pull requests and on pushes to `main` or `experimental`, but only when `packages/@dcl/ecs/**`, `benchmarks/**`, or the workflow itself change — most pull requests do not touch the engine, and the job rebuilds two checkouts, so skipping it saves a lot of CI time (those pull requests get no benchmark comment, as intended). It checks out the base and head commits, builds both, and runs the same benchmark definitions against each checkout on one runner. The base is usually the tip of `main` and identical across many pull requests, so its generated sources are cached by commit SHA and its build is skipped on a cache hit; the head is always built fresh. Rather than measuring one commit fully and then the other, CI **interleaves** them: it runs base and head alternately over several short rounds and pools the rounds. Slow drift on the runner (thermal throttling, a noisy neighbour) therefore falls on both commits instead of only whichever ran second, which would otherwise read as a spurious regression or improvement, and pooling more samples tightens the confidence interval. The base checkout resolves the base branch by name, so the comparison always targets the current tip of the branch being merged into, even on a manual re-run after it has advanced. The JSON and Markdown comparison reports are uploaded as workflow artifacts and added to the job summary. For branches in this repository, CI also updates a single pull request comment with both commit hashes and the comparison table. GitHub does not grant write permission to pull-request workflows from forks, so forked pull requests receive the artifact and job summary without a comment.

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

Trust the `≈` marker and the `±95%` column over a single median: a change flagged `≈` is within the combined margin of error and should not be read as real. To pool several runs the way CI does, write each run to its own file and merge them before formatting:

```bash
node_modules/.bin/tsx benchmarks/ecs/merge-reports.ts \
  /tmp/ecs-feature-1.json /tmp/ecs-feature-2.json /tmp/ecs-feature-3.json > /tmp/ecs-feature.json
```

The suite currently reports measurements without enforcing a pass/fail threshold; a CI regression threshold should only be introduced after enough runs have established normal variance.

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
