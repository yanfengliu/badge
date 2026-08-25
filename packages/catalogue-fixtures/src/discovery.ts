import { discoveryParksAThroughG } from "./discovery-parks-a-g.js";
import { discoveryParksHThroughM } from "./discovery-parks-h-m.js";
import { discoveryParksNThroughZ } from "./discovery-parks-n-z.js";
import { availableDiscoveryBadges } from "./discovery-starters.js";
import type { DiscoveryBadge } from "./discovery-types.js";

export { discoverySets } from "./discovery-sets.js";
export type { DiscoverySet } from "./discovery-sets.js";

export const discoveryBadges: readonly DiscoveryBadge[] = [
  ...availableDiscoveryBadges,
  ...discoveryParksAThroughG,
  ...discoveryParksHThroughM,
  ...discoveryParksNThroughZ,
];

export type {
  AvailableDiscoveryBadge,
  DiscoveryBadge,
  SourceStudyDiscoveryBadge,
} from "./discovery-types.js";
