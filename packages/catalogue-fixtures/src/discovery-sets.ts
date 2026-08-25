export interface DiscoverySet {
  readonly setId: string;
  readonly title: string;
  readonly description: string;
}

export const discoverySets = [
  {
    setId: "us-national-parks",
    title: "U.S. National Parks",
    description: "Individual parks and the larger journey across the national park catalogue.",
  },
  {
    setId: "us-states",
    title: "U.S. States",
    description: "A visual field record for visiting every one of the fifty states.",
  },
  {
    setId: "books-read",
    title: "Books Read",
    description: "Finished books kept as cultural memories.",
  },
  {
    setId: "life-milestones",
    title: "Life Milestones",
    description: "Education and life chapters worth remembering.",
  },
] as const satisfies readonly DiscoverySet[];

export function requireDiscoverySet(setId: string): DiscoverySet {
  const set = discoverySets.find((candidate) => candidate.setId === setId);
  if (!set) {
    throw new Error(
      `Discovery set ${setId} is not registered; add a safe display-only set before projecting its badges.`,
    );
  }
  return set;
}
