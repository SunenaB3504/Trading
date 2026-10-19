export { logGamma, regIncBeta, studentTTwoSidedP } from './distributions';
export {
  aggregateByDate,
  dateDifferences,
  embargoMask,
  makePanel,
  pooledDifference,
} from './panel';
export type { DateAggregates, Panel } from './panel';
export { autocorrelation, effectiveSampleSize, onReturnSeries } from './ess';
export type { EssResult } from './ess';
export { nonOverlappingTest, tTestOfMean, welchTest } from './nonOverlap';
export type { NonOverlapResult } from './nonOverlap';
export { blockMeansTest } from './blockMeans';
export type { BlockMeansResult } from './blockMeans';
export { jointBlockBootstrap } from './bootstrapDiff';
export type { JointBootstrap, JointBootstrapOptions } from './bootstrapDiff';
export { allowedShiftList, shiftedPlacebo } from './placebo';
export type { PlaceboOptions, PlaceboResult } from './placebo';
export { estimatePower, findMde, isSharedSignal, plantEffect } from './positiveControl';
export type { MdeOptions, MdeResult, PowerOptions } from './positiveControl';
export { benjaminiHochberg, benjaminiYekutieli } from './multiplicity';
export type { MultiplicityResult } from './multiplicity';
export { verdictOf } from './verdict';
export type { Verdict, VerdictInput } from './verdict';
export { evaluateRule } from './evaluate';
export type { EvalConfig, EvaluationReport } from './evaluate';
export { syntheticPanel } from './synthetic';
export type { SyntheticOptions } from './synthetic';
export {
  EMPTY_REGISTRY,
  RegistryError,
  canRun,
  freeze,
  preRegister,
  specHashOf,
  verifyRegistry,
} from './registry';
export type {
  AnchorProof,
  HypothesisSpec,
  ParamValue,
  Registration,
  Registry,
  RunCheck,
  TimeAnchorer,
  Variant,
} from './registry';
export { logVariant, multiplicityCount } from './variantLog';
export type { MultiplicityCount, VariantInput } from './variantLog';
export {
  baselineArm,
  calendarControlArm,
  matchedRandomArm,
  overlayRun,
  shuffledEphemerisArm,
  summarise,
} from './arms';
export type {
  ArmGrid,
  ArmSummary,
  CalendarControlResult,
  MatchedRandomResult,
  OverlayRun,
} from './arms';
export { drawBirth, syntheticBuyerNull } from './syntheticBuyers';
export type { BirthDraw, BirthRange, SyntheticBuyerResult } from './syntheticBuyers';
