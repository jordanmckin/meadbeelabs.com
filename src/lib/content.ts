import { getCollection } from 'astro:content';

export type RoutedCollection = 'projects' | 'experiments' | 'models';

const collectionRoots: Record<RoutedCollection, string> = {
  projects: '/projects/',
  experiments: '/experiments/',
  models: '/models/',
};

export function getContentPath(collection: RoutedCollection, slug: string): string {
  if (collection === 'projects' && slug === 'cli-harness') {
    return '/cli/';
  }

  return `${collectionRoots[collection]}${encodeURIComponent(slug)}/`;
}

export function formatContentDate(date?: Date): string {
  if (!date) return 'Not published';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

export function summarizeTaxonomy(labels: string[]) {
  const counts = new Map<string, number>();

  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

interface ContentLinks {
  github?: string;
  download?: string;
  external?: string;
  huggingface?: string;
}

export function getRecordLinks(links: ContentLinks) {
  return [
    { label: 'GitHub source', href: links.github },
    { label: 'Download', href: links.download },
    { label: 'External project', href: links.external },
    { label: 'Hugging Face', href: links.huggingface },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
}

type IdentifiedEntry = {
  data: {
    permanentId: string;
    slug: string;
  };
};

export function assertUniqueContent<T extends IdentifiedEntry>(entries: T[], label: string): T[] {
  const permanentIds = new Set<string>();
  const slugs = new Set<string>();

  for (const entry of entries) {
    if (permanentIds.has(entry.data.permanentId)) {
      throw new Error(`Duplicate ${label} permanentId: ${entry.data.permanentId}`);
    }
    if (slugs.has(entry.data.slug)) {
      throw new Error(`Duplicate ${label} slug: ${entry.data.slug}`);
    }

    permanentIds.add(entry.data.permanentId);
    slugs.add(entry.data.slug);
  }

  return entries;
}

type DatedEntry = {
  data: {
    title: string;
    published?: Date;
    featured?: boolean;
  };
};

export function newestFirst<T extends DatedEntry>(a: T, b: T): number {
  const dateDifference =
    (b.data.published?.getTime() ?? 0) - (a.data.published?.getTime() ?? 0);

  if (dateDifference !== 0) return dateDifference;

  const featuredDifference = Number(b.data.featured) - Number(a.data.featured);
  return featuredDifference || a.data.title.localeCompare(b.data.title);
}

export async function getFeaturedProjects(limit = 3) {
  const projects = assertUniqueContent(await getCollection('projects'), 'project');

  return projects
    .filter(({ data }) => data.featured)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .slice(0, limit);
}

export async function getLatestExperiments(limit = 3) {
  const experiments = assertUniqueContent(await getCollection('experiments'), 'experiment');
  return experiments.sort(newestFirst).slice(0, limit);
}

export async function getFeaturedModels(limit = 2) {
  const models = assertUniqueContent(await getCollection('models'), 'model');

  return models
    .filter(({ data }) => data.featured)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .slice(0, limit);
}

type RelatableEntry = {
  id: string;
  data: {
    tags: string[];
    category?: string;
    modelType?: string;
    title: string;
  };
};

export function getRelatedEntries<T extends RelatableEntry>(
  current: T,
  entries: T[],
  limit = 2,
): T[] {
  const currentGroup = current.data.category ?? current.data.modelType;

  return entries
    .filter(({ id }) => id !== current.id)
    .map((entry) => {
      const sharedTags = entry.data.tags.filter((tag) => current.data.tags.includes(tag)).length;
      const entryGroup = entry.data.category ?? entry.data.modelType;
      const sameGroup = Boolean(currentGroup && entryGroup === currentGroup);

      return { entry, score: sharedTags * 2 + Number(sameGroup) };
    })
    .sort((a, b) => b.score - a.score || a.entry.data.title.localeCompare(b.entry.data.title))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
