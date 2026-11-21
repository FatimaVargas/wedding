# Connect the wedding form to Google Forms and email

The connection is prepared, but not activated. The published website currently saves responses in its existing private site database. Guests do not need an account. Nothing is emailed until the Google setup below is completed.

## One-time setup in your Google account

1. Open https://script.google.com and create a standalone project called Wedding guest plans.
2. Replace the default Code.gs with this folder's Code.gs. In Project Settings, enable viewing appsscript.json and replace it with this folder's manifest.
3. In Project Settings → Script properties, optionally set NOTIFICATION_EMAIL to the address that should receive notifications. Otherwise setup uses the Google account running it. This address stays in Google, never in the website's public source.
4. Select setupWeddingRsvp and click Run. Authorise the Forms, Sheets, email and trigger permissions as the organiser. Guests will never do this. Setup creates a Google Form, linked Google Sheet, and hourly retry process for notifications that temporarily fail. Running setup again reuses the same form.
5. Copy the Form and Sheet links from the execution log. Do not delete or rename the generated Form questions; the script maps them by title. They include every guest's name/menu, dates, travel, Alm checkbox and notes. Attendance is optional internally for compatibility with the approved German page.
6. Deploy → New deployment → Web app. Choose **Execute as: Me** and **Who has access: Anyone** (not “Anyone with a Google account”). If your work account disallows anonymous apps, use a personal account that allows them. Copy the deployed URL ending in /exec, not the editor-only /dev URL.
7. Send that /exec URL to the website editor, or update public/rsvp-config.js: provider: 'google' and googleScriptUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'. Publish the website after that change.
8. Test in a signed-out/private browser on a phone: submit a test reply, check that it appears in Google Forms and the linked Sheet, and confirm the email arrives. Test 1–4 guests, individual menus and a blank email. Do this before sharing the invitation.

Only the organiser signs in for setup and viewing responses. Visitors use the existing custom website form. The Form itself does not collect verified email or limit responses to signed-in Google users. Guest email is a normal optional website field, not authentication.

## Saving and notifications

The browser POSTs the answers to Apps Script through an invisible form, then polls a random receipt ID. It displays success only after Google confirms the Form response was saved. The receipt endpoint returns no answers or personal details. A timeout displays an unconfirmed-save message and keeps the answers available to retry with the same receipt ID.

The script prevents a second response with the same normalised primary name/email and prevents the same receipt creating a second response. As this is anonymous, this is duplicate prevention, not identity verification. Guests cannot view or edit earlier answers through the website. Contact the couple for corrections.

Email is sent by the script immediately after saving. It does not rely on a Google Forms submit trigger: programmatic FormResponse.submit() does not run that trigger. A durable outbox and hourly retry handle temporary mail failures or daily quota exhaustion. Email may arrive later during a Google outage or quota limit; the saved reply remains in Forms/Sheets. Check the script's Executions page and mail_ Script properties if a notification is delayed. A crash after sending but before recording delivery can rarely cause a duplicate notification, rather than losing a reply.

The small-event spam protections are validation, a hidden honeypot, a submission lock, duplicate detection and a 60-response/day limit. The endpoint is necessarily public; it is not protected by a browser-visible secret.

## Download or move hosts

Responses are in your own Google Form and linked Sheet. Download the Sheet as CSV or Excel without opening the ChatGPT dashboard. Moving from Sites to GitHub Pages does not move or erase those Google records: keep the same /exec URL and Google project.

Replies previously saved in the current Sites database remain there; switching to Google does not automatically copy them. Export them from /rsvp-admin before migrating if needed. The administrator link requires the organiser's sign-in; the public form does not.

To publish on GitHub Pages, configure Google first and run:

- Account site (username.github.io): node scripts/export-github.mjs
- Project site (username.github.io/wedding): node scripts/export-github.mjs /wedding/

Publish the generated github-pages folder as the Pages artifact. It contains only the static site and public assets, not the Worker, responses or organiser dashboard. Keep the integrations folder and source in your repository for future maintenance.

## Envelope behaviour

Opening or skipping the envelope remembers it in localStorage, with a first-party cookie fallback. It is shared across the website's three languages, persists across refreshes and ordinary content updates, and does not require a login. The ?invitation=preview review link deliberately replays it; send guests the normal URL without that parameter. Section links bypass it.

This means once per browser profile on the same site address, not a device fingerprint. A different browser, private session, cleared storage, blocked storage, or migration to a different domain can show the envelope again. The cookie fallback lasts one year; localStorage normally persists until cleared.

## Official references

- Web apps and execution identity: https://developers.google.com/apps-script/guides/web
- Content Service and read-only JSONP: https://developers.google.com/apps-script/guides/content
- Programmatic submissions and trigger restrictions: https://developers.google.com/apps-script/guides/triggers/installable
- Forms API: https://developers.google.com/apps-script/reference/forms/form
- Email service and quotas: https://developers.google.com/apps-script/reference/mail/mail-app
