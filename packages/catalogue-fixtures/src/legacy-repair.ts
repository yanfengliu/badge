export interface LegacyStarterRepairSource {
  readonly recordId: string;
  readonly title: string;
  readonly sourceAssetHash: string;
  readonly sourceUrl: string;
}

export const legacyStarterRepairSources = [
  {
    recordId: "starter:visited-yosemite",
    title: "Yosemite alpha.3 memory",
    sourceAssetHash: "21173941d3ad44ff0f245dcef0f1bbf2606b39163442afcc24777d442dda2ece",
    sourceUrl: "/legacy-alpha3-yosemite-literal.png",
  },
  {
    recordId: "starter:read-sapiens",
    title: "Read Sapiens alpha.3 memory",
    sourceAssetHash: "296c08b967b50dfbefdb8c8187f48943c11b3d3976d4d724fd248be335431729",
    sourceUrl: "/legacy-alpha3-sapiens.png",
  },
  {
    recordId: "starter:finished-bachelors-degree",
    title: "Bachelor's degree alpha.3 memory",
    sourceAssetHash: "2af87c6a64740642f85ae37bc702a206c8c817531acb9d5aaf44269c5369a737",
    sourceUrl: "/legacy-alpha3-bachelors-degree.png",
  },
  {
    recordId: "starter:visited-all-us-national-parks",
    title: "Every national park alpha.3 memory",
    sourceAssetHash: "0b2ec88a2ee72eb85de9525020bfdc419fada5f1dfc6a6ea381df3ff32fa3c6c",
    sourceUrl: "/legacy-alpha3-all-parks.png",
  },
] as const satisfies readonly LegacyStarterRepairSource[];
