'use client'

/**
 * DataExportButton Component
 *
 * Button with dropdown menu for exporting health and fitness data
 */

import { useState } from 'react'
import { Download, FileText, FileJson, Table } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { createClient } from '@/lib/supabase/client'
import {
  exportAllDataJSON,
  exportAllDataCSV,
  exportProgressSummary,
  exportHealthMetricsCSV,
  exportFitnessGoalsCSV,
  exportProgressSnapshotsCSV,
  type ExportData,
} from '@/lib/health/data-export'
import {
  getHealthMetrics,
  getFitnessGoals,
  getProgressSnapshots,
} from '@/lib/supabase/health-metrics'

// ============================================================================
// Component
// ============================================================================

export function DataExportButton() {
  const [isExporting, setIsExporting] = useState(false)

  const loadAllData = async (): Promise<ExportData> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Load all data in parallel
    const [{ data: healthMetrics }, { data: fitnessGoals }, { data: progressSnapshots }] =
      await Promise.all([
        getHealthMetrics(user.id, undefined, undefined, 1000),
        getFitnessGoals(user.id),
        getProgressSnapshots(user.id, undefined, undefined, 100),
      ])

    return {
      healthMetrics: healthMetrics || [],
      fitnessGoals: fitnessGoals || [],
      progressSnapshots: progressSnapshots || [],
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'summary' | 'metrics' | 'goals' | 'snapshots') => {
    setIsExporting(true)

    try {
      const data = await loadAllData()

      switch (format) {
        case 'json':
          exportAllDataJSON(data)
          break
        case 'csv':
          await exportAllDataCSV(data)
          break
        case 'summary':
          exportProgressSummary(data)
          break
        case 'metrics':
          if (data.healthMetrics && data.healthMetrics.length > 0) {
            exportHealthMetricsCSV(data.healthMetrics)
          }
          break
        case 'goals':
          if (data.fitnessGoals && data.fitnessGoals.length > 0) {
            exportFitnessGoalsCSV(data.fitnessGoals)
          }
          break
        case 'snapshots':
          if (data.progressSnapshots && data.progressSnapshots.length > 0) {
            exportProgressSnapshotsCSV(data.progressSnapshots)
          }
          break
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Data'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport('summary')}>
          <FileText className="h-4 w-4 mr-2" />
          Progress Summary (TXT)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          Complete Data (JSON)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="h-4 w-4 mr-2" />
          All Data (CSV Files)
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Individual Exports</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => handleExport('metrics')}>
          <Table className="h-4 w-4 mr-2" />
          Health Metrics Only
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('goals')}>
          <Table className="h-4 w-4 mr-2" />
          Fitness Goals Only
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('snapshots')}>
          <Table className="h-4 w-4 mr-2" />
          Progress Snapshots Only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
