import type { ArchiveState } from "@badge/archive-domain";
import {
  formatSayingForArchive,
  resolveSayingModelResponse,
  type HistoricalQuotation,
  type SayingRequest,
  type SayingResponse,
} from "@badge/saying-contract";

export const sourceCheckedQuotation = {
  id: "john-muir-yosemite-temple-1868",
  text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  person: "John Muir",
  sourceTitle: "Letters to a Friend, July 26, 1868",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
} as const satisfies HistoricalQuotation;

export const alternateSourceCheckedQuotation = {
  id: "john-muir-mountains-calling-1873",
  text: "The mountains are calling and I must go.",
  person: "John Muir",
  sourceTitle: "Letter to Sarah Muir Galloway, September 3, 1873",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
} as const satisfies HistoricalQuotation;

export const historicalQuotationRequest = {
  title: "Visited Yosemite National Park",
  criterion: "Visit Yosemite National Park honestly.",
  allowedQuotations: [sourceCheckedQuotation, alternateSourceCheckedQuotation],
} as const satisfies SayingRequest;

export function quotationResponse(quotation: HistoricalQuotation = sourceCheckedQuotation): SayingResponse {
  return resolveSayingModelResponse(
    { quotationId: quotation.id },
    {
      title: "Yosemite",
      criterion: "Visit Yosemite National Park",
      allowedQuotations: [quotation],
    },
  );
}

export const sourceCheckedResponse = quotationResponse();
export const alternateSourceCheckedResponse = quotationResponse(alternateSourceCheckedQuotation);
export const sourceCheckedSaying = formatSayingForArchive(sourceCheckedResponse);
export const alternateSourceCheckedSaying = formatSayingForArchive(alternateSourceCheckedResponse);

export function withAcceptedQuotation(
  state: ArchiveState,
  response: SayingResponse = sourceCheckedResponse,
): ArchiveState {
  const acceptedSaying = formatSayingForArchive(response);
  return {
    ...state,
    records: state.records.map((record) => ({ ...record, acceptedSaying })),
  };
}
