# AGENTS.md

This repository contains the snap packaging (and colocated YARF UI tests) for
the **infinity-arcade** snap, published by kenvandine.

## Automated maintenance

This repository is maintained in part by the `automated-ken` fleet-maintenance
system (https://github.com/kenvandine/automated-ken). Automated agents may:

- Open pull requests bumping the packaged application/runtime version
- Queue YARF UI test runs on a registered remote runner (real hardware polling the
  automated-ken dashboard for jobs) against candidate/edge builds before promoting a
  release
- Review and comment on PRs, including AI-assisted screenshot review of UI test
  results

## Tests

YARF UI test suites belong under `tests/suite/` in this repository. They are
executed by a registered remote runner (physical/real hardware enrolled with the
automated-ken dashboard), which polls the dashboard for queued jobs, downloads/
installs the target snap build, runs the YARF suite locally, and uploads
screenshots/results directly back to the dashboard. No GitHub Actions workflow is
involved in running tests.

## Conventions

- Do not remove the `tests/suite/` directory; it is required for automated release
  validation. There is no test-running GitHub Actions workflow in this repo by
  design — tests run on a registered remote runner.
- Redundant upstream-polling / sync-release workflows that duplicate automated-ken's
  own version-bump automation should be removed to avoid conflicting/duplicate PRs.

## Upstream release detection

Upstream is `lemonade-sdk/infinity-arcade` on GitHub, tracked via a
`source-tag:` (not a top-level `version:`) on the `electron-app` part in
`snap/snapcraft.yaml`.

- Query `https://api.github.com/repos/lemonade-sdk/infinity-arcade/releases/latest`
  and use its `tag_name` directly (already `v`-prefixed, e.g. `v0.3.0`)
  as the new `source-tag`.
- **Do not** sort raw git tags by semver
  (e.g. `git ls-remote --tags --sort=-v:refname`) to find "the latest" —
  this upstream repo has a known-bad tag `v2.0.1` that sorts numerically
  highest but is not a real/intended release. GitHub's `/releases/latest`
  endpoint reflects the maintainer-marked latest release (currently
  `v0.3.0`), not raw tag/semver order, and correctly avoids this trap.
- Compare the fetched tag against the current `source-tag:` value under
  the `electron-app` part; update it in place if different. The part's
  `override-pull` step derives the snap's displayed version from
  `craftctl get version`/`git describe` at build time, so no separate
  `version:` field needs updating.
