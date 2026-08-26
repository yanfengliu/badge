# Michelin inventory provenance

The named dining catalogue is pinned to a normalized research snapshot revised on 2026-08-26, not to a test-local expected-name array.

The snapshot records the official result order, restaurant name, distinction count, individual-listing locality, individual Guide URL, and the exact result-page URL that exposed each record.

The Bay Area scope follows the Metropolitan Transportation Commission's official nine-county boundary: Alameda, Contra Costa, Marin, Napa, San Francisco, San Mateo, Santa Clara, Solano, and Sonoma.

The official San Francisco result page displayed `San Francisco, California, USA and surroundings: 1-29 of 29 restaurants` with 4 three-star, 7 two-star, and 18 one-star results; checking both statewide California pages against the nine-county boundary identified 12 additional current starred entries absent from that regional result, producing a complete 41-entry Bay Area inventory with 7 three-star, 7 two-star, and 27 one-star restaurants.

The official California result pages displayed `California : 1-48 of 83 restaurants` and `California : 49-83 of 83 restaurants` with 10 three-star, 13 two-star, and 60 one-star results statewide; seven Bay Area additions occur on page 1 and five on page 2.

The official New York result pages displayed `New York City, USA and surroundings: 1-48 of 69 restaurants` and `New York City, USA and surroundings: 49-69 of 69 restaurants` with 5 three-star, 14 two-star, and 50 one-star results.

The official District of Columbia result page displayed `District of Columbia : 1-22 of 22 restaurants` with 3 two-star and 19 one-star results.

The six Guide source pages are [San Francisco and surroundings](https://guide.michelin.com/us/en/california/san-francisco/restaurants/all-starred), [California page 1](https://guide.michelin.com/us/en/california/restaurants/all-starred), [California page 2](https://guide.michelin.com/us/en/california/restaurants/all-starred/page/2), [New York page 1](https://guide.michelin.com/en/us/new-york-state/new-york/restaurants/all-starred), [New York page 2](https://guide.michelin.com/us/en/new-york-state/new-york/restaurants/all-starred/page/2), and [Washington, DC and surroundings](https://guide.michelin.com/us/en/district-of-columbia/restaurants/all-starred); the geographic authority is [MTC's nine-county Bay Area definition](https://www.mtc.ca.gov/about-mtc/what-mtc).

The normalized records live in `packages/catalogue-authoring/src/michelin-inventory-snapshot-*.ts`; the manifest, page observations, boundary ledger, and checked date live in `packages/catalogue-authoring/src/michelin-inventory-snapshot.ts`.

`michelin-inventory-snapshot.test.ts` checks the ledger digest, the six page ranges, distinction counters, page membership of 29/7/5/48/21/22, all 132 unique individual URLs, the exact nine-county boundary, and exact parity with the production roster across order, name, stars, locality, individual URL, and source listing URL.

On 2026-08-26 a record-by-record concrete-source audit covered all 132 production seeds and rejected placeholder-level research: every restaurant retains an individualized interior, dish, or culture cue and broad manufacturable forms grounded in a named dish or ingredient, documented technique or cultural practice, named chef, or distinctive interior feature rather than generic mood or category prose alone.

The reviewed research-source rows bind each slug to its cuisine, cue type, evidence cue, primary forms, individual Guide URL, and evidence-source URLs; their SHA-256 is `79fbbd8c572a0d46837f5c43f686ab9311eb75f6a8b27b49989437ca4e04243e`, independently detecting drift in the content and source associations that the inventory-only digest does not cover.

Nine explicit concrete controls bind Benu to `whole roasted quail` and its [individual Guide listing](https://guide.michelin.com/us/en/california/san-francisco/restaurant/benu), Nisei to `omurice` and an [accessible Guide locale](https://guide.michelin.com/ca/en/california/san-francisco/restaurant/nisei), Lazy Bear to `gooseberry mignonette` and an [accessible Guide locale](https://guide.michelin.com/ae-du/en/california/san-francisco/restaurant/lazy-bear), Wolfsbane to `Dungeness crab` and an [accessible Guide locale](https://guide.michelin.com/gb/en/california/san-francisco/restaurant/wolfsbane), YingTao to `Berkshire-pork-and-tiger-prawn wontons` and its [individual Guide listing](https://guide.michelin.com/us/en/new-york-state/new-york/restaurant/yingtao), Café Boulud to `black sea bass wrapped in crispy potato` and its [official dinner menu](https://www.cafeboulud.com/nyc/our-menu/dinner/), Essential by Christophe to `three blue prawns` and its [official menu](https://www.essentialbychristophe.com/menus/), Muku to `Yamagata soba` and its [official menu](https://www.restaurantmuku.nyc/menu), and Jungsik New York to `striped jack with white kimchi` and its [official menu](https://www.jungsik.com/menu/).

The research-source gate also requires exactly 132 unique slugs, each individual Guide URL to remain in that record's HTTPS evidence ledger, every cue to remain at least 60 characters, and every record to retain at least three primary forms before checking the reviewed digest and the nine concrete cue/source pairs.

The ordinary gate is deliberately offline because Michelin may reject scripted requests and a transient network response must not make a catalogue build nondeterministic.

To refresh, browse all six official result pages, follow every included result to its current individual listing, check the California results against the official nine-county boundary, and transcribe a new dated normalized ledger without deriving it from the production seed files.

Then update the source-page observations and checked date, review the ledger diff as source evidence, replace the reviewed SHA-256 only after that review, and run `npx vitest run packages/catalogue-authoring/src/michelin-inventory-snapshot.test.ts packages/catalogue-authoring/src/michelin-restaurants-bay-area.test.ts packages/catalogue-authoring/src/michelin-restaurants-nyc.test.ts packages/catalogue-authoring/src/michelin-restaurants-dc.test.ts`.
