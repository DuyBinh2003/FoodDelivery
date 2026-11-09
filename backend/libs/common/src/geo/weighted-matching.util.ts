/**
 * @file weighted-matching.util.ts
 * @description Ranks driver candidates based on multi-factor weighted scoring (Distance, Acceptance Rate, Batch Load).
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

export interface DriverCandidateMetrics {
  driverId: string;
  distanceKm: number;
  acceptanceRate?: number; // 0.0 to 1.0 (default: 0.9)
  activeTrips?: number; // current assigned active trips (default: 0)
  rating?: number; // 1.0 to 5.0 (default: 4.8)
}

export interface RankedDriverCandidate extends DriverCandidateMetrics {
  score: number;
}

export interface MatchingWeights {
  distanceWeight?: number; // Default: 0.5
  acceptanceWeight?: number; // Default: 0.3
  loadWeight?: number; // Default: 0.2
}

/**
 * Calculates candidate priority score.
 * Lower score = higher priority for assignment.
 * Formula:
 * Score = (distanceKm * wDist) + ((1 - acceptanceRate) * 10 * wAcc) + (activeTrips * 3 * wLoad)
 */
export function calculateCandidateScore(
  candidate: DriverCandidateMetrics,
  weights?: MatchingWeights,
): number {
  const wDist = weights?.distanceWeight ?? 0.5;
  const wAcc = weights?.acceptanceWeight ?? 0.3;
  const wLoad = weights?.loadWeight ?? 0.2;

  const acceptanceRate = candidate.acceptanceRate ?? 0.9;
  const clampedAcceptance = Math.min(Math.max(acceptanceRate, 0), 1);
  const activeTrips = Math.max(candidate.activeTrips ?? 0, 0);

  const distanceComponent = candidate.distanceKm * wDist;
  const acceptancePenaltyComponent = (1 - clampedAcceptance) * 10 * wAcc;
  const loadPenaltyComponent = activeTrips * 3 * wLoad;

  const rawScore = distanceComponent + acceptancePenaltyComponent + loadPenaltyComponent;
  return Math.round(rawScore * 1000) / 1000;
}

/**
 * Ranks driver candidates ascending by calculated score (best candidate first).
 */
export function rankCandidatesByWeightedScore(
  candidates: DriverCandidateMetrics[],
  weights?: MatchingWeights,
): RankedDriverCandidate[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: calculateCandidateScore(candidate, weights),
    }))
    .sort((a, b) => a.score - b.score);
}
