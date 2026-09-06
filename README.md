# Angel & Jason — Wedding RSVP Site

A static wedding invitation site built for GitHub Pages, with RSVPs and
guestbook notes saved to a Google Sheet through a small Google Apps
Script backend, and a private admin dashboard to review responses.

```
jason-angel-wedding/
├── index.html      Public wedding website
├── admin.html      Admin RSVP dashboard (private — do not link publicly)
├── Code.gs         Google Apps Script backend (the "API")
├── assets/         Photos, background music, QR codes
└── README.md       This file
```

No paid hosting, database, or server is required. GitHub Pages serves
the two HTML files for free; Google Sheets + Apps Script is the free
database and API.

---

## How it fits together

- **index.html** is the public site. When a guest submits the RSVP
  form or signs the guestbook, the page sends that data to a Google
  Apps Script "Web App" URL.
- **Code.gs** is that Web App. It writes each submission as a new row
  in a Google Sheet, and answers a few read-only questions (how many
  guests are coming, what the guestbook wall says) so the public page
  can show live numbers without exposing every guest's full response.
- **admin.html** is a private page, gated by a password you choose,
  that asks Code.gs for the full RSVP and guestbook data and displays
  it as a dashboard with search and CSV export.

Nobody needs to touch the Google Sheet directly — Code.gs manages the
column headers and sheet creation automatically the first time someone
submits.

---

## Part 1 — Create the Google Sheet backend

