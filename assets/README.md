# Capacitor asset source folder

Place your master logo here as `logo.png` (1024×1024 PNG, transparent background recommended).
Optionally also provide:

- `logo.png`            – primary app icon (required, 1024×1024)
- `logo-foreground.png` – Android adaptive-icon foreground (1024×1024, art centered in middle ~66%)
- `logo-background.png` – Android adaptive-icon background (1024×1024 solid color or gradient)
- `splash.png`          – splash screen (2732×2732, art centered)
- `splash-dark.png`     – optional dark variant

Then run:

```
npm run android:icons
```

This invokes `@capacitor/assets` which regenerates every Android `mipmap-*` icon
(legacy + adaptive + round + monochrome) and the splash screen drawables.

If only `logo.png` is provided, `@capacitor/assets` will auto-derive the
adaptive icon foreground and use a default background — so the bare minimum is
to drop **one** 1024×1024 `logo.png` here and run the command above.
