# Meadbee Labs

Meadbee Labs is a personal AI/software laboratory and technical portfolio for autonomous-agent systems, locally trained models, generative tools, development utilities, and experiments.

This repository implements all five planned build stages:

- Stage 1: Astro foundation, content schemas, global layout, responsive navigation, SEO defaults, sitemap, and Cloudflare Workers static deployment configuration.
- Stage 2: Home, CLI Harness, Projects, Experiments & Tests, Models, Downloads, About, and a custom 404 page with representative content.
- Stage 3: Collection-generated cards and feeds plus prerendered detail pages for every project, experiment, and model record.
- Stage 4: Richer project heroes, reusable metadata and taxonomy UI, upgraded architecture graphics, explicit empty/error states, subtle animation, and responsive interaction/accessibility polish.
- Stage 5: Reproducible launch verification, a pinned Cloudflare build runtime, static-asset routing validation, and an exact GitHub-to-Cloudflare deployment runbook.

The content copy is intentionally conservative. Placeholder records are explicitly marked and do not invent dates, benchmarks, performance results, download counts, or release versions.

## Technology

- Astro 7
- TypeScript with Astro's strict configuration
- Astro Content Collections using the current glob loader API
- Markdown and MDX
- Reusable Astro components and global CSS
- Static generation with no persistent server
- Cloudflare Workers static assets via Wrangler

## Prerequisites

- Node.js 22.12 or newer
- npm
- A Cloudflare account only when previewing or deploying through Wrangler

## Local development

```sh
npm install
npm run dev
```

Astro will print the local URL, normally `http://localhost:4321`.

Useful commands:

```sh
npm run check      # Astro and TypeScript diagnostics
npm run build      # Production static build
npm run verify     # Diagnostics, build, and launch-readiness validation
npm run preview    # Preview the generated Astro site
npm run cf:preview # Build first, then preview through Wrangler as needed
npm run deploy     # Build through the predeploy hook, then deploy with Wrangler
```

The generated `dist/` directory is ignored by Git.

## Project structure

```text
src/
├── components/          Reusable cards, navigation, status UI, and diagrams
├── content/
│   ├── projects/        Project Markdown or MDX records
│   ├── experiments/     Notebook and test records
│   ├── models/          Model and training records
│   └── releases/        Lightweight release metadata
├── content.config.ts    Collection loaders and Zod schemas
├── layouts/             Shared document shell and metadata
├── lib/                 Content URLs, feed queries, date formatting, and related-entry logic
├── pages/               Astro routes
└── styles/              Design tokens and global component styles

public/
├── images/              Modest web images and the default social preview
└── screenshots/         Project screenshots when available
```

The planning Word document, link notes, and palette-reference artwork remain at the repository root as source material. They are not imported by the production site.

## Permanent content IDs

Each collection record declares an explicit stable permanent ID. For example:

```yaml
permanentId: project-synthetic-data
slug: synthetic-data-designer
```

Keep `permanentId` and the matching filename stable even if the public `slug` or title changes. Build-time validation rejects duplicate permanent IDs and duplicate slugs. This gives future reactions, views, bookmarks, downloads, or comments a durable content key without tying database records to URLs.

Public detail URLs are generated from `slug` during the static build:

```text
/projects/public-url-slug/
/experiments/public-url-slug/
/models/public-url-slug/
```

The CLI Harness is the intentional exception: its project record resolves to the canonical top-level `/cli/` route.

## Add a project

Create `src/content/projects/project-your-stable-id.md`:

```md
---
permanentId: project-your-stable-id
title: Project title
description: A concise, factual description.
slug: public-url-slug
status: in-development
featured: false
placeholder: false
category: ai-tool
tags:
  - Local AI
workflow:
  - Specify
  - Build
  - Validate
links:
  github: https://github.com/example/project
---

Write the project overview here.
```

The next production build automatically adds the project card, feed placement when featured, detail route, rendered article body, metadata panel, and related-project links.

Valid project statuses are `active`, `in-development`, `maintained`, `archived`, and `concept`.

## Add an experiment

Create `src/content/experiments/exp-your-stable-id.mdx`:

```mdx
---
permanentId: exp-your-stable-id
title: Experiment title
description: What the test is intended to examine.
slug: public-url-slug
category: training
status: draft
featured: false
placeholder: false
tags:
  - Training
published: 2026-08-27
links: {}
---

Write the field note here. MDX components can be imported when interactive or richer
technical presentation is genuinely useful.
```

The `published` field is optional until a real publication date exists. Published entries are sorted by date; undated drafts remain supported.

The next production build automatically creates the experiment detail route and renders either Markdown or MDX content. Related field notes are selected from shared category and tag metadata.

Valid experiment statuses are `draft`, `planned`, `complete`, and `in-progress`.

## Add a model

Create `src/content/models/model-your-stable-id.md`:

```md
---
permanentId: model-your-stable-id
title: Model title
description: A factual model and training summary.
slug: public-url-slug
modelType: Language Model
status: research
featured: false
placeholder: false
tags:
  - LLM
parameters: "Optional"
context: "Optional"
tokenizer: "Optional"
training: "Optional"
links:
  huggingface: https://huggingface.co/example/model
---

Document architecture, data, training, evaluation, failures, and lessons learned.
```

Valid model statuses are `research`, `training`, `evaluation`, `released`, and `paused`. Technical fields are optional so diffusion, audio, video, or multimodal entries are not forced into an LLM-specific shape.

The next production build automatically creates the model detail route, technical metadata panel, external resource links, and related-model section.

## Media and downloads

- Keep modest site images in `public/images/` and screenshots in `public/screenshots/`.
- Put application binaries in GitHub Releases.
- Put model weights and model repositories on Hugging Face.
- Use Cloudflare R2 later if large hosted media becomes necessary.
- Do not commit model checkpoints, large generated collections, secrets, or build output.

## Cloudflare Workers deployment

The initial site is completely prerendered. Current Astro and Cloudflare guidance does not require `@astrojs/cloudflare` for a static Astro build. `wrangler.jsonc` publishes `./dist` through Workers static assets. Add the adapter later only if the site introduces on-demand rendering, server islands, actions, sessions, or other runtime routes.

### Local Wrangler deployment

1. Authenticate once with `npx wrangler login`.
2. Run `npm run deploy`.
3. Wrangler will create or update the `meadbee-labs` Worker and provide a `workers.dev` URL.

No Cloudflare account ID or secret is committed to the repository.

### GitHub to Cloudflare Workers Builds

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact current GitHub connection, build settings, preview validation, custom-domain setup, production launch check, and rollback procedure.

## Current scope

All five planned implementation stages are complete. The repository now includes collection-backed pages, permanent IDs, generated detail routes, metadata-derived feeds and related records, responsive visual polish, static Cloudflare configuration, and a repeatable launch-verification command.

Authentication, user profiles, comments, a database, analytics APIs, model hosting, full-text search, and a CMS are intentionally outside the current build.
