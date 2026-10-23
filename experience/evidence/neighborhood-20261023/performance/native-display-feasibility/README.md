# Native display feasibility: local X server

Read-only inspection on 2026-10-23 during the candidate 9 browser window. The
proposed setup was an artifact-local, pinned distro Xvfb package using authenticated
TCP, with Unix sockets and lock files disabled and all writable paths inside
`/workspace/TourGuideAI/artifacts/`. Project instructions prohibit any `/tmp`
access. No server/browser was launched; no package was downloaded or installed.
This note preserves the inspection and does not supply a native visibility pass.

## Installed identities

| Item | Observed identity |
| --- | --- |
| `xserver-xorg-core` | `2:21.1.16-1.3+deb13u3`, amd64, source package `xorg-server` |
| `xserver-common` | `2:21.1.16-1.3+deb13u3` |
| `/usr/lib/xorg/Xorg` SHA-256 | `3bf2c0128afd5c0018e5f3cd5b52c9982f1369ea51de6da4af853e99310a839d` |
| `x11-xkb-utils` | `7.7+9`; `/usr/bin/xkbcomp` is installed |
| `xkb-data` | `2.42-1` |
| `xauth` | `1:1.1.2-1.1` |
| `/var/lib/xkb/README.compiled` SHA-256 | `134ec3234772efacc6d51e158f27f13931a7c687a847be1ac7281076ff41a611` |
| Process identity / compiled-keymap directory | UID `1000`; `/var/lib/xkb` is owned by `nobody:nogroup`, mode `0755` |

Identities came from `dpkg-query`, filesystem metadata and SHA-256 reads. The
installed package lists name X server manuals, but those manual files are absent.
`README.compiled` remains available and says the X server stores current and
scratch compiled keymaps in `/var/lib/xkb`, commonly `X<num>-default.xkm`.

## XKB output-path evidence

A bounded `strings`, `readelf` and `objdump` inspection of the identified binary
found the following output-directory selector. Addresses refer only to this
binary:

- At `0x1619c0`, the function loads the literal `/var/lib/xkb/` from `0x1f788a`.
- At `0x1619d8`, it calls `access` with mode `3` (`W_OK | X_OK`).
- On failure, instructions at `0x1619e6` and `0x1619ec` write the literal `/tmp/`
  into the output buffer.
- The selector has no environment lookup. The subsequent keymap path handling
  receives this absolute directory. `-xkbdir` controls the input keymap base;
  it does not relocate this compiled-output directory.

The current UID cannot write the configured `/var/lib/xkb` directory. A
repository-local `TMPDIR`, XKB input directory or Chromium cache directory does
not change this selector. TCP authentication and disabling Unix sockets address
different paths and leave the compiled-keymap requirement unresolved. The
inspection stopped at this concrete prerequisite; no write was attempted in
either directory.

## Unavailable evidence and disposition

Xvfb is not installed. `/var/lib/apt/lists` is empty and the apt archive contains
no cached package. `apt-cache` supplied no Xvfb metadata and also reported an
unreadable configuration fragment. Therefore no exact Xvfb package identity,
dependency closure or distinct Xvfb build behavior was verified. The binary
finding above is for the installed Xorg build; it is not an execution result for
an unexamined Xvfb package. A supported workspace-only compiled-keymap output
path remains unestablished.

The earlier [Mesa software diagnostic](../candidate-6-mesa/README.md) demonstrated
actual llvmpipe scene rendering under its recorded software configuration and
retained its timing failures. Its [headed Ozone capability result](../candidate-6-mesa/headed-ozone-visibility.json.gz)
recorded two actual tabs, activation/minimize/restore requests, and zero native
`visibilitychange` events; both documents stayed visible. Those observations
retain their original scope. Native hidden-state behavior and physical-GPU
performance remain unverified. This feasibility inspection adds no visibility
simulation, runtime modification or acceptance-threshold change.
