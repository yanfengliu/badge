export interface ManufacturedFixtureArtRecord {
  id: string;
  sourceFileName: string;
  sourceByteLength: number;
  sourceSha256: string;
  normalizedSizePixels: number;
  generation: {
    candidateKey: string;
    provider: "OpenAI image generation";
    mode: "composition-preserving image edit";
    generatedAt: "2026-08-25";
    promptWorkflow: { id: "fixture-image-edit-manual"; revision: 1 };
    manufacturingContract: { id: "small-badge-face"; revision: 1 };
    exactPrompt: string;
    promptSha256: string;
    inputReferenceSha256: string;
    generatedMasterSha256: string;
    rightsProvenance: string;
    priorEdits?: readonly {
      purpose: string;
      exactPrompt: string;
      promptSha256: string;
      inputReferenceSha256: string;
      generatedMasterSha256: string;
    }[];
  };
  normalization: {
    script: "scripts/normalize-generated-fixture-art.mjs";
    sizePixels: 896;
    quality: 78;
  };
  manufacturingReview: {
    process: string;
    primaryForms: number;
    supportingAccents: number;
    colorFamilies: number;
    processLineFloorMillimeters: number;
    localizedFeatureProbes?: readonly {
      label: string;
      role: "process-construction-line" | "recognition-critical-form";
      axis: "x" | "y";
      fixedPixel: number;
      centerPixel: number;
      channelRanges: readonly [
        readonly [number, number],
        readonly [number, number],
        readonly [number, number],
      ];
      measuredRunPixels: number;
      minimumMillimeters: number;
    }[];
  };
  thumbnailProof: {
    sizePixels: number;
    rawRgbaSha256: string;
    miniatureResidual: number;
  };
}

export const manufacturedFixtureArtProfile = {
  promptRecipe: { id: "badge-source-art", revision: 2 },
  manufacturingProfile: { id: "small-badge-face", revision: 1 },
  referenceWidthMillimeters: 32,
  primaryForms: { minimum: 3, maximum: 5 },
  supportingAccentsMaximum: 3,
  colorFamiliesMaximum: 6,
  minimumRecognitionFeatureMillimeters: 1,
  minimumRecognitionFeaturePercentOfWidth: 3.125,
  minimumNegativeGapMillimeters: 0.8,
  minimumNegativeGapPercentOfWidth: 2.5,
  thumbnailProofPixels: 48,
  miniatureResidualMaximum: 0.045,
  proofResize: "bilinear-center-sample-round",
  reviewQualification:
    "Appearance-screened source art; a production vendor must still preflight and adapt final vector, mold, print, inlay, or stitch files.",
} as const;

const generationDefaults = {
  provider: "OpenAI image generation",
  mode: "composition-preserving image edit",
  generatedAt: "2026-08-25",
  promptWorkflow: { id: "fixture-image-edit-manual", revision: 1 },
  manufacturingContract: { id: "small-badge-face", revision: 1 },
  rightsProvenance:
    "Original AI-generated fixture artwork produced for Badge from an earlier original generated draft; no third-party artwork or trademark was supplied as a reference.",
} as const;

const normalization = {
  script: "scripts/normalize-generated-fixture-art.mjs",
  sizePixels: 896,
  quality: 78,
} as const;

