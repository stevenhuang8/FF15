import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logHealthMetrics, getLatestHealthMetrics } from '@/lib/supabase/health-metrics';

/**
 * Schema for logging health metrics
 */
const logHealthMetricsSchema = z.object({
  date: z.string()
    .optional()
    .describe('Date for the metrics in YYYY-MM-DD format. Defaults to today.'),
  weight: z.number()
    .optional()
    .describe('Body weight in lbs or kg'),
  bodyFatPercentage: z.number()
    .optional()
    .describe('Body fat percentage (e.g., 18.5 for 18.5%)'),
  waist: z.number()
    .optional()
    .describe('Waist measurement in inches or cm'),
  chest: z.number()
    .optional()
    .describe('Chest measurement in inches or cm'),
  hips: z.number()
    .optional()
    .describe('Hips measurement in inches or cm'),
  arms: z.number()
    .optional()
    .describe('Arms measurement in inches or cm'),
  thighs: z.number()
    .optional()
    .describe('Thighs measurement in inches or cm'),
  notes: z.string()
    .optional()
    .describe('Any notes about health, progress, or how the user is feeling'),
  userId: z.string().describe('User ID (automatically injected)'),
  timezone: z.string().optional().describe('User timezone (automatically injected)'),
});

/**
 * Preview tool for logging health metrics (weight, body fat, measurements)
 * Shows what will be logged without saving to database
 */
