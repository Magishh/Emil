# D&D Solo Campaign DM

An AI-guided solo Dungeons & Dragons campaign that runs as a local web app:
procedural encounters, a full character sheet, an interactive dice arena,
generated scenery, narration and a soundtrack.

## Run it on Arch Linux

**Requirements:** `nodejs` (20 or newer) and `npm`.

```sh
sudo pacman -S --needed nodejs npm git
git clone https://github.com/Magishh/Emil.git dnd-solo-dm
cd dnd-solo-dm
./dnd-solo-dm
```

That's it. The first run installs dependencies and builds the app (about a
minute); later runs start immediately. The server starts on
<http://127.0.0.1:3000> and your browser opens automatically.

Press `Ctrl+C` to stop.

### Add it to your applications menu

```sh
./dnd-solo-dm --install-desktop
```

"D&D Solo Campaign DM" then appears in your launcher and starts the app the
same way. Remove it again with `--uninstall-desktop`.

### Options

```
./dnd-solo-dm --port 8080     # use a different port
./dnd-solo-dm --host 0.0.0.0  # reachable from other machines on your network
./dnd-solo-dm --no-open       # do not launch a browser
./dnd-solo-dm --rebuild       # force a fresh build
./dnd-solo-dm --dev           # development server with hot reload
./dnd-solo-dm --help
```

By default the app binds to `127.0.0.1`, so it is reachable only from your own
machine. If port 3000 is busy it moves to the next free port and prints the URL.

## Enabling the AI Dungeon Master

The app runs without any API key, falling back to built-in procedural
storytelling, browser speech and synthesised music. To turn on the Gemini-powered
Dungeon Master, AI artwork and narration, add your key:

```sh
mkdir -p ~/.config/dnd-solo-dm
echo 'GEMINI_API_KEY=your-key-here' > ~/.config/dnd-solo-dm/.env
```

Get a key from <https://aistudio.google.com/apikey>. Restart the app; the
startup banner reports whether the AI is enabled.

A project-local `.env` also works if you prefer to keep it with the clone.

## Installing as a system package (Arch)

To install it properly, with a `/usr/bin` entry and a menu item:

```sh
cd packaging/arch
makepkg -si
```

(The PKGBUILD lives in its own directory because `makepkg` creates `src/` and
`pkg/` build directories, which would otherwise collide with the app's own
`src/`.)

This builds a self-contained package — a single bundled server plus the built
frontend, about 4 MB — that only needs `nodejs` at runtime. Remove it with
`sudo pacman -R dnd-solo-campaign-dm-git`.

Configuration still lives in `~/.config/dnd-solo-dm/.env`.

## Development

```sh
npm install
npm run dev     # Vite dev server with hot reload, on :3000
npm run lint    # TypeScript type check
npm run build   # production build into dist/
npm start       # serve the production build
```

`dist/` contains the built frontend plus `server.cjs`, a bundled server that
runs standalone — no `node_modules` needed.

## Deploying to the web

The repository also builds for static hosting (GitHub Pages) via
`.github/workflows/deploy-pages.yml`. Static hosting cannot run the Express
backend, so a deployed copy uses the offline fallbacks only. For the full AI
experience, run it locally or host it somewhere that runs Node.
