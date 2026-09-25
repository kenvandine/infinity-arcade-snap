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
`source-tag:` (not a top-level `version:`) on the `infinity-arcade-backend`
part in `snap/snapcraft.yaml`.

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
  the `infinity-arcade-backend` part; update it in place if different. The
  part's `override-pull` step derives the snap's displayed version from
  `craftctl get version`/`git describe` at build time, so no separate
  `version:` field needs updating.

## Embedded Lemonade Server

The snap is fully self-contained: it bundles the "embeddable" Lemonade
Server build (`lemond`/`lemonade` binaries) from `lemonade-sdk/lemonade`
in the `lemonade-server` part in `snap/snapcraft.yaml`, instead of relying
on a separate lemonade-server snap/package on the host. `scripts/lemonade-server`
is a thin wrapper that infinity-arcade's `LemonadeClient` shells out to
(`--version`, `status`, `serve`); it drives the bundled `lemond` daemon on
`localhost:8000`, which is the URL infinity-arcade's backend hardcodes.

- Query `https://api.github.com/repos/lemonade-sdk/lemonade/releases/latest`
  and use its `tag_name` (`v`-prefixed, e.g. `v2026.39.1`) as the new
  version. The asset we consume is
  `lemonade-embeddable-<version>-ubuntu-x64.tar.gz` (no `v` prefix in the
  filename/tag-path version, since `platforms:` is amd64-only).
- Update both occurrences of the version number in the `lemonade-server`
  part's `source:` URL (the release tag path segment and the asset
  filename) to match.
- No separate `version:`/`source-tag:` field is involved — the pin lives
  entirely in that URL.

## Unpinned Python runtime dependencies

The `infinity-arcade-backend` part's `override-build` installs
`fastapi uvicorn pygame httpx jinja2 python-multipart openai` with no
version pins (upstream's own `setup.py` only sets floor pins, e.g.
`fastapi>=0.104.0`), so a rebuild can pick up a newer major version of any
of these at any time.

- That same `override-build` step carries a `sed` patch adapting
  `src/infinity_arcade/main.py`'s one `TemplateResponse(...)` call site to
  whichever calling convention the installed Starlette (pulled in
  transitively by `fastapi`) expects — a legacy
  `TemplateResponse(name, context)` call silently breaks (dict used as a
  cache key) against Starlette releases that switched to
  `TemplateResponse(request, name, context)`. The step `grep`s for the
  patched line afterwards and fails the build if it's missing, so a future
  upstream reformat of that line is caught at build time instead of
  shipping a broken snap.
- If a future dependency bump breaks the app again in a similar way (an
  unpinned library changing a call signature the pinned app source relies
  on), prefer patching the call site the same way over pinning the
  dependency backward indefinitely — that keeps picking up upstream
  security fixes instead of freezing on an old major version.