export const logHealthMetricsPreview = tool({
  description: `Log or update health metrics including weight, body fat percentage, and body measurements.

  IMPORTANT: This tool returns a PREVIEW only. You MUST ask the user to CONFIRM before calling confirmHealthMetricsLog.

  Use this when user wants to:
  - Update their weight
  - Log body fat percentage
  - Track body measurements (waist, chest, hips, arms, thighs)
  - Add notes about their health progress

  The tool will show current values vs new values for comparison before saving.`,

  inputSchema: logHealthMetricsSchema,

  execute: async ({
    date,
    weight,
    bodyFatPercentage,
    waist,
    chest,
    hips,
    arms,
    thighs,
    notes,
    userId,
    timezone = 'America/Los_Angeles'
  }: z.infer<typeof logHealthMetricsSchema>) => {
    try {
      console.log('🔍 [Health Metrics Preview] Starting preview...');
      console.log('📅 Date:', date || 'today');
      console.log('⚖️ Weight:', weight);
      console.log('📊 Body Fat:', bodyFatPercentage);

      // Get user's current timezone date if not provided
      const metricsDate = date || new Date().toLocaleDateString('en-CA', {
        timeZone: timezone
      });

      // Fetch current metrics for comparison
      const supabase = await createClient();
      const { data: currentMetrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('date', metricsDate)
        .single();

      // Also get latest metrics for comparison if updating a different date
      const { data: latestMetrics } = await getLatestHealthMetrics(userId);

      // Build preview message
      const newMetrics = {
        date: metricsDate,
        weight,
        bodyFatPercentage,
        waist,
        chest,
        hips,
        arms,
        thighs,
        notes,
      };

      // Remove undefined values
      Object.keys(newMetrics).forEach(key => {
        if (newMetrics[key as keyof typeof newMetrics] === undefined) {
          delete newMetrics[key as keyof typeof newMetrics];
        }
      });

      let previewMessage = `📊 **Health Metrics ${currentMetrics ? 'Update' : 'Log'} Preview**\n\n`;
      previewMessage += `📅 Date: ${metricsDate}\n\n`;

      // Show changes for each metric
      if (weight !== undefined) {
        const current = currentMetrics?.weight || latestMetrics?.weight;
        const change = current ? weight - current : null;
        previewMessage += `⚖️ Weight: ${weight} lbs`;
        if (change !== null) {
          const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
          previewMessage += ` ${arrow} (${change > 0 ? '+' : ''}${change.toFixed(1)} lbs from ${current} lbs)`;
        }
        previewMessage += '\n';
      }

      if (bodyFatPercentage !== undefined) {
        const current = currentMetrics?.body_fat_percentage || latestMetrics?.body_fat_percentage;
        const change = current ? bodyFatPercentage - current : null;
        previewMessage += `📊 Body Fat: ${bodyFatPercentage}%`;
        if (change !== null) {
          const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
          previewMessage += ` ${arrow} (${change > 0 ? '+' : ''}${change.toFixed(1)}% from ${current}%)`;
        }
        previewMessage += '\n';
      }

      // Measurements
      const measurements = [
        { key: 'waist', value: waist, label: 'Waist', emoji: '⭕' },
        { key: 'chest', value: chest, label: 'Chest', emoji: '💪' },
        { key: 'hips', value: hips, label: 'Hips', emoji: '⭕' },
        { key: 'arms', value: arms, label: 'Arms', emoji: '💪' },
        { key: 'thighs', value: thighs, label: 'Thighs', emoji: '🦵' },
      ] as const;

      const hasMeasurements = measurements.some(m => m.value !== undefined);
      if (hasMeasurements) {
        previewMessage += '\n**Measurements:**\n';
        measurements.forEach(({ key, value, label, emoji }) => {
          if (value !== undefined) {
            const current = currentMetrics?.[key] || latestMetrics?.[key];
            const change = current ? value - current : null;
            previewMessage += `${emoji} ${label}: ${value} inches`;
            if (change !== null) {
              const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
              previewMessage += ` ${arrow} (${change > 0 ? '+' : ''}${change.toFixed(1)} from ${current})`;
            }
            previewMessage += '\n';
          }
        });
      }

      if (notes) {
        previewMessage += `\n📝 Notes: ${notes}\n`;
      }

      previewMessage += '\n---\n\n';
      previewMessage += currentMetrics
        ? '⚠️ This will **update** the existing metrics for this date.\n\n'
        : '✨ This will **create new** metrics for this date.\n\n';
      previewMessage += '**Please ask the user to CONFIRM before calling confirmHealthMetricsLog.**';

      console.log('✅ [Health Metrics Preview] Preview generated successfully');

      return {
        success: true,
        preview: true,
        metrics: newMetrics,
        currentMetrics: currentMetrics || null,
        latestMetrics: latestMetrics || null,
        isUpdate: !!currentMetrics,
        message: previewMessage,
      };

    } catch (error) {
      console.error('❌ [Health Metrics Preview] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Failed to generate health metrics preview. Please try again.',
      };
    }
  },
});

/**
 * Confirmation tool for logging health metrics
 * Actually saves the metrics to the database after user approval
 */
export const confirmHealthMetricsLog = tool({
  description: `Confirm and save health metrics to the database after user approves the preview.

  IMPORTANT: Only call this AFTER:
  1. You called logHealthMetricsPreview
  2. You showed the preview to the user
  3. The user explicitly confirmed they want to save the metrics

  This will permanently save the health metrics data.`,

  inputSchema: logHealthMetricsSchema,

  execute: async ({
    date,
    weight,
    bodyFatPercentage,
    waist,
    chest,
    hips,
    arms,
    thighs,
    notes,
    userId,
    timezone = 'America/Los_Angeles'
  }: z.infer<typeof logHealthMetricsSchema>) => {
    try {
      console.log('💾 [Health Metrics Confirm] Starting save...');
      console.log('📅 Date:', date || 'today');
      console.log('⚖️ Weight:', weight);

      // Get user's current timezone date if not provided
      const metricsDate = date || new Date().toLocaleDateString('en-CA', {
        timeZone: timezone
      });

      // Create server-side Supabase client with authenticated user context
      const supabase = await createClient();

      // Save metrics using existing function with server client
      const result = await logHealthMetrics(supabase, {
        userId,
        date: metricsDate,
        weight,
        bodyFatPercentage,
        waist,
        chest,
        hips,
        arms,
        thighs,
        notes,
      });

      if (!result || !result.data) {
        throw new Error(result?.error?.message || 'Failed to save health metrics');
      }

      console.log('✅ [Health Metrics Confirm] Saved successfully');

      // Build success message
      let successMessage = '✅ **Health metrics saved successfully!**\n\n';
      successMessage += `📅 Date: ${metricsDate}\n`;

      if (weight !== undefined) {
        successMessage += `⚖️ Weight: ${weight} lbs\n`;
      }
      if (bodyFatPercentage !== undefined) {
        successMessage += `📊 Body Fat: ${bodyFatPercentage}%\n`;
      }

      const measurements = [];
      if (waist !== undefined) measurements.push(`Waist: ${waist}"`);
      if (chest !== undefined) measurements.push(`Chest: ${chest}"`);
      if (hips !== undefined) measurements.push(`Hips: ${hips}"`);
      if (arms !== undefined) measurements.push(`Arms: ${arms}"`);
      if (thighs !== undefined) measurements.push(`Thighs: ${thighs}"`);

      if (measurements.length > 0) {
        successMessage += `\n📏 Measurements: ${measurements.join(', ')}\n`;
      }

      if (notes) {
        successMessage += `\n📝 Notes: ${notes}\n`;
      }

      successMessage += '\nYour dashboard has been updated with the latest metrics.';

      return {
        success: true,
        saved: true,
        metrics: result.data,
        message: successMessage,
      };

    } catch (error) {
      console.error('❌ [Health Metrics Confirm] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Failed to save health metrics. Please try again.',
      };
    }
  },
});
