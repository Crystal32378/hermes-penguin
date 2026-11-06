# Bundled timezone data

This directory contains **data, not executable binaries**. `zoneinfo/*` are standard TZif files parsed by Python's standard-library `zoneinfo`; no file is executed or unpacked at runtime. `zoneinfo/tzdata.zi` is the corresponding textual IANA source. Python files and bytecode from the upstream package are excluded.

Source: [Python tzdata 2026.6](https://pypi.org/project/tzdata/2026.6/), IANA **2026f**, released 2026-10-28.

Official wheel: `tzdata-2026.6-py2.py3-none-any.whl`

SHA-256: `0a10eec6e13ef16b627fabed9a5f2ba61a62b1c67f327305f4e7e412a70b4aec`

`provenance.json` lists every copied file and its SHA-256. All 607 files were checked byte-for-byte against the official wheel, whose hash was checked against PyPI. `licenses/` retains the complete upstream notices.

Why bundle: Hermes v0.23.0 fixes `tzdata==2025.3` on Windows. Declaring a newer exact shared dependency makes its cross-platform resolver fail. Reading these package-local data files keeps current, reproducible rules without moving Hermes's pins or changing its `TZPATH`.

To update: obtain a new official wheel, independently check its published hash, replace only the data and notices, regenerate the provenance hashes, update the constants in `core.py`, run the entire test suite and Hermes catalog validator, and request a new reviewed plugin version. No updater is included.
