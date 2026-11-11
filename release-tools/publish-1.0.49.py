"""Publish only the artifacts produced by this approved release workflow."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

VERSION = '1.0.49'
TAG = 'v' + VERSION
REPO = os.environ['GITHUB_REPOSITORY']
SHA = os.environ['GITHUB_SHA']
out = Path('release-assets')
out.mkdir(exist_ok=True)

def gh(*args, check=True):
    return subprocess.run(['gh', *args], check=check, text=True, capture_output=True)

artifacts = Path('release-downloads')
dist_dirs = list(artifacts.glob('*/restored/dist'))
assert len(dist_dirs) == 2, 'Both native build artifacts are required'
expected = {'latest.yml', 'latest-mac.yml',
            f'Orange-AI-Assistant-Setup-{VERSION}.exe',
            f'Orange-AI-Assistant-{VERSION}-mac-arm64.dmg',
            f'Orange-AI-Assistant-{VERSION}-mac-arm64.zip'}
for dist in dist_dirs:
    for file in dist.iterdir():
        assert file.is_file()
        assert file.suffix in {'.exe', '.dmg', '.zip', '.yml', '.blockmap'}, file
        assert not (out/file.name).exists(), 'Duplicate asset: ' + file.name
        shutil.copyfile(file, out/file.name)
assert expected.issubset({p.name for p in out.iterdir()}), 'Missing installer or updater metadata'

for name in ['latest.yml', 'latest-mac.yml']:
    text = (out/name).read_text()
    assert re.search(r'^version: 1\.0\.49\s*$', text, re.M), name
    entries = list(re.finditer(r'^\s*- url: (.+)\n\s+sha512: (.+)\n\s+size: (\d+)', text, re.M))
    assert entries, 'Empty updater manifest: ' + name
    for entry in entries:
        asset = out/entry[1].strip()
        assert asset.parent == out and asset.is_file()
        assert asset.stat().st_size == int(entry[3]), asset
        actual = base64.b64encode(hashlib.sha512(asset.read_bytes()).digest()).decode()
        assert actual == entry[2].strip(), 'Updater SHA512 mismatch: ' + asset.name

sources = list(artifacts.glob('*/Orange-AI-Assistant-1.0.49-source.zip'))
assert len(sources) == 2
core = ['package.json', 'package-lock.json', 'main.js', 'preload.js', 'site-preload.js',
        'embedded-popup-manager.js', 'src/workbench.js', 'src/workbench.css',
        'extension-source/content.js', 'extension-source/ai_reply.js']
with zipfile.ZipFile(sources[0]) as a, zipfile.ZipFile(sources[1]) as b:
    for file in core:
        assert a.read(file) == b.read(file), 'Native build source mismatch: ' + file
    assert json.loads(a.read('package.json'))['version'] == VERSION
shutil.copyfile(sources[0], out/sources[0].name)

checksums = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir())}
(out/'SHA256SUMS.txt').write_text(''.join(f'{digest}  {name}\n' for name,digest in checksums.items()))
notes = Path('release-notes.txt')
notes.write_text('''橘子AI助手 1.0.49

- Mac Gmail 新窗口在原工作台内显示，保留独立账号会话。
- Gmail 按需恢复，目标常驻最近使用的 3 个页面；后台安全页面休眠释放资源。
- 正在编辑邮件或登录验证的页面跳过回收。休眠邮箱不实时收信，点击后重新加载。
- 重启恢复列表上限提高到 200，避免原先 50 个标签的截断。
- 包含 Windows x64 和 Mac Apple Silicon ARM64 安装包、自动更新文件及完整构建源码。

验证：Windows/macOS 原生 150 个模拟账号测试、Cookie/本地存储恢复、账号隔离、草稿保护、内嵌弹窗、翻译发送回归、签名界面更新与回退、打包后登录界面均通过。
测试使用模拟页面，实际 Gmail 性能取决于设备和网页负载。
退出旧版后覆盖安装，保留原应用数据目录。
''')
existing = gh('api', f'repos/{REPO}/releases/tags/{TAG}', check=False)
if existing.returncode == 0:
    release = json.loads(existing.stdout)
    assert release['draft'], 'Refusing to overwrite an already published release'
    assert release['target_commitish'] == SHA, 'Draft belongs to a different source revision'
else:
    assert '404' in existing.stderr, existing.stderr
    gh('release', 'create', TAG, '--repo', REPO, '--target', SHA, '--draft',
       '--title', '橘子AI助手 1.0.49', '--notes-file', str(notes))
gh('release', 'upload', TAG, '--repo', REPO, '--clobber', *[str(p) for p in sorted(out.iterdir())])

# Verify uploaded bytes while the release is still a draft.
verified = Path('release-verify')
gh('release', 'download', TAG, '--repo', REPO, '--dir', str(verified))
for p in out.iterdir():
    assert (verified/p.name).stat().st_size == p.stat().st_size
    assert hashlib.sha256((verified/p.name).read_bytes()).digest() == hashlib.sha256(p.read_bytes()).digest(), p.name
gh('release', 'edit', TAG, '--repo', REPO, '--draft=false', '--prerelease=false', '--latest')
release = json.loads(gh('api', f'repos/{REPO}/releases/tags/{TAG}').stdout)
latest = json.loads(gh('api', f'repos/{REPO}/releases/latest').stdout)
assert not release['draft'] and not release['prerelease'] and latest['tag_name'] == TAG
print(json.dumps({'published': release['html_url'], 'version': VERSION, 'source': SHA,
                  'asset_count': len(release['assets']), 'sha256': checksums}, ensure_ascii=False))
