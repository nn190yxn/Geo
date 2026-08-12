import type { Competitor, CompetitorCandidate } from '@geo-platform/shared-types';

export function getConfirmedCompetitorNames(competitors: Competitor[], candidates: CompetitorCandidate[]): Set<string> {
  return new Set([
    ...competitors.flatMap((competitor) => [competitor.name, ...competitor.aliases]),
    ...candidates
      .filter((candidate) => candidate.lifecycleStatus === 'sample_confirmed' || candidate.lifecycleStatus === 'user_confirmed')
      .map((candidate) => candidate.name)
  ].map(normalizeCompetitorName).filter(Boolean));
}

export function isConfirmedCompetitorName(name: string, confirmedNames: Set<string>): boolean {
  return confirmedNames.has(normalizeCompetitorName(name));
}

export function normalizeCompetitorName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}
