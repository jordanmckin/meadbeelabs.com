# Meadbee Labs deployment runbook

This is the launch procedure for the static Astro site at `https://meadbeelabs.com`. It was verified against the Cloudflare Workers documentation on 2026-08-27.

## Deployment model

- Astro prerenders the entire site into `dist/`.
- Wrangler uploads `dist/` as Cloudflare Workers static assets.
- `404.html` is served with a real 404 response for unmatched paths.
- HTML requests use trailing slashes, matching Astro's canonical URLs.
- No Astro server adapter, database, runtime secrets, or persistent Worker process is required.
- RSS is intentionally absent until the site has a meaningful stream of genuinely published, dated entries.

## 1. Run the local launch gate

From the repository root:

```sh
npm ci
npm run verify
npx wrangler deploy --dry-run
```

`npm run verify` runs Astro/TypeScript diagnostics, creates a fresh production build, and validates generated links, fragments, accessibility basics, metadata, social imagery, robots policy, and sitemap coverage.

Do not continue if any command exits unsuccessfully.

## 2. Publish the repository to GitHub

The Cloudflare integration needs at least one commit on the production branch. Review the files before running these commands:

```sh
git add .
git commit -m "Build Meadbee Labs website"
git push -u origin main
```

The configured remote should be:

```text
https://github.com/jordanmckin/meadbeelabs.com.git
```

Keep the repository private if desired. During setup, grant the Cloudflare GitHub App access to this repository.

## 3. Create the Worker from the GitHub repository

1. Sign in to the Cloudflare dashboard and open **Workers & Pages**.
2. Select **Create application**.
3. Under **Import a repository**, select **Get started**.
4. Connect the GitHub account. If prompted, install or authorize the **Cloudflare Workers and Pages** GitHub App and grant it access to `jordanmckin/meadbeelabs.com`.
5. Select the repository.
6. Enter these build settings exactly:

| Setting | Value |
| --- | --- |
| Worker name | `meadbee-labs` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run verify` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

The Worker name must match the `name` in `wrangler.jsonc`. No build variables or secrets are currently required. `.node-version` pins the build image to Node.js 24.18.0. Build caching may be enabled.

7. Select **Save and Deploy**.
8. Wait for the install, verification, and deployment steps to finish.
9. Open the supplied `workers.dev` URL and complete the preview checks below.

Cloudflare's current reference pages are [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), and [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/).

### Connecting an existing Worker

If `meadbee-labs` was already created through Wrangler:

1. Open **Workers & Pages** and select `meadbee-labs`.
2. Open **Settings > Builds**.
3. Select **Connect** and choose the repository.
4. Apply the same branch, root, build, deploy, and preview commands above.
5. Push a new commit to trigger the first connected build.

## 4. Validate the Workers preview

Use the `workers.dev` hostname provided by Cloudflare and check:

- `/`, `/cli/`, `/projects/`, `/experiments/`, `/models/`, `/downloads/`, and `/about/` load.
- At least one generated project, experiment, and model detail route loads.
- A deliberately unknown path displays the custom error page and returns HTTP status `404`.
- `/robots.txt` advertises `https://meadbeelabs.com/sitemap-index.xml`.
- `/sitemap-index.xml` and its referenced child sitemap load as XML.
- `/images/social-preview.png` loads at 1200×630.
- Desktop and mobile navigation work, keyboard focus remains visible, and the skip link reaches the main content.
- The browser console has no errors. The current static build should ship no executable client-side JavaScript.

The preview HTML will still contain production canonical URLs for `https://meadbeelabs.com`; that is intentional.

## 5. Attach the production domain

The domain must be in an active Cloudflare zone and the Worker must already exist.

1. Open **Workers & Pages** and select `meadbee-labs`.
2. Open **Settings > Domains & Routes**.
3. Select **Add > Custom Domain**.
4. Enter `meadbeelabs.com` and select **Add Custom Domain**.
5. Wait for the DNS record and certificate to become active.

Cloudflare creates the DNS record and manages the certificate. An existing CNAME on the same hostname must be removed or changed before a Worker Custom Domain can be attached. See Cloudflare's [Custom Domains guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

If `www.meadbeelabs.com` is desired, configure it to redirect permanently to `https://meadbeelabs.com` so the canonical host stays singular.

## 6. Production launch check

Repeat the preview checks against `https://meadbeelabs.com`, then confirm:

- HTTP redirects resolve to HTTPS and the apex hostname.
- Every indexable page has one self-referencing canonical URL.
- The unknown-path response is `404`, not `200`.
- Open Graph and Twitter preview tags use the production URL and social image.
- The latest `main` build is shown as the active Worker deployment.
- A non-production branch produces a preview version without replacing production.

## Ongoing releases and rollback

- Push to `main` to build, verify, and promote a production deployment.
- Push another branch or update a pull request to create a preview version.
- If a release is bad, use the Cloudflare Worker's deployment history to roll back immediately, then revert or fix the Git commit so source control matches production.
- Build settings are managed in **Worker > Settings > Builds**. Repository access is managed from the same page under **Git Repository > Manage**.

Do not add Cloudflare API tokens, account IDs, or other credentials to the repository.
