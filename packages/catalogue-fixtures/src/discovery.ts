import { discoveryBooks } from "./discovery-books.js";
import { discoveryEducationMilestones } from "./discovery-education-milestones.js";
import { discoveryMichelinDining } from "./discovery-michelin-dining.js";
import { discoveryParksAThroughG } from "./discovery-parks-a-g.js";
import { discoveryParksHThroughM } from "./discovery-parks-h-m.js";
import { discoveryParksNThroughZ } from "./discovery-parks-n-z.js";
import { availableDiscoveryBadges } from "./discovery-starters.js";
import { discoveryUsStates } from "./discovery-us-states.js";
import { discoveryVideoGames } from "./discovery-video-games.js";
import type { DiscoveryBadge } from "./discovery-types.js";

export { discoverySets } from "./discovery-sets.js";
export type { DiscoverySet } from "./discovery-sets.js";

export const discoveryBadges: readonly DiscoveryBadge[] = [
  ...availableDiscoveryBadges,
  ...discoveryParksAThroughG,
  ...discoveryParksHThroughM,
  ...discoveryParksNThroughZ,
  ...discoveryUsStates,
  ...discoveryBooks,
  ...discoveryVideoGames,
  ...discoveryEducationMilestones,
  ...discoveryMichelinDining,
];

export type {
  AvailableDiscoveryBadge,
  DiscoveryBadge,
  SourceStudyDiscoveryBadge,
} from "./discovery-types.js";
