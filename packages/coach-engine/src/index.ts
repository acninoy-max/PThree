export {
  effectiveLoad,
  hasLoad,
  estimateOneRepMax,
  bestSet,
  totalVolume,
  patternHistory,
  comparableScores,
  beatsBest,
  markBefore,
} from "./metrics";
export type {
  PatternPoint,
  LoadedSet,
  AttemptSet,
  BestMark,
  BeatsBest,
} from "./metrics";

export {
  sessionVolume,
  dayVolumeHistory,
  volumeByDay,
  compareToPrevious,
} from "./volume";
export type { VolumePoint, VolumeChange } from "./volume";

export {
  loggedExercises,
  exerciseHistory,
  comparableExercisePoints,
  defaultExerciseSelection,
  exerciseTrend,
  exerciseValue,
  exerciseChange,
} from "./exercise-history";
export type {
  ExercisePoint,
  LoggedExercise,
  ExerciseMetric,
  ExerciseChange,
  ExerciseValuePoint,
} from "./exercise-history";

export {
  analyseClient,
  buildCoachFeed,
  detectPlateaus,
  detectInactivity,
  detectProgress,
  DEFAULT_CONFIG,
} from "./insights";
export type {
  Insight,
  InsightFacts,
  InsightKind,
  InsightSeverity,
  EngineConfig,
  ClientWithSessions,
} from "./insights";
