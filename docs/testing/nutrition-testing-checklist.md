# Nutrition Tracking - Testing Checklist

## 1. Nutrition API Service
- [ ] Search for common food items (e.g., "chicken breast", "banana")
- [ ] Verify nutrition data accuracy against known values
- [ ] Test with invalid/non-existent foods
- [ ] Check caching (search same food twice, second should be faster)

## 2. MealLogForm Component
- [ ] Select each meal type (breakfast, lunch, dinner, snack)
- [ ] Search for foods - verify auto-complete appears
- [ ] Add multiple food items to a meal
- [ ] Remove food items from the list
- [ ] Verify nutritional totals update correctly
- [ ] Submit meal log and check database (meal_logs table)
- [ ] Test validation (try submitting empty form)

## 3. CalorieTracker Widget
- [ ] Verify daily calorie display matches logged meals
- [ ] Check color coding (green < 80%, yellow 80-110%, red > 110%)
- [ ] Confirm macro progress bars display correctly
- [ ] Verify net calories calculation (consumed - burned)
- [ ] Test with no data (should show zeros)
- [ ] Update user profile targets and verify widget updates

## 4. NutritionBreakdown Component
- [ ] Test with pre-calculated nutrition (saved recipe)
- [ ] Test dynamic calculation from ingredients
- [ ] Verify per-serving calculations are accurate
- [ ] Check macro percentage tooltips
- [ ] Test compact mode display
- [ ] Verify macro ratio visual bar chart

## 5. NutritionAnalytics Dashboard
- [ ] Switch between time ranges (7 days, 30 days, week, month)
- [ ] Use custom date range picker
- [ ] Verify calorie trends chart displays correctly
- [ ] Check macro distribution charts (area and bar)
- [ ] Confirm summary statistics are accurate
- [ ] Export CSV and verify data format
- [ ] Test with no data period (should show empty state)

## 6. Integration Tests
- [ ] Log meals for multiple days
- [ ] Verify analytics charts update with new data
- [ ] Check calorie tracker reflects today's meals
- [ ] Test across different user profiles/targets
- [ ] Verify RLS (Row Level Security) - users only see their data

## 7. Edge Cases
- [ ] Very large meal (5000+ calories)
- [ ] Fractional quantities (0.5 servings)
- [ ] Special characters in food names
- [ ] Very old dates in analytics
- [ ] Missing profile targets (should use defaults)

## Expected Test Data
Create test meals with known values to verify calculations:
- 1 cup white rice: ~200 cal, 45g carbs, 4g protein, 0g fat
- 4oz chicken breast: ~185 cal, 0g carbs, 35g protein, 4g fat
- 1 tbsp olive oil: ~120 cal, 0g carbs, 0g protein, 14g fat
