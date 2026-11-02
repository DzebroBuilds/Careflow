import { productionChecks } from '../src/lib/production-config.mjs';
const checks=productionChecks(process.env);
for(const check of checks)console.log(`${check.passed?'PASS':'FAIL'} ${check.id}: ${check.detail}`);
console.log('\nThis validates software configuration only. Hosting agreements, security review, restore testing, operational policies and owner acceptance require separate verification.');
if(checks.some(check=>!check.passed))process.exitCode=1;
