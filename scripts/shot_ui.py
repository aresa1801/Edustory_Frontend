#!/usr/bin/env python3
"""Log into EduStory through the real UI form (CDP), then screenshot dashboards.

Usage: python3 shot_ui.py <base> <email> <password> <outdir> <path> [path...]
"""
import asyncio, base64, json, sys, urllib.request

CDP = "http://127.0.0.1:18800"

FILL = """
(() => {
  const set = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    d.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const e = document.querySelector('input[type=email]');
  const p = document.querySelector('input[type=password]');
  if (!e || !p) return 'no-fields';
  set(e, %s); set(p, %s);
  const btn = document.querySelector('button[type=submit]') ||
              [...document.querySelectorAll('button')].find(b => /masuk|login|sign in/i.test(b.innerText));
  if (!btn) return 'no-button';
  btn.click();
  return 'submitted';
})()
"""


async def main():
    import websockets

    base, email, pw, outdir = sys.argv[1:5]
    paths = sys.argv[5:] or ["/dashboard"]
    targets = json.load(urllib.request.urlopen(f"{CDP}/json/list", timeout=10))
    page = next((t for t in targets if t.get("type") == "page"), None)
    ws = page["webSocketDebuggerUrl"]

    async with websockets.connect(ws, max_size=None) as sock:
        i = 0

        async def cmd(method, params=None):
            nonlocal i
            i += 1
            await sock.send(json.dumps({"id": i, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await sock.recv())
                if msg.get("id") == i:
                    return msg.get("result", {})

        await cmd("Page.enable")
        await cmd("Runtime.enable")
        await cmd("Network.clearBrowserCookies")

        await cmd("Page.navigate", {"url": base + "/auth/login"})
        await asyncio.sleep(5)
        expr = FILL % (json.dumps(email), json.dumps(pw))
        r = await cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        print("login:", r.get("result", {}).get("value"))
        await asyncio.sleep(9)
        loc = await cmd("Runtime.evaluate", {
            "expression": "location.pathname + ' | ' + document.body.innerText.replace(/\\s+/g,' ').slice(0,120)",
            "returnByValue": True})
        print("after login:", loc.get("result", {}).get("value"))

        for path in paths:
            for tag, w, h in (("desktop", 1440, 1000), ("mobile", 390, 844)):
                await cmd("Emulation.setDeviceMetricsOverride", {
                    "width": w, "height": h, "deviceScaleFactor": 1, "mobile": tag == "mobile"})
                await cmd("Page.navigate", {"url": base + path})
                await asyncio.sleep(6)
                info = await cmd("Runtime.evaluate", {
                    "expression": "JSON.stringify({p:location.pathname,txt:document.body.innerText.replace(/\\s+/g,' ').slice(0,120),sw:document.documentElement.scrollWidth,iw:innerWidth})",
                    "returnByValue": True})
                shot = await cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                name = path.strip("/").replace("/", "_") or "root"
                fp = f"{outdir}/{name}_{tag}.png"
                with open(fp, "wb") as fh:
                    fh.write(base64.b64decode(shot["data"]))
                print("saved", fp, "|", info.get("result", {}).get("value"))


asyncio.run(main())
