# Move your wedding website to GitHub Pages

This package contains the current English, German and Spanish site, its pictures and envelope animation, a Google Forms connection and email notification script, and an automatic GitHub Pages publishing workflow.

**Complete the Google setup first. The export deliberately refuses to publish an unconfigured form.** You do not need to install Node, Git or other software on your computer if you use the GitHub website steps below.

## What has been verified

- 19 automated checks passed on the original site and integration logic.
- The export was checked for both an account-site root path and a project path such as /wedding/.
- Local asset links, language links, the RSVP scripts and Google provider configuration were checked in the exported files.
- Tests cover saving, duplicate prevention, failure acknowledgement, notification retry and envelope memory.
- Google service calls were tested with mocks, not your live Google account. A real signed-out submission and received email must still be checked after deployment.
- Responsive mobile rules are included. A full visual phone test was blocked by the available preview browser. Use the final phone checklist below.

## How the finished setup works

Guests open your GitHub Pages website and fill in the custom form already on the page. They do not see the standard Google Form and do not need a Google or ChatGPT account.

The website sends the answers to your Google Apps Script web app. It writes them as a response in your Google Form, which is linked to a Google Sheet. The script then sends you an email containing the reply and a link to the Sheet. Your website only shows a saved confirmation after the script acknowledges storage.

You sign into Google once to create and authorise this setup. Only you need a Google login to view the collected responses. GitHub hosts the design; Google stores the replies and sends the email. No SMTP server, paid email service or email API key is needed for this implementation. Google usage quotas still apply.

## 1. Download and unzip

Unzip this package on your computer. Open its folder and check that you see README.md, content, public, integrations, scripts, tests, package.json and a .github folder. Upload these files and folders later, not the ZIP file itself and not an extra enclosing folder.

There is no response database in this package. The old Worker and organiser dashboard are intentionally omitted because they do not run on GitHub Pages.

## 2. Create Google Forms storage and email notifications

Use the Google account that should own your wedding replies. A personal account is usually simpler than a work account with organisation restrictions.

1. Open https://script.google.com and select New project. Name it Wedding guest plans.
2. Open integrations/google-forms/Code.gs from the downloaded package in a text editor, copy its entire contents, and replace all the default code in the Apps Script editor. Save.
3. In Apps Script, open Project Settings and turn on Show appsscript.json manifest file in editor. Return to the editor. Replace that manifest's contents with the downloaded integrations/google-forms/appsscript.json. Save.
4. To choose where notification emails arrive, open Project Settings → Script properties → Add script property. Use NOTIFICATION_EMAIL as the property and your preferred email address as the value. Save. If you omit this, setup uses the Google account running the script. The recipient may be another address, but mail is sent under the authorising Google account.
5. In the function dropdown at the top, select setupWeddingRsvp and click Run. Review and authorise the requested Forms, Sheets, email and trigger permissions for your own script. This is an organiser-only step. If your account's security policy blocks authorisation, stop and use a permitted account rather than bypassing a security warning.
6. After the run succeeds, open the Execution log. Copy and bookmark the Google Form edit link and the linked Google Sheet link. Setup has created both for you; you do not need to make a Google Form by hand. Running setup again reuses the same files.
7. In the script's left-hand Triggers view, confirm an hourly retryWeddingEmails trigger exists. This retries queued notifications if mail sending is temporarily unavailable.
8. Do not rename or delete the generated Google Form questions; their titles are the field mapping. Do not enable verified email collection, restrict responses to your organisation or turn on one response per Google user. The script applies anonymous duplicate checks itself.

Email notifications are sent directly by the supplied script after it saves a reply. Do not add an additional Google Forms submit-email trigger for this flow. Programmatic FormResponse.submit() does not fire form-submit triggers, and adding another notification mechanism could produce duplicate mail.

## 3. Deploy the Google endpoint

1. In Apps Script select Deploy → New deployment.
2. Click Select type and choose Web app.
3. Add a description such as Wedding RSVP version 1.
4. Set Execute as to Me.
5. Set Who has access to Anyone. This must allow anonymous visitors, not just Anyone with a Google account. If this option is unavailable, your Google account's policy may not permit the setup.
6. Click Deploy and complete any organiser authorisation required.
7. Copy the Web app URL. It has this pattern: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec. Keep the exact URL. Do not use the /dev URL or the Google Form edit/share URL.

Only the organiser authorises Google access. Executing as Me allows the script to write to your Form and send mail without requesting sign-in from your guests.

