# App Icons

Place application icon files here using these names:

- `app.ico` for Windows
- `app.png` for Linux/runtime fallback
- `app.icns` for macOS

Recommended source export sizes:

- PNG: 512x512 (and 256x256 for fallback)
- ICO: multi-size (16, 24, 32, 48, 64, 128, 256)
- ICNS: generated from a 1024x1024 source

The app window icon is resolved at runtime from this folder.
Electron Builder packaging also reads icons from this folder.
