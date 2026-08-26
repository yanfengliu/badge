import { newYorkCityMichelinRestaurantInputs03a } from "./michelin-restaurants-nyc-03a";
import { newYorkCityMichelinRestaurantInputs03b } from "./michelin-restaurants-nyc-03b";
import { defineMichelinRestaurantNycSeed } from "./michelin-restaurants-nyc-types";
import type { MichelinRestaurantNycInput } from "./michelin-restaurants-nyc-types";

const inputs = [
  ...newYorkCityMichelinRestaurantInputs03a,
  ...newYorkCityMichelinRestaurantInputs03b,
] satisfies readonly MichelinRestaurantNycInput[];

export const newYorkCityMichelinRestaurantSeeds03 = inputs.map(defineMichelinRestaurantNycSeed);
