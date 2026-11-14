import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const launcher = '/workspace/TourGuideAI/artifacts/realism-01/review-transport/qa/run-isolated-public.sh';
const certificateListing = execFileSync('/usr/bin/certutil', ['-L', '-d', 'sql:/home/agent/.pki/nssdb'], { encoding: 'utf8' });
const record = { at: new Date().toISOString(), home: process.env.HOME, uid: process.getuid(), gid: process.getgid(),
  uidMap: readFileSync('/proc/self/uid_map', 'utf8'), gidMap: readFileSync('/proc/self/gid_map', 'utf8'),
  launcherSha256: createHash('sha256').update(readFileSync(launcher)).digest('hex'),
  privateTrustDatabaseVisible: certificateListing.includes('Managed environment proxy CA'), certificateListing,
  tlsVerificationDisabled: false, sharedTrustChanged: false };
writeFileSync('/workspace/TourGuideAI/artifacts/realism-01/review-transport/qa/namespace-check-root.json', JSON.stringify(record, null, 2) + '\n');
if (!record.privateTrustDatabaseVisible || record.uid !== 0) throw new Error('Private native-display namespace was not configured as expected');
console.log(JSON.stringify(record));