1. Go to [sheets.google.com](https://sheets.google.com) and create a
   new blank spreadsheet. Name it something like **Angel & Jason RSVPs**.

2. In the sheet, open **Extensions → Apps Script**. A new tab opens
   with a script editor pre-loaded with an empty `Code.gs`.

3. Delete the placeholder content in that editor and paste in the
   entire contents of this project's `Code.gs` file.

4. Save the script (Ctrl/Cmd+S). Name the project if prompted (e.g.
   "Wedding RSVP API").

5. Set your admin password:
   - In the left sidebar, click the gear icon (**Project Settings**).
   - Scroll to **Script Properties** → **Add script property**.
   - Property: `ADMIN_KEY`   Value: a password you choose (e.g. a
     random phrase — this is what you'll type into `admin.html` to
     view responses). Save.
   - This password is never written into any file in this project —
     it only lives here, in your own Google account.

6. Deploy it as a Web App:
   - Back in the script editor, click **Deploy → New deployment**.
   - Click the gear next to "Select type" and choose **Web app**.
   - Description: anything (e.g. "v1").
   - **Execute as:** Me (your Google account).
   - **Who has access:** Anyone.
   - Click **Deploy**.
   - The first time, Google will ask you to authorize the script —
     click through the consent screens (you'll see an "unverified
     app" warning since this is your own personal script; click
     **Advanced → Go to (project name)** to proceed).
   - Copy the **Web app URL** shown after deployment. It looks like:
     `https://script.google.com/macros/s/AKfycb.../exec`

Keep that URL handy — you'll paste it into two files in Part 2.

> **If you ever edit Code.gs later:** you must create a **new
> deployment** (Deploy → Manage deployments → Edit (pencil) →
> New version) for the changes to take effect. Saving the script
> alone does not update a live deployment.

---

## Part 2 — Configure the site

1. Open `index.html` and find this near the top of the big
   `<script id="app-logic">` block:

   ```js
   var CONFIG = {
     WEB_APP_URL: 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE'
   };
   ```

   Replace the placeholder with the Web app URL from Part 1, e.g.:

   ```js
   var CONFIG = {
     WEB_APP_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
   };
   ```

2. Open `admin.html` and do the same for its `CONFIG.WEB_APP_URL`
   near the top of its `<script>` block. Both files must point to
   the same Web app URL.

3. (Optional but recommended) Regenerate the share QR code in the
   footer once you know your final GitHub Pages URL — see
   **"Regenerating the share QR code"** below. The site works fine
   without doing this; the QR code just won't point anywhere useful
   until it's regenerated.

---

## Part 3 — Publish to GitHub Pages

1. Create a new GitHub repository (public or private — Pages works
   with both, though a private repo needs GitHub Pro/Team/Enterprise
   to serve Pages). Name it `jason-angel-wedding` (or anything you
   like).

2. Push these files to the repository. If you're comfortable with
   git:

   ```bash
   cd jason-angel-wedding
   git init
   git add .
   git commit -m "Wedding RSVP site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/jason-angel-wedding.git
   git push -u origin main
   ```

   Or, without git: on GitHub, click **Add file → Upload files** on
   your new repo's page and drag in `index.html`, `admin.html`,
   `Code.gs`, `README.md`, and the whole `assets/` folder, then
   commit.

3. In the repository, go to **Settings → Pages**.
   - Under **Source**, choose **Deploy from a branch**.
   - Branch: `main`, folder: `/ (root)`.
   - Click **Save**.

4. GitHub will publish the site within a minute or two, at:

   ```
   https://YOUR-USERNAME.github.io/jason-angel-wedding/
   ```

   That's the link to share with guests. The admin dashboard is at:

   ```
   https://YOUR-USERNAME.github.io/jason-angel-wedding/admin.html
   ```

   Keep the admin link to yourself — it isn't linked from the public
   site, but it isn't unguessable either, so treat it as somewhat
   private and rely on the `ADMIN_KEY` password to actually protect
   the data. Don't post the admin link anywhere public.

---

## Part 4 — Test it before sending invites

1. Open the public URL in a private/incognito window (avoids any
   caching). Confirm:
   - Tapping the "Tap to Begin" screen starts the music.
   - The RSVP form submits and shows the thank-you screen.
   - The guestbook note you leave appears on the guestbook wall after
     a refresh.

2. Open the Google Sheet — you should see a new **RSVPs** sheet tab
   (and a **Guestbook** tab once you leave a note) with your test
   entry as a row. Delete your test rows once you've confirmed it
   works.

3. Open `admin.html`, enter the `ADMIN_KEY` you set in Part 1, and
   confirm your test RSVP appears with the right details.

---

## Regenerating the share QR code

The footer QR code just encodes your site's URL as an image. If you
want it to point at your actual GitHub Pages URL (or a custom domain
later), regenerate `assets/qr-share.png` with this short Python
script (requires `pip install qrcode[pil]`):

```python
import qrcode
from qrcode.constants import ERROR_CORRECT_H

url = "https://YOUR-USERNAME.github.io/jason-angel-wedding/"
qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=20, border=2)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="#5c1a2b", back_color="#fdf8f2").convert("RGB")
img.save("assets/qr-share.png")
```

Or use any free online QR generator with that same URL and save the
result over `assets/qr-share.png` (keep the filename the same).

---

## Using a custom domain (optional)

If you'd rather share `angelandjason.com` than the `github.io` link:

1. Buy the domain from any registrar.
2. In the repo, **Settings → Pages → Custom domain**, enter it.
3. At your registrar, add the DNS records GitHub shows you (either an
   `A` record pointing at GitHub's IPs, or a `CNAME` if using a
   subdomain).
4. Wait for DNS to propagate (can take up to a few hours), then
   re-check the Pages settings — GitHub will confirm and offer to
   enforce HTTPS.
5. Regenerate the share QR code (above) with the new domain.

---

## Privacy notes

- The public site only ever shows an aggregate guest count and the
  guestbook wall — never the full RSVP list, meal choices, or dietary
  notes. Only `admin.html`, behind your `ADMIN_KEY`, can see that.
- `ADMIN_KEY` lives in Google's Script Properties, not in any file in
  this repository, so it's safe even if the repo is public.
- If you ever want to revoke admin access (e.g. you shared the key
  with someone and want to change it), just update the `ADMIN_KEY`
  script property in Apps Script — no redeploy needed, it takes
  effect immediately.

---

## Troubleshooting

**RSVP form says "Something went wrong sending that"**
Double-check `CONFIG.WEB_APP_URL` in `index.html` is the exact URL
from Deploy → Manage deployments (it should end in `/exec`, not
`/dev`), and that the deployment's access is set to "Anyone."

**admin.html says "Incorrect key, or the backend is unreachable"**
Confirm the `ADMIN_KEY` script property is spelled exactly `ADMIN_KEY`
(case-sensitive) and that you're typing the matching value. If you
edited `Code.gs` after first deploying, make sure you created a new
deployment version (see the note at the end of Part 1).

**Music doesn't play**
Some browsers only allow audio after a real tap/click — this is why
the site has a "Tap to Begin" screen; it doubles as that first
gesture. If a guest opens the link inside Facebook Messenger,
Instagram, or Line's built-in browser, those apps sometimes block
audio outright — the site detects this and shows a banner telling the
guest to open the link in their regular browser instead.

**Changes to Code.gs aren't showing up**
Apps Script deployments are versioned snapshots. After editing the
script, go to **Deploy → Manage deployments**, click the pencil icon
on your existing deployment, and select **New version** before
clicking Deploy again. The Web App URL stays the same.
