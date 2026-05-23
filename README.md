# JST Digital Clock & Japanese Holiday Calendar

A static web app that shows a live Japan Standard Time digital clock beside a monthly calendar that highlights Japanese national holidays, substitute holidays, citizens' holidays, and the 24 traditional Japanese solar terms (二十四節気).

## Highlights

- Android smartphone friendly layout with touch-sized controls and compact card spacing for narrow screens.

## Run the app

From this repository root, start a simple local web server:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open:

```text
http://localhost:4173
```

Keep the terminal running while you use the app. Press `Ctrl+C` in that terminal when you want to stop the server.

## If `http://localhost:4173` does not open

Try these checks:

1. **Confirm you started the server in this folder.** The server should be started from the directory that contains `index.html`, `styles.css`, and `app.js`.
2. **Use the forwarded port URL if you are in a remote workspace.** If the server runs in a container, codespace, cloud IDE, or other remote environment, your browser's `localhost` points to your own computer, not the remote environment. Open the environment's forwarded/preview URL for port `4173` instead.
3. **Try the loopback IP locally.** If the server is running on your own computer, also try `http://127.0.0.1:4173`.
4. **Check whether the port is busy.** If port `4173` is already in use, start the app on another port, such as `python3 -m http.server 8000 --bind 0.0.0.0`, then open `http://localhost:8000`.
5. **Do not close the server terminal.** Closing the terminal or pressing `Ctrl+C` stops the app.

## App files

- `index.html` contains the page structure.
- `styles.css` contains the responsive visual design.
- `app.js` contains the live JST clock, calendar rendering, Japanese holiday calculations, and Japanese solar term entries.

No install or build step is required.
