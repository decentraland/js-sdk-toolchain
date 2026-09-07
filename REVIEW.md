# Review guidelines

Rules every reviewer (human or agent) must apply to every PR against this repo. These are not
style suggestions — the **Reject** conditions are blocking.

## 1. Code comments

Comments are for non-obvious *why* only: a gotcha, a constraint, a workaround, an invariant
the code can't express. Not for narrating what the code does, why the change is correct, or
what the author was thinking.

Flag and request removal of:

- Comments on every (or almost every) changed hunk. That's the author talking to the
  reviewer, not to the next reader — the PR description is the place for that.
- Comments that restate the code ("increment the counter", "same guard as above").
- Justification comments ("this cannot fire today", "belt-and-braces", "unreachable from
  the CRDT path today"). If it can't fire, it doesn't need defending in a comment; if the
  reasoning matters, it belongs in the PR description or a test.
- Multi-line comment blocks where one short line would do.

**Reject** when comment noise is pervasive — i.e. removing the narration comments would
touch most hunks of the diff.

## 2. PR description

Written for humans, in few words. A reviewer should understand the PR from the description
in under a minute. It must answer, plainly:

- **What / why** — what is changing and why, in a short paragraph. No essay, no
  "Mechanism" deep-dives, no tables of internals. If the bug analysis is genuinely worth
  keeping, link to an issue or put it in a collapsed section — don't make it the description.
- **How to test** — concrete steps a reviewer can run.
- **Proof** — a test scene (or equivalent runnable repro) that demonstrates the bug before
  the change and the fix after it.

**Reject** when:

- The description reads as generated filler: long, exhaustive, structured like a report,
  and you still can't tell in a minute what to test.
- There is no "how to test" section a human can actually follow.

## 3. Proof of fix

A fix PR must ship something that proves it: a test scene exercising the broken behavior,
or a test that fails on `main` and passes on the branch. "The unit tests pass" is not
proof that the reported scenario is fixed.

**Reject** any bug-fix PR that has no test scene or failing-test repro attached.

## 4. Posting review findings

- Post one change request per violation, anchored to the file/line where it applies
  (description-level issues go on the PR conversation).
- Quote the rule number you're applying (e.g. "REVIEW.md §1: narration comment").
- Don't pad the review: if the PR passes all rules, say so in one line.
