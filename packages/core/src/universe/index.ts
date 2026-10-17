export { ELIGIBILITY_V1, configHash, evaluateEligibility } from './eligibility';
export type {
  EligibilityConfig,
  EligibilityResult,
  InstrumentFacts,
  RuleId,
  RuleResult,
} from './eligibility';
export { BUCKET_RULES_V1, assignBucket, bucketRulesHash, lowestFraction } from './buckets';
export type { BucketInputs, BucketResult, BucketRules } from './buckets';
export { annualisedVolatility, beta, simpleReturns } from './riskMetrics';
