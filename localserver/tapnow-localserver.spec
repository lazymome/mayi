# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / 'localserver' / 'tapnow-server-full.py'


a = Analysis(
    [str(SERVER)],
    pathex=[str(ROOT), str(ROOT / 'localserver')],
    binaries=[],
    datas=[(str(ROOT / 'localserver' / 'workflows'), 'workflows')] if (ROOT / 'localserver' / 'workflows').exists() else [],
    hiddenimports=['PIL', 'PIL.Image', 'websocket', 'mcp_gateway'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='tapnow-localserver',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
