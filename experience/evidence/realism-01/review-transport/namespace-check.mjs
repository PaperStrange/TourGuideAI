import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const certificateListing = execFileSync('/usr/bin/certutil', ['-L', '-d', 'sql:/home/agent/.pki/nssdb'], { encoding: 'utf8' });
const record = { at: new Date().toISOString(), home: process.env.HOME,
  privateTrustDatabaseVisible: certificateListing.includes('Managed environment proxy CA'),
  certificateListing, tlsVerificationDisabled: false, sharedTrustChanged: false };
writeFileSync('/workspace/TourGuideAI/artifacts/realism-01/review-transport/qa/namespace-check.json', JSON.stringify(record, null, 2) + '\n');
if (!record.privateTrustDatabaseVisible) throw new Error('Task-local trust database was not visible inside the private namespace');
console.log(JSON.stringify(record));