export const manufacturedFixtureArt = [
  {
    id: "yosemite-literal-cloisonne-v2",
    sourceFileName: "yosemite-literal-manufactured-v2.webp",
    sourceByteLength: 21_064,
    sourceSha256: "ca4a1fade0aea9340114978c27c9df8e838568015bcc81e3f0dc02c52e22f907",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "candidate-literal",
      exactPrompt:
        "Edit the referenced Yosemite source artwork into a newly rendered production master while preserving its composition: one monumental El Capitan silhouette, one turquoise river band, one dark forest mass with only two or three tree tips, one gold sun, and one distant mountain. Use a flat stained-glass and cloisonne face language with broad color cells and sturdy dark joins. This is for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every line, join, and isolated mark must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No gradients used to simulate detail, microtexture, hairlines, hatching, scattered specks, tiny foliage, tiny figures, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
      promptSha256: "942dc8255b95605341578b557619eef269092f4b934c93fb8dee7da55ca1e27d",
      inputReferenceSha256: "949d7027d3bb6e3bc82c4000e7308749ead92e9b125b3d3e9899cedadfd48c00",
      generatedMasterSha256: "6d7be84f52a121f132e352560b30dc44aaf490bc2c526aec4f5369b50923ff4a",
    },
    normalization,
    manufacturingReview: {
      process: "stained-glass cloisonne cells",
      primaryForms: 5,
      supportingAccents: 2,
      colorFamilies: 6,
      processLineFloorMillimeters: 0.35,
      localizedFeatureProbes: [
        {
          label: "narrow upper-cliff cloisonne join",
          role: "process-construction-line",
          axis: "x",
          fixedPixel: 100,
          centerPixel: 414,
          channelRanges: [
            [0, 90],
            [0, 90],
            [0, 90],
          ],
          measuredRunPixels: 11,
          minimumMillimeters: 0.35,
        },
      ],
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "80e30c72609b90b61f32befc7bf7193f77de7cb2bd0684cc78a514c674b6302b",
      miniatureResidual: 0.026792937226974123,
    },
  },
  {
    id: "yosemite-symbolic-underglaze-v2",
    sourceFileName: "yosemite-symbolic-manufactured-v2.webp",
    sourceByteLength: 18_592,
    sourceSha256: "8dfb334b62e82cfe462e8544bc537e7a65f75c78c4b6ae9a748c56f6f9edfe32",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "candidate-symbolic",
      exactPrompt:
        "Edit the referenced Yosemite source artwork into a newly rendered production master while preserving its symbolic portal composition: one massive granite arch, one small Half Dome silhouette, one turquoise river, one gold sun, and two broad mineral ground fields. Use flat ceramic-underglaze color fields with softly handmade but production-sized edges. This is for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every isolated mark and color boundary must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No glaze speckles, gradients used to simulate detail, microtexture, hairlines, hatching, tiny objects, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
      promptSha256: "95e97ec42b40aced020667f205ee35c9c07918298c4f24955ab51fb133c52674",
      inputReferenceSha256: "7d3cc629e0db8d9acc6d11ef3be66412ce6c4964c2f31faef0480b9611b15f11",
      generatedMasterSha256: "3d1f5bfc00c242901d21f1d3c499afa46bc368aad44e6433c8415a52a7eb27e2",
    },
    normalization,
    manufacturingReview: {
      process: "underglaze ceramic color fields",
      primaryForms: 5,
      supportingAccents: 1,
      colorFamilies: 6,
      processLineFloorMillimeters: 0.5,
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "daa621e52bfc956b12e3e397f9cd824cabf3ecd8bf40a9a930444669740bfe03",
      miniatureResidual: 0.019462622288498734,
    },
  },
  {
    id: "yosemite-topographic-relief-print-v2",
    sourceFileName: "yosemite-topographic-manufactured-v2.webp",
    sourceByteLength: 17_072,
    sourceSha256: "86572d56789350193e161ada5560842b793b6ea35d2d0259b1c78ebb698a1218",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "candidate-topographic",
      exactPrompt:
        "Edit the referenced Yosemite source artwork into a newly rendered production master while preserving its abstract route composition: one dark granite mountain mass, one nested set of five broad terrain bands treated as a single field, one turquoise river, and one rust trail accent. Use a flat relief-print and spot-color screenprint language with broad carved separations. This is for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every route, separation, and isolated mark must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No dense contour lines, grain fields, gradients used to simulate detail, microtexture, hairlines, hatching, stipple, tiny scenery, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
      promptSha256: "16f1cfcd8935a94aa198580d347e957206e0c5cb055bfdbeb763afac3332ee5c",
      inputReferenceSha256: "67eb40486c3e0d53d2040c86856149bb4837d0a8c687a5112c02627f67f7eefa",
      generatedMasterSha256: "241dcd906eab8b6ec1f957c43805d12775e4d0815bcd2ef8e9569f2d31a9808e",
    },
    normalization,
    manufacturingReview: {
      process: "spot-color relief print",
      primaryForms: 4,
      supportingAccents: 2,
      colorFamilies: 5,
      processLineFloorMillimeters: 0.3,
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "b80009d1fa04a930a74bbff74048671544bb80d3cbef696d841be8b56af839b7",
      miniatureResidual: 0.021840692657271243,
    },
  },
  {
    id: "sapiens-embroidered-v2",
    sourceFileName: "sapiens-embroidered-v2.webp",
    sourceByteLength: 19_278,
    sourceSha256: "61b54e073ae0ac972038a88268a876372aadf38c0e0de54f429e52faba3c350c",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "archive-read-sapiens",
      exactPrompt:
        "Correction pass on this exact artwork. Preserve all geometry and positions exactly, including four nested profiles, the one large rayless sun disk, rust land, teal field, and gold path. Remove every gradient, glow, vignette, highlight, shadow, color variation, and texture. Each bounded region must be filled with one perfectly uniform solid color from edge to edge, like clean vector color blocking: cream background, dark navy profile, light cream profile, gold profile and path and sun, rust profile and land, teal field. The large sun must remain a single perfectly solid circle with no rays or surrounding marks. Keep clean antialiased boundaries only. Do not add or remove any shapes. No material simulation, fibers, stitches, grain, relief, words, frame, border, finished badge, or mockup. Output only the corrected flat square source artwork.",
      promptSha256: "2a7d339e454f75c7f0f73241f45729c468589ec9ce4ec7594bd39fad1aceece7",
      inputReferenceSha256: "8348fdbc1ef44178bcdf54f10157bd401c2f228f2cb6d2af2e95fece60ba946a",
      generatedMasterSha256: "23ef1830cbd7d2f0f9c14c0c70b552c4eb32a799e84e695e6c79401e6d418127",
      priorEdits: [
        {
          purpose: "remove rendered textile texture while retaining applique-like fields",
          exactPrompt:
            "Correction pass on the referenced Sapiens artwork. Preserve exactly four large nested human profiles, one continuous gold path, one sun symbol, one broad teal field, and one broad rust field. Remove every rendered textile and material effect: no canvas grain, fabric grain, individual threads, stitches, fibers, relief, embossing, shadows, highlights, or gradients. Convert every region to a perfectly uniform solid-color, vector-like shape with only clean antialiased edges. Convey embroidery only through bold applique-like silhouettes and color blocking; the physical fiber texture will be added later by the 3D badge renderer. This is flat source artwork for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every boundary and isolated mark must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No tiny people, cities, book pages, microtexture, hairlines, hatching, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
          promptSha256: "842afc67e468d06f5eb4beafcc3fd5fa4e17a2d3739c11b117ed4cef60eeb7c8",
          inputReferenceSha256: "9cea2822659f50abeab8c603db510cf25134296b3879ce5004da35283b0d5eaf",
          generatedMasterSha256: "a93150e6af6374848dbbd5d7a80980379eea91af8f2ad47371c768ed6ab517fc",
        },
        {
          purpose: "replace undersized sun rays with one large rayless disk",
          exactPrompt:
            "Edit the referenced flat Sapiens badge-face source artwork with one surgical correction. Preserve the exact square full-bleed composition, the four large nested human profiles, the continuous gold path, the broad teal field, the broad rust field, all silhouette proportions, and the existing uniform solid-color palette. Remove every small sun ray completely. Replace the entire sun-and-rays cluster with one single, slightly larger, perfectly solid golden circular sun disk in the same upper-right location, with generous empty space around it. The sun disk must be at least 12% of the image width and must have no rays, outline, texture, gradient, shadow, highlight, or small satellite marks. Keep every region perfectly uniform and vector-like with clean antialiased edges. No canvas grain, fabric grain, individual threads, stitches, fibers, relief, embossing, shadows, highlights, gradients, microtexture, hairlines, hatching, words, letters, numerals, signatures, logos, frame, rim, border, finished badge, pin, patch, coin, mockup, or presentation background. Output only the corrected flat face artwork.",
          promptSha256: "7248c3709a9b3a20acd85251f3c12c0fe8bdb42f7ca33d5e0638dec46e8ee062",
          inputReferenceSha256: "625175f1c4fe0b507a46c0fc7b24c4bf5a834a4fd3d8f4c51cb0669c4e50bf52",
          generatedMasterSha256: "8348fdbc1ef44178bcdf54f10157bd401c2f228f2cb6d2af2e95fece60ba946a",
        },
      ],
    },
    normalization,
    manufacturingReview: {
      process: "embroidered and woven fields",
      primaryForms: 5,
      supportingAccents: 1,
      colorFamilies: 6,
      processLineFloorMillimeters: 1.25,
      localizedFeatureProbes: [
        {
          label: "rayless embroidered sun disk",
          role: "recognition-critical-form",
          axis: "x",
          fixedPixel: 150,
          centerPixel: 760,
          channelRanges: [
            [190, 255],
            [90, 190],
            [0, 80],
          ],
          measuredRunPixels: 143,
          minimumMillimeters: 1.25,
        },
      ],
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "963e0508de097556a060959a30fd48900ee476070a95c4ec181c98e28ab78c70",
      miniatureResidual: 0.02314630604846105,
    },
  },
  {
    id: "bachelors-degree-marquetry-v2",
    sourceFileName: "bachelors-degree-marquetry-v2.webp",
    sourceByteLength: 8_236,
    sourceSha256: "c6e9428ce2bc922076c10b9a6d3134725cde4990ebf1e92c2fbfd47bd9f02e10",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "archive-finished-bachelors-degree",
      exactPrompt:
        "Correction pass on the referenced bachelor's-degree artwork. Preserve one monumental three-step staircase, one open doorway, one gold sun, and two broad fitted side planes. Remove every simulated material and lighting effect: no wood grain, reflections, shadows, highlights, bevels, depth shading, or gradients. Convert every region to a perfectly uniform solid-color, vector-like fitted-inlay shape with only clean antialiased edges. Convey marquetry only through large precisely fitted color fields; physical wood response will be added later by the 3D badge renderer. This is flat source artwork for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every step, boundary, and isolated mark must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No graduation cap, diploma, tiny scenery, microtexture, hairlines, hatching, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
      promptSha256: "0f1e20825633e74913b1738f95ce5569193416ea36c77352e525f6fad47ccccc",
      inputReferenceSha256: "2f99b6bbb27092ac4a6d213f87f4490e1271a9e1ff7e665a53dee3ccd463de7d",
      generatedMasterSha256: "3a0b736d0c9a15cc9fc618d1880a880fd915dd9f88a028eeb3d5684c0835a722",
    },
    normalization,
    manufacturingReview: {
      process: "wood marquetry fitted inlay",
      primaryForms: 5,
      supportingAccents: 1,
      colorFamilies: 5,
      processLineFloorMillimeters: 0.8,
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "cd48c44774d8d915c0ca8fd07e7e38b0037ed265d1fffddf45ee1a062b91f0d3",
      miniatureResidual: 0.026570025796777044,
    },
  },
  {
    id: "all-parks-die-cut-inlay-v2",
    sourceFileName: "all-parks-cut-paper-v2.webp",
    sourceByteLength: 29_356,
    sourceSha256: "f2d99a4f40c2c6f028de2c24af422413bba3ac597468d04437156e2fada4cba8",
    normalizedSizePixels: 896,
    generation: {
      ...generationDefaults,
      candidateKey: "archive-visited-all-us-national-parks",
      exactPrompt:
        "Correction pass on the referenced every-national-park artwork. Preserve one redwood silhouette, one mountain, one desert arch, one ocean wave, one gold sun, and one continuous trail. Remove the circular white framing and extend the composition to all four edges of the square. Remove every simulated paper and lighting effect: no paper grain, drop shadows, highlights, bevels, layered depth shading, or gradients. Convert every region to a perfectly uniform solid-color, vector-like die-cut shape with only clean antialiased edges. Convey paper inlay only through broad nested silhouettes and sturdy bridges; physical paper response will be added later by the 3D badge renderer. This is flat source artwork for a 32 mm collectible badge face and must remain instantly legible at 48 x 48 pixels. Use 3 to 5 primary forms, no more than 3 supporting accents, and no more than 6 color families. Every bridge, cut edge, boundary, and isolated mark must be at least 3.125 percent of the image width, and every essential gap at least 2.5 percent. Square, full-bleed, centered, no frame. No collage of miniature landmarks, tiny trees, tiny animals, microtexture, hairlines, hatching, words, letters, numerals, signatures, or logos. Do not depict a finished badge, pin, patch, coin, rim, border, bevel, thickness, clasp, cast shadow, pedestal, mockup, or presentation background. Output only the flat face artwork.",
      promptSha256: "31f25d7effa0cd3e7728a980dcd8efd137b2549ace198940a0e6dccde821557f",
      inputReferenceSha256: "5634a4b226dbca37d472016717f450382b4e7f31c408b3f690af32a0372074bf",
      generatedMasterSha256: "781b971cc8e8f9696164c7193a8cc5ec0a9aa3f1d40a4780e77698f6e40f1a4d",
    },
    normalization,
    manufacturingReview: {
      process: "die-cut layered inlay",
      primaryForms: 5,
      supportingAccents: 3,
      colorFamilies: 6,
      processLineFloorMillimeters: 0.8,
    },
    thumbnailProof: {
      sizePixels: 48,
      rawRgbaSha256: "c8ffe335e6b906cd61d00925aba5cdb1d1cba98729ed352edfe20a2ccf8545db",
      miniatureResidual: 0.035489343849518976,
    },
  },
] as const satisfies readonly ManufacturedFixtureArtRecord[];
