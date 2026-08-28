import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphen-separated URL slug.');

const sharedFields = {
  permanentId: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphen-separated permanent ID.'),
  title: z.string(),
  description: z.string(),
  slug: contentSlug,
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  featured: z.boolean().default(false),
  placeholder: z.boolean().default(false),
  published: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
};

const linksSchema = z
  .object({
    github: z.url().optional(),
    download: z.url().optional(),
    external: z.url().optional(),
    huggingface: z.url().optional(),
  })
  .default({});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    ...sharedFields,
    status: z.enum(['active', 'in-development', 'maintained', 'archived', 'concept']),
    category: z.string(),
    workflow: z.array(z.string()).min(3).max(5),
    links: linksSchema,
  }),
});

const experiments = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/experiments' }),
  schema: z.object({
    ...sharedFields,
    experimentNumber: z.number().int().positive().optional(),
    category: z.string(),
    model: z.string().optional(),
    duration: z.string().optional(),
    status: z.enum(['draft', 'planned', 'complete', 'in-progress']).default('draft'),
    links: linksSchema,
  }),
});

const models = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/models' }),
  schema: z.object({
    ...sharedFields,
    modelType: z.string(),
    parameters: z.string().optional(),
    context: z.string().optional(),
    tokenizer: z.string().optional(),
    training: z.string().optional(),
    status: z.enum(['research', 'training', 'evaluation', 'released', 'paused']),
    links: linksSchema,
  }),
});

const releases = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/releases' }),
  schema: z.object({
    permanentId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphen-separated permanent ID.'),
    title: z.string(),
    project: z.string(),
    version: z.string().optional(),
    status: z.enum(['planned', 'preview', 'released']),
    description: z.string(),
    published: z.coerce.date().optional(),
    download: z.url().optional(),
  }),
});

export const collections = { projects, experiments, models, releases };