## 4. Connect the website to that endpoint

Open public/rsvp-config.js in the unzipped folder and replace the configuration with:

```javascript
window.WEDDING_RSVP_CONFIG = Object.freeze({
  provider: 'google',
  googleScriptUrl: 'PASTE_YOUR_FULL_DEPLOYED_EXEC_URL_HERE'
});
```

Replace the quoted placeholder with your real URL ending in /exec, keeping the quotes. Save. For example, the value should start with https://script.google.com/macros/s/ and end with /exec.

This is the only website file you need to configure for Google. Do not put your Google password, email notification recipient, tokens or other secrets here. The endpoint URL is public by design. The notification address stays in Google Script properties.

Keep the same endpoint URL when you move or edit the website. That keeps the existing Form and Sheet in use.

## 5. Create your free GitHub repository

1. Sign in at https://github.com and create a repository called wedding. You can choose another simple name if you prefer.
2. Select Public for a free GitHub Pages repository. The site, its source and pictures will therefore be public. Guest answers and notification email settings stay in Google, outside this repository.
3. Use main as the default branch. You may initialise the repository with a README to make the upload interface available.
4. In the repository choose Add file → Upload files. Upload the contents of the unzipped package into the repository root. The root must contain content, public, scripts, integrations, tests, package.json and README.md, not a single enclosing wedding-github-export folder.
5. Check that .github/workflows/pages.yml was uploaded. If your file picker did not include the .github folder, choose Add file → Create new file, enter .github/workflows/pages.yml as its path, paste the contents of the same file from the package and commit it.
6. Commit the files to main.

Your normal project-site address will look like https://YOUR_USERNAME.github.io/wedding/. You do not need to manually change every image path; the supplied workflow detects the GitHub Pages base path and exports the right links.

For an account site at https://YOUR_USERNAME.github.io/, name the repository YOUR_USERNAME.github.io instead. The same workflow handles the root path. If you later add a custom domain, set it in GitHub Pages settings and run the workflow again so its base path is recalculated.

## 6. Turn on Pages publishing

1. Open the repository's Settings → Pages.
2. Under Build and deployment → Source, choose GitHub Actions. Do not choose Deploy from a branch for this source package.
3. Open the Actions tab. Select Publish wedding website.
4. If the first run failed before Pages was enabled, select Run workflow and choose main. A workflow file must already be present on main for this button to appear.
5. Wait for all steps to show green: tests, export, upload and publish.
6. Open the published URL shown in the deployment or Settings → Pages. This is the link to share after testing.

The workflow automatically runs again whenever you commit an update to main. You do not need to upload a generated github-pages folder yourself and you do not need to run commands on your computer.

The supplied configuration intentionally fails at Export static website if the Google endpoint is not configured. This prevents a GitHub Pages form from trying to use the old ChatGPT-only database.

## 7. Test before sending invitations

Use a private/incognito browser window with no Google or ChatGPT session, ideally on a smartphone. This checks guest behaviour rather than the organiser's logged-in session.

- Open the normal published URL with no ?invitation=preview parameter.
- Open the envelope and refresh the page. It should go straight to the website in that same browser session.
- Switch between English, German and Spanish and check that pictures, navigation and text display correctly.
- Scroll, use the sticky navigation and check the page does not need horizontal scrolling.
- Fill in a test reply with one guest, then use a different test name for a group of four. Pick different menus for each guest, select Not sure yet for travel, and test leaving the email and undecided dates blank.
- Submit. Wait for the on-page saved confirmation. A spinner or lack of network error is not proof of saving.
- Open your Google Form Responses tab and the linked Sheet. Confirm each test reply and every guest/menu were saved.
- Confirm that a notification email arrives at NOTIFICATION_EMAIL, with the reply and Sheet link. Check Spam/Promotions if needed.
- Retry the same name/email and verify that it does not overwrite or create a second reply.

Do not consider the migration complete until a signed-out website submission reaches Google and you receive the email. Mock tests cannot verify your account permissions, endpoint deployment, network access or email delivery.

## 8. View and download responses

Open the bookmarked Google Sheet at any time. Use File → Download → Microsoft Excel or Comma-separated values (CSV). In Google Forms, use the Responses tab to see replies and the Sheet icon to open the linked spreadsheet.

You do not need the ChatGPT dashboard. Moving or updating the website does not erase the Google Form or its responses. Do not delete the Google project, Form or Sheet.

