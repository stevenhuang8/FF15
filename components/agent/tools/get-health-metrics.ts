import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Get Health Metrics Tool
 *
 * Retrieves user's health metrics including weight, body fat percentage, and body measurements.
 * Can retrieve latest metrics or historical data within a date range.
 */

export const getHealthMetricsTool = tool({
  description:
    'Get user health metrics including weight, body fat percentage, and body measurements (waist, chest, hips, arms, thighs). ' +
    'Can retrieve the latest entry or historical data for tracking progress. ' +
    'Use this when user asks about their weight, measurements, or wants to see their health metric history.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user whose health metrics to retrieve'),
    mode: z.enum(['latest', 'history', 'trend']).default('latest').describe(
      'Mode: "latest" for most recent entry, "history" for date range, "trend" for weight trend analysis'
    ),
    startDate: z.string().optional().describe('Start date for history mode (YYYY-MM-DD format)'),
    endDate: z.string().optional().describe('End date for history mode (YYYY-MM-DD format)'),
    trendDays: z.number().optional().default(30).describe('Number of days for trend analysis (default: 30)'),
  }),

  execute: async ({ userId, mode, startDate, endDate, trendDays }) => {
    console.log(`📏 Getting health metrics for user: ${userId} (mode: ${mode})`);

    try {
      const supabase = await createClient();

      // Mode: Latest metrics
      if (mode === 'latest') {
        const { data: metrics, error } = await supabase
          .from('health_metrics')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching latest health metrics:', error);
          throw error;
        }

        if (!metrics) {
          console.log('ℹ️  No health metrics found');
          return {
            hasMetrics: false,
            message: 'No health metrics have been logged yet.',
          };
        }

        console.log('✅ Latest health metrics retrieved');
        return {
          hasMetrics: true,
          mode: 'latest',
          metrics: {
            date: metrics.date,
            weight: metrics.weight,
            bodyFatPercentage: metrics.body_fat_percentage,
            measurements: {
              waist: metrics.waist,
              chest: metrics.chest,
              hips: metrics.hips,
              arms: metrics.arms,
              thighs: metrics.thighs,
            },
            notes: metrics.notes,
          },
        };
      }

      // Mode: Historical data
      if (mode === 'history') {
        let query = supabase
          .from('health_metrics')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(100);

        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data: metricsHistory, error } = await query;

        if (error) {
          console.error('❌ Error fetching health metrics history:', error);
          throw error;
        }

        if (!metricsHistory || metricsHistory.length === 0) {
          console.log('ℹ️  No health metrics found in date range');
          return {
            hasMetrics: false,
            message: `No health metrics found${startDate ? ` from ${startDate}` : ''}${endDate ? ` to ${endDate}` : ''}.`,
          };
        }

        console.log(`✅ Retrieved ${metricsHistory.length} health metric entries`);
        return {
          hasMetrics: true,
          mode: 'history',
          count: metricsHistory.length,
          dateRange: {
            start: startDate || metricsHistory[metricsHistory.length - 1].date,
            end: endDate || metricsHistory[0].date,
          },
          metrics: metricsHistory.map((m) => ({
            date: m.date,
            weight: m.weight,
            bodyFatPercentage: m.body_fat_percentage,
            measurements: {
              waist: m.waist,
              chest: m.chest,
              hips: m.hips,
              arms: m.arms,
              thighs: m.thighs,
            },
          })),
        };
      }

      // Mode: Weight trend analysis
      if (mode === 'trend') {
        const daysAgo = trendDays || 30;
        const startDateCalc = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const { data: trendData, error } = await supabase
          .from('health_metrics')
          .select('date, weight')
          .eq('user_id', userId)
          .gte('date', startDateCalc)
          .not('weight', 'is', null)
          .order('date', { ascending: true });

        if (error) {
          console.error('❌ Error fetching weight trend:', error);
          throw error;
        }

        if (!trendData || trendData.length === 0) {
          console.log('ℹ️  No weight trend data available');
          return {
            hasMetrics: false,
            message: `No weight data found for the last ${daysAgo} days.`,
          };
        }

        console.log(`✅ Weight trend retrieved (${trendData.length} data points)`);

        // Calculate trend statistics
        const weights = trendData.map((d) => d.weight).filter((w): w is number => w !== null);
        const startWeight = weights[0];
        const endWeight = weights[weights.length - 1];
        const weightChange = endWeight && startWeight ? endWeight - startWeight : null;
        const avgWeight = weights.length > 0
          ? weights.reduce((sum, w) => sum + w, 0) / weights.length
          : null;

        return {
          hasMetrics: true,
          mode: 'trend',
          trendDays: daysAgo,
          dataPoints: trendData.length,
          trend: trendData,
          analysis: {
            startWeight,
            endWeight,
            weightChange,
            avgWeight: avgWeight ? Math.round(avgWeight * 10) / 10 : null,
            trend: weightChange && weightChange < 0 ? 'decreasing' : weightChange && weightChange > 0 ? 'increasing' : 'stable',
          },
        };
      }

      return {
        hasMetrics: false,
        message: 'Invalid mode specified.',
      };

    } catch (error) {
      console.error('💥 Exception getting health metrics:', error);
      throw new Error(
        `Failed to retrieve health metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});
