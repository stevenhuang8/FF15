# Task 9: Health Metrics Dashboard - Testing Checklist

## Test Date: _________
## Tester: _________

---

## 1. Health Metrics Form Tests

### Basic Functionality
- [ ] **Navigate to Dashboard**: Access `/dashboard` while logged in
- [ ] **Open Metrics Form**: Click "Log Metrics" button, dialog opens
- [ ] **Date Selection**:
  - [ ] Default date is today
  - [ ] Can select past dates
  - [ ] Cannot select future dates
- [ ] **Form Validation**:
  - [ ] Submitting empty form shows error "Please enter at least one metric"
  - [ ] Can submit with only weight filled
  - [ ] Can submit with only body fat filled
  - [ ] Can submit with only measurements filled

### Data Entry
- [ ] **Weight Entry**:
  - [ ] Accept decimal values (e.g., 180.5)
  - [ ] Display in lbs
- [ ] **Body Fat Entry**:
  - [ ] Accept decimal values (e.g., 18.5)
  - [ ] Display with % symbol
- [ ] **Measurements Entry**:
  - [ ] All fields accept decimal values
  - [ ] Waist field works
  - [ ] Chest field works
  - [ ] Hips field works
  - [ ] Arms field works
  - [ ] Thighs field works
- [ ] **Notes Field**:
  - [ ] Can enter text notes
  - [ ] Notes are optional

### Submission & Feedback
- [ ] **Submit Success**:
  - [ ] "Saving..." appears during submission
  - [ ] Success message appears after save
  - [ ] Form closes after 1 second delay
  - [ ] Dashboard refreshes with new data
- [ ] **Edit Existing**:
  - [ ] Selecting a date with existing data pre-fills the form
  - [ ] Updating existing metrics works
  - [ ] Upsert behavior works correctly (no duplicates)

---

## 2. Fitness Goal Setter Tests

### Goal Creation
- [ ] **Open Goal Setter**: Click "Set Goals" button, dialog opens
- [ ] **Goal Types Available**:
  - [ ] Weight Loss
  - [ ] Weight Gain
  - [ ] Muscle Gain
  - [ ] Body Fat Reduction
  - [ ] Daily Calorie Target
  - [ ] Workout Frequency
- [ ] **Unit Auto-Population**:
  - [ ] Weight Loss → lbs
  - [ ] Body Fat Reduction → %
  - [ ] Calorie Target → calories
  - [ ] Workout Frequency → workouts/week

### Goal Form
- [ ] **Required Fields**:
  - [ ] Goal type selection required
  - [ ] Target value required
  - [ ] Unit can be customized
- [ ] **Optional Fields**:
  - [ ] Current value is optional
  - [ ] Target date is optional
- [ ] **Submission**:
  - [ ] Goal creates successfully
  - [ ] Success message appears
  - [ ] Goal appears in "Active Goals" list

### Active Goals Display
- [ ] **Goal Card Shows**:
  - [ ] Goal type icon with correct color
  - [ ] Goal label
  - [ ] Status badge
  - [ ] Current vs target values
  - [ ] Target date (if set)
  - [ ] Progress bar (if current value set)
  - [ ] Progress percentage
- [ ] **Goal Actions**:
  - [ ] "Mark Achieved" button appears when progress >= 100%
  - [ ] Clicking "Mark Achieved" updates status
  - [ ] Delete button (X) works
  - [ ] Deleting goal removes it from list

---

## 3. Progress Charts Tests

### Chart Navigation
- [ ] **Tabs Work**:
  - [ ] Weight tab displays
  - [ ] Calories tab displays
  - [ ] Workouts tab displays
  - [ ] Measurements tab displays
- [ ] **Empty States**:
  - [ ] Appropriate message when no data available
  - [ ] Prompts user to start logging