Existing replies saved on the original ChatGPT-hosted site are not in this ZIP and will not move automatically. If there are any, sign into the original organiser page at https://our-bad-gastein-wedding.fatimavargasdelacerd.chatgpt.site/rsvp-admin and export its CSV before retiring that site. Keep the CSV private. Do not commit guest responses to GitHub.

## 9. Edit the site after moving

For wording or design edits, you can still ask ChatGPT to prepare the code, then update the corresponding files in your repository. Provide the current repository version or download its latest ZIP when asking for changes so your own edits are preserved.

| Change | File to edit |
| --- | --- |
| English text and layout | content/en.html |
| German text and layout | content/de.html |
| Spanish text and layout | content/es.html |
| Text marked data-i18n | Also update that index in the matching language of public/translations.json, because the browser reapplies it |
| Google endpoint | public/rsvp-config.js |
| Mobile refinements | public/mobile.css |
| Envelope behaviour and captions | public/invitation.js |
| Envelope appearance | public/invitation.css and public/assets/invitation-envelope.webp |
| Shared form behaviour and messages | public/rsvp.js |
| Email recipient | Google Apps Script → Project Settings → NOTIFICATION_EMAIL, not GitHub |

On GitHub open a file, choose the pencil icon, edit, and Commit changes to main. The workflow republishes it. To replace multiple files, use Add file → Upload files while preserving their folder paths.

If you edit Code.gs in Google, save it and use Deploy → Manage deployments → Edit the existing deployment → New version → Deploy. Updating the existing deployment preserves its /exec URL. If you create a separate deployment with a new URL instead, also update public/rsvp-config.js and republish the website.

Simple text/design edits do not need a new Google Form. Adding or removing RSVP fields requires updating the frontend and the Apps Script field mapping together; ask for help with that change.

## Envelope details

It is remembered after opening or skipping, across refreshes and all three languages on the same origin. It uses localStorage plus a cookie fallback. It is once per browser profile, not a device fingerprint. Clearing storage, private browsing, changing browsers or moving to a different domain can show it again. The preview parameter deliberately replays it.

Send guests the normal URL. You can retire the envelope later by changing enabled=true to enabled=false near the top of public/invitation.js and committing that change. Website updates do not otherwise reset it.

## If something fails

| Symptom | Check |
| --- | --- |
| GitHub workflow says Configure the Google RSVP endpoint | Check provider is google and the URL is the real /exec URL in public/rsvp-config.js |
| Pages setup or publish step fails | Settings → Pages → GitHub Actions; main branch; workflow file exists at .github/workflows/pages.yml |
| Pictures or language links break | Re-run the supplied workflow; do not upload source content as a branch-based website or move files into another folder |
| Google requests a guest login | Deployment must Execute as Me with access Anyone; use /exec, not /dev; account policy must permit anonymous access |
| Form never confirms saving | Open Apps Script → Executions for errors; check FORM_ID, SHEET_ID and generated question titles; redeploy after script changes; do not assume the reply was saved |
| Reply appears in Google but no email arrives | Check NOTIFICATION_EMAIL, Spam and Apps Script Executions; run retryWeddingEmails manually; verify its hourly trigger still exists |
| An email arrives later | Google daily mail quotas or temporary failures may delay it; the saved Form response remains available. The retry queue sends once mail service is available again |
| Duplicate notification email | A rare interruption after sending but before recording delivery can cause a retry; compare Receipt ID before counting replies |
| Someone needs to correct their reply | They contact you; guests cannot retrieve or edit previous answers through the public website. You can add organiser notes in the Sheet |

## Optional local commands

These are not required for the GitHub website workflow. If you already have Node 20 or later installed, from this folder run:

```bash
node --test tests/*.test.mjs
node scripts/export-github.mjs /wedding/
```

The second command requires the real Google configuration. It writes the generated static website to github-pages. For an account root site, omit /wedding/. Never upload the old Worker build to GitHub Pages.

## Official references checked for this guide

- GitHub Pages creation: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- GitHub Pages publishing workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Google Apps Script web apps: https://developers.google.com/apps-script/guides/web
- Google Forms API: https://developers.google.com/apps-script/reference/forms/form
- Programmatic submissions and triggers: https://developers.google.com/apps-script/guides/triggers/installable
- Email service: https://developers.google.com/apps-script/reference/mail/mail-app
- Google usage quotas: https://developers.google.com/apps-script/guides/services/quotas
