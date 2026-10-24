# Public observer readiness diagnostic

The immutable attempt recorded **7 passes and 4 failures**. The native landing
language links and 390 px layout checks passed. Its app readiness predicate
expected `window.__HOME__` on a public URL without `qa=1`; production exposes
that read-only observer only in development or with the explicit flag.

The English predicate timed out. Root requested closure before another full
locale timeout; the owned Chromium process received SIGTERM and the driver's
cleanup finalized the report at `2026-10-24T06:01:53.819Z`. The original English
console 404 had no recorded location in this driver. These results do not
establish failure of public rendering or completion of the app sequence.

[interruption.json](interruption.json), the complete original report, executed
driver, screenshots and stdout retain exact provenance through
[binding.json](binding.json). The final run records ordinary public DOM
readiness first and a separate `qa=1` navigation for runtime observations.
