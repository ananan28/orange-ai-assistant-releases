import hashlib
import json
from pathlib import Path

base=Path('baseline47-verified')
candidate=Path('restored')
changed={'package.json','package-lock.json','scripts/smoke-login-ui.cjs','scripts/verify-tn-stable-core.js'}
added={'scripts/verify-1.0.50-release.js'}
baseline_files={str(p.relative_to(base)) for p in base.rglob('*') if p.is_file()}
candidate_files={str(p.relative_to(candidate)) for p in candidate.rglob('*') if p.is_file()}
assert candidate_files == baseline_files | added
for name in baseline_files-changed:
    assert (base/name).read_bytes()==(candidate/name).read_bytes(), 'Unexpected functional change: '+name
for name in changed-{'package.json','package-lock.json'}:
    assert (base/name).read_text().replace('1.0.47','1.0.50')==(candidate/name).read_text()
assert (base/'scripts/verify-1.0.47-release.js').read_text().replace('1.0.47','1.0.50')==(candidate/'scripts/verify-1.0.50-release.js').read_text()
a=json.loads((base/'package.json').read_text());b=json.loads((candidate/'package.json').read_text())
assert a['version']=='1.0.47' and b['version']=='1.0.50'
a['version']=b['version'];a['scripts']['check']=a['scripts']['check'].replace('1.0.47','1.0.50')
assert a==b, 'Package behavior changed beyond version checks'
a=json.loads((base/'package-lock.json').read_text());b=json.loads((candidate/'package-lock.json').read_text())
a['version']='1.0.50';a['packages']['']['version']='1.0.50'
assert a==b, 'Locked dependencies changed'
for marker in ['GMAIL_RESIDENT_LIMIT','class PageLoadQueue','trimGmailPages','page-sleep-state']:
    assert marker not in (candidate/'src/workbench.js').read_text()
print(json.dumps({'baseline':'1.0.47','release':'1.0.50','identical_files':len(baseline_files-changed),
    'unchanged_core_sha256':{name:hashlib.sha256((candidate/name).read_bytes()).hexdigest() for name in ['main.js','preload.js','site-preload.js','src/workbench.js','extension-source/content.js']}}))
