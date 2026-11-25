import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path('/workspace/TourGuideAI')
workspace = root / 'artifacts/realism-01/connector-surface-review'
certificate = Path('/usr/local/share/ca-certificates/environment-proxy-ca.crt')
database = workspace / 'nssdb'
assert certificate.is_file() and not database.exists()
database.mkdir()
(root / 'artifacts/surface-browser-tmp').mkdir(exist_ok=True)
commands = [
    ['certutil', '-N', '--empty-password', '-d', 'sql:' + str(database)],
    ['certutil', '-A', '-d', 'sql:' + str(database), '-n', 'Managed environment proxy', '-t', 'C,,', '-i', str(certificate)],
]
for command in commands:
    subprocess.run(command, check=True, capture_output=True)
listing = subprocess.run(['certutil', '-L', '-d', 'sql:' + str(database)], check=True, capture_output=True, text=True).stdout
report = {'date': datetime.now(timezone.utc).isoformat(), 'method': 'Task-local NSS trust using the existing managed proxy CA',
    'certificate': str(certificate), 'certificateSha256': hashlib.sha256(certificate.read_bytes()).hexdigest(),
    'commands': commands, 'listing': listing, 'sharedTrustChanged': False, 'homeChanged': False,
    'tlsVerificationDisabled': False, 'producerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(workspace / 'browser-trust.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'taskLocalTrustReady': True, 'sharedTrustChanged': False}))
