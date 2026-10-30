import { MicroPlanningData, MicroTimelineDay, MicroJob, MicroDailyRow } from './microPlanningTypes';
import rawData from './extractedMicroPlanning.json';

export const INITIAL_MICRO_TIMELINE_DAYS: MicroTimelineDay[] = rawData.timelineDays as MicroTimelineDay[];
export const INITIAL_MICRO_JOBS: MicroJob[] = rawData.jobs as MicroJob[];
export const INITIAL_MICRO_DAILY_TRACKING: Record<string, MicroDailyRow[]> = rawData.dailyTracking as Record<string, MicroDailyRow[]>;

export const INITIAL_MICRO_PLANNING_DATA: MicroPlanningData = {
  timelineDays: INITIAL_MICRO_TIMELINE_DAYS,
  jobs: INITIAL_MICRO_JOBS,
  dailyTracking: INITIAL_MICRO_DAILY_TRACKING,
  currentDateKey: rawData.currentDateKey || '12-10',
  currentColIdx: rawData.currentColIdx || 267, // 12-10
};
