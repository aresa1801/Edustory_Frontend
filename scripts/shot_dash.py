#!/usr/bin/env python3
"""Screenshot EduStory dashboard pages as an authenticated role.

Usage:
  python3 shot_dash.py <base_url> <email> <password> <outdir> [paths...]

Logs in through Supabase (password grant, anon key), then sets the
sb-<ref>-auth-token cookie (base64-<json>) in Chromium via CDP and captures
each path at desktop (1440x1000) and mobile (390x900).
"""
import asyncio, base64, json, os, re, sys, urllib.request

SUPA = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
ANON = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
CDP = os.environ.get("CDP_HTTP", "http://127.0.0.1:18800")


def login(email, password):
    req = urllib.request.Request(
        f"{SUPA}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json", "apikey": ANON},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def cookie_for(session):
    ref = SUPA.split("//")[1].split(".")[0]
    payload = {
        "access_token": session["access_token"],
        "token_type": "bearer",
        "expires_in": session.get("expires_in", 3600),
        "expires_at": session.get("expires_at"),
        "refresh_token": session["refresh_token"],
        "user": session["user"],
    }
    val = "base64-" + base64.b64encode(json.dumps(payload).encode()).decode()
    return f"sb-{ref}-auth-token", val


async def main():
    import websockets

    base, email, pw, outdir = sys.argv[1:5]
    paths = sys.argv[5:] or ["/dashboard"]
    os.makedirs(outdir, exist_ok=True)
    session = login(email, pw)
    cname, cval = cookie_for(session)
    dom = re.sub(r"^https?://", "", base)

    targets = json.load(urllib.request.urlopen(f"{CDP}/json/list", timeout=10))
    page = next((t for t in targets if t.get("type") == "page"), None)
    if page is None:
        page = json.load(urllib.request.urlopen(
            urllib.request.Request(f"{CDP}/json/new?about:blank", method="PUT"), timeout=10))
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
        await cmd("Network.enable")
        await cmd("Network.setCookie", {
            "name": cname, "value": cval, "domain": dom, "path": "/",
            "httpOnly": False, "secure": base.startswith("https"),
        })
        for path in paths:
            for tag, w, h in (("desktop", 1440, 1000), ("mobile", 390, 900)):
                await cmd("Emulation.setDeviceMetricsOverride", {
                    "width": w, "height": h, "deviceScaleFactor": 1, "mobile": tag == "mobile",
                })
                await cmd("Page.navigate", {"url": base + path})
                await asyncio.sleep(4)
                shot = await cmd("Page.captureScreenshot", {"format": "png"})
                name = path.strip("/").replace("/", "_") or "root"
                fp = os.path.join(outdir, f"{name}_{tag}.png")
                with open(fp, "wb") as fh:
                    fh.write(base64.b64decode(shot["data"]))
                print("saved", fp)


asyncio.run(main())