### Weight Chart
- [ ] **Data Display**:
  - [ ] X-axis shows dates (formatted as "Jan 1", "Jan 2", etc.)
  - [ ] Y-axis shows weight in lbs
  - [ ] Line chart renders correctly
  - [ ] Dots appear on data points
  - [ ] Hover shows tooltip with date and value
- [ ] **Responsiveness**:
  - [ ] Chart resizes on window resize
  - [ ] Works on mobile view

### Calorie Chart
- [ ] **Multi-Series**:
  - [ ] "Consumed" bars appear
  - [ ] "Burned" bars appear
  - [ ] "Net" bars appear
  - [ ] Different colors for each series
  - [ ] Legend shows series labels
- [ ] **Tooltip**:
  - [ ] Shows all three values on hover
  - [ ] Date formatted correctly

### Workout Chart
- [ ] **Data Display**:
  - [ ] Bar chart shows workout count per week
  - [ ] Y-axis labeled "Workouts"
  - [ ] Bars render correctly
  - [ ] Hover shows tooltip

### Measurements Chart
- [ ] **Multi-Line**:
  - [ ] Waist line appears
  - [ ] Chest line appears
  - [ ] Hips line appears
  - [ ] Arms line appears
  - [ ] Thighs line appears
  - [ ] Different colors for each measurement
  - [ ] Legend shows all measurements
- [ ] **Tooltip**:
  - [ ] Shows all measurements at that date
  - [ ] Values formatted correctly

---

## 4. Dashboard Stats Cards

### Stats Display
- [ ] **Current Weight Card**:
  - [ ] Shows latest weight or "—" if none
  - [ ] Shows weight change with +/- indicator
  - [ ] Color coded (green for loss, orange for gain)
- [ ] **Active Goals Card**:
  - [ ] Shows count of active goals
  - [ ] Shows count of achieved goals
- [ ] **This Week Card**:
  - [ ] Shows workout count for current week
  - [ ] Updates when new workout logged
- [ ] **Streak Card**:
  - [ ] Currently shows "—" (placeholder)
  - [ ] Reserved for future implementation

### Data Refresh
- [ ] **After Logging Metrics**:
  - [ ] Stats cards update immediately
  - [ ] Charts refresh with new data
- [ ] **After Creating Goal**:
  - [ ] Active goals count updates
  - [ ] Goal appears in list below stats

---

## 5. Data Export Tests

### Export Menu
- [ ] **Open Export Menu**: Click "Export Data" button
- [ ] **Menu Items Visible**:
  - [ ] Progress Summary (TXT)
  - [ ] Complete Data (JSON)
  - [ ] All Data (CSV Files)
  - [ ] Health Metrics Only (CSV)
  - [ ] Fitness Goals Only (CSV)
  - [ ] Progress Snapshots Only (CSV)

### Export Formats
- [ ] **Progress Summary (TXT)**:
  - [ ] File downloads
  - [ ] Filename format: `progress-summary-YYYY-MM-DD.txt`
  - [ ] Contains readable summary of metrics, goals, snapshots
  - [ ] Properly formatted with headers and sections
- [ ] **Complete Data (JSON)**:
  - [ ] File downloads
  - [ ] Filename format: `health-fitness-data-YYYY-MM-DD.json`
  - [ ] Valid JSON structure
  - [ ] Contains healthMetrics, fitnessGoals, progressSnapshots arrays
- [ ] **All Data (CSV)**:
  - [ ] Multiple CSV files download (with 500ms delay between)
  - [ ] One file for health metrics
  - [ ] One file for fitness goals
  - [ ] One file for progress snapshots
- [ ] **Individual CSV Exports**:
  - [ ] Health metrics CSV has correct headers
  - [ ] Goals CSV has correct headers
  - [ ] Snapshots CSV has correct headers
  - [ ] Data properly quoted in CSV format
  - [ ] Null values handled correctly

---

## 6. Navigation Tests

