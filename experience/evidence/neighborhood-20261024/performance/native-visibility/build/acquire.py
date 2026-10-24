import hashlib
import json
import lzma
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
DOWNLOADS = ROOT / "downloads"
WHEEL = DOWNLOADS / "python_debian-1.0.1-py3-none-any.whl"
assert hashlib.sha256(WHEEL.read_bytes()).hexdigest() == "8f137c230c1d9279c2ac892b35915068b2aca090c9fd3da5671ff87af32af12c"
sys.path.insert(0, str(WHEEL))
from debian.deb822 import Packages, Release, PkgRelation
from debian.debian_support import Version

os.environ["TMPDIR"] = str(ROOT / "tmp")
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
REPOSITORIES = {
    "trixie": "https://deb.debian.org/debian",
    "trixie-updates": "https://deb.debian.org/debian",
    "trixie-security": "https://deb.debian.org/debian-security",
}
ROOT_PACKAGES = [
    "meson", "ninja-build", "x11proto-dev", "xtrans-dev", "libxau-dev",
    "libxdmcp-dev", "libxfont-dev", "libxkbfile-dev", "libpixman-1-dev",
    "mesa-common-dev", "libgl-dev", "libx11-dev", "libxext-dev",
    "libxshmfence-dev", "libtirpc-dev",
]


def verified_download(url, target, size, sha256):
    if not target.exists():
        subprocess.run(["curl", "--silent", "--show-error", "--fail", "--location",
                        "--max-time", "120", "--max-filesize", str(size), url,
                        "--output", str(target)], check=True)
    assert target.stat().st_size == size, target
    assert hashlib.sha256(target.read_bytes()).hexdigest() == sha256, target


def acquire_indexes():
    records = []
    for suite, origin in REPOSITORIES.items():
        with (DOWNLOADS / (suite + "-Release")).open() as source:
            release = Release(source)
        item = next(item for item in release["SHA256"] if item["name"] == "main/binary-amd64/Packages.xz")
        target = DOWNLOADS / (suite + "-Packages.xz")
        url = origin + "/dists/" + suite + "/" + item["name"]
        verified_download(url, target, int(item["size"]), item["sha256"])
        records.append({"suite": suite, "url": url, "bytes": int(item["size"]), "sha256": item["sha256"],
                        "releaseDate": release["Date"], "signedReleaseSha256": hashlib.sha256((DOWNLOADS / (suite + "-InRelease")).read_bytes()).hexdigest()})
    (ROOT / "indexes.json").write_text(json.dumps(records, indent=2) + "\n")
    print(json.dumps(records, indent=2))


def plan_packages():
    catalog = {}
    for suite, origin in REPOSITORIES.items():
        with lzma.open(DOWNLOADS / (suite + "-Packages.xz"), "rt") as source:
            for package in Packages.iter_paragraphs(source, use_apt_pkg=False):
                name = package["Package"]
                if name not in catalog or Version(package["Version"]) > Version(catalog[name]["Version"]):
                    catalog[name] = dict(package, origin=origin, suite=suite)
    installed_output = subprocess.check_output(["dpkg-query", "-W", "-f=${binary:Package}\t${Version}\t${db:Status-Abbrev}\n"], text=True)
    installed = {name.split(":")[0]: version for name, version, status in (line.split("\t") for line in installed_output.splitlines()) if status.startswith("ii")}
    providers = {}
    for package in catalog.values():
        if package.get("Provides"):
            for group in PkgRelation.parse_relations(package["Provides"]):
                for relation in group:
                    providers.setdefault(relation["name"], []).append((package["Package"], relation.get("version")))
    selected = {}
    host = {}

    def satisfies(version, relation):
        if relation is None:
            return True
        op, wanted = relation
        actual, wanted = Version(version), Version(wanted)
        return {"=": actual == wanted, ">=": actual >= wanted, "<=": actual <= wanted, ">>": actual > wanted, "<<": actual < wanted}[op]

    def select(name):
        if name in selected:
            return
        package = catalog[name]
        selected[name] = package
        for field in ["Pre-Depends", "Depends"]:
            if not package.get(field):
                continue
            for alternatives in PkgRelation.parse_relations(package.get(field, "")):
                if not alternatives:
                    continue
                candidates = []
                for relation in alternatives:
                    direct = catalog.get(relation["name"])
                    if direct and satisfies(direct["Version"], relation.get("version")):
                        candidates.append(relation)
                    else:
                        for provider, version in providers.get(relation["name"], []):
                            if relation.get("version") is None or version and satisfies(version[1], relation["version"]):
                                candidates.append(dict(relation, name=provider))
                assert candidates, (name, alternatives)
                relation = candidates[0]
                dependency = relation["name"]
                # 开发包的链接目标一并解包；现有系统依赖记录版本，保持系统目录只读。
                keep_local = name.endswith("-dev") and dependency.startswith("lib") and dependency not in ["libc6-dev", "libc-dev-bin"]
                if dependency in installed and satisfies(installed[dependency], relation.get("version")) and not keep_local:
                    host[dependency] = installed[dependency]
                else:
                    select(dependency)

    for name in ROOT_PACKAGES:
        select(name)
    packages = [{"package": p["Package"], "version": p["Version"], "architecture": p["Architecture"],
                 "url": p["origin"] + "/" + p["Filename"], "file": p["Filename"].split("/")[-1],
                 "bytes": int(p["Size"]), "sha256": p["SHA256"], "suite": p["suite"]}
                for p in selected.values()]
    result = {"roots": ROOT_PACKAGES, "hostDependencies": {name: version for name, version in host.items() if name not in selected}, "packages": packages,
              "downloadBytes": sum(p["bytes"] for p in packages)}
    (ROOT / "dependencies.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


def fetch_packages():
    plan = json.loads((ROOT / "dependencies.json").read_text())
    for package in plan["packages"]:
        target = DOWNLOADS / package["file"]
        verified_download(package["url"], target, package["bytes"], package["sha256"])
        subprocess.run(["dpkg-deb", "--extract", str(target), str(ROOT / "deps")], check=True)
        print(package["package"], package["version"], flush=True)


{"indexes": acquire_indexes, "plan": plan_packages, "fetch": fetch_packages}[sys.argv[1]]()