### Dashboard Link
- [ ] **Navigation Bar**:
  - [ ] "Dashboard" link appears after "History"
  - [ ] Link is visible when logged in
  - [ ] Link is hidden when logged out
  - [ ] Clicking navigates to `/dashboard`
  - [ ] Active state highlights when on dashboard page

---

## 7. Responsive Design Tests

### Mobile View (< 768px)
- [ ] **Dashboard Layout**:
  - [ ] Stats cards stack vertically
  - [ ] Action buttons stack or wrap
  - [ ] Charts responsive
- [ ] **Forms**:
  - [ ] Health metrics form scrollable in dialog
  - [ ] Goal setter scrollable in dialog
  - [ ] Inputs properly sized
- [ ] **Charts**:
  - [ ] Charts shrink to fit container
  - [ ] Tooltips still accessible
  - [ ] Labels readable

### Tablet View (768px - 1024px)
- [ ] Stats cards in 2-column grid
- [ ] Charts properly sized
- [ ] Forms readable

### Desktop View (> 1024px)
- [ ] Stats cards in 4-column grid
- [ ] Optimal chart sizes
- [ ] Dialogs centered

---

## 8. Integration Tests

### End-to-End Flow
- [ ] **New User Journey**:
  1. [ ] Log in for first time
  2. [ ] Navigate to dashboard (empty state)
  3. [ ] Click "Log Metrics"
  4. [ ] Enter weight and measurements
  5. [ ] Submit form
  6. [ ] See data in stats cards
  7. [ ] See data in weight chart
  8. [ ] Click "Set Goals"
  9. [ ] Create a weight loss goal
  10. [ ] See goal in Active Goals section
  11. [ ] Log metrics again with updated weight
  12. [ ] See goal progress update
  13. [ ] Export data as CSV
  14. [ ] Verify downloaded file

### Data Consistency
- [ ] **Metrics logged appear in**:
  - [ ] Stats cards
  - [ ] Weight chart
  - [ ] Measurements chart
  - [ ] Latest metrics in database
- [ ] **Goals created appear in**:
  - [ ] Active Goals section
  - [ ] Stats card count
  - [ ] Database fitness_goals table
- [ ] **Updates persist**:
  - [ ] Page refresh maintains data
  - [ ] Logout/login maintains data
  - [ ] No data loss on navigation

---

## 9. Error Handling Tests

### Authentication
- [ ] **Logged Out**:
  - [ ] Accessing `/dashboard` redirects to `/login`
  - [ ] No data exposed to unauthenticated users

### Database Errors
- [ ] **Offline Mode** (disable network in DevTools):
  - [ ] Form submissions show appropriate error
  - [ ] Charts show loading or error state
  - [ ] App doesn't crash
- [ ] **Invalid Data**:
  - [ ] Extremely large numbers handled
  - [ ] Negative numbers validated
  - [ ] Non-numeric input in number fields rejected

### Edge Cases
- [ ] **No Data**:
  - [ ] Empty states display correctly
  - [ ] No crashes when no metrics logged
  - [ ] Charts show "No data available" message
- [ ] **First Metric**:
  - [ ] Single data point displays correctly
  - [ ] Chart renders with one point
  - [ ] No calculation errors

---

## 10. TypeScript & Build Tests

### Compilation
- [ ] **No TypeScript Errors**:
  ```bash
  pnpm tsc --noEmit
  ```
  - [ ] Passes with no errors
  - [ ] All types properly defined

### Build
- [ ] **Production Build**:
  ```bash
  pnpm build
  ```
  - [ ] Build completes successfully
  - [ ] No warnings

---

## Test Results Summary

**Total Tests**: _____ / _____
**Pass Rate**: _____%
**Critical Issues**: _____
**Minor Issues**: _____

### Critical Issues Found:
1.
2.
3.

### Minor Issues Found:
1.
2.
3.

### Notes:


### Tested By: _______________
### Date: _______________
### Build/Commit: _______________
