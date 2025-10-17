# Task 6: Recipe Generation Testing Checklist

## RecipeFromIngredientsButton Component
- [ ] Button renders correctly in different variants (default, outline, secondary)
- [ ] Icon-only mode displays properly
- [ ] Clicking button fetches ingredients from /api/ingredients
- [ ] Loading state shows spinner while fetching
- [ ] Error alert displays when ingredients fetch fails
- [ ] No ingredients message appears when pantry is empty
- [ ] Recipe generation triggers with correct ingredient list

## AI Recipe Generation Tool
- [ ] Tool generates recipe from simple ingredient list (3-5 items)
- [ ] Tool generates recipe from complex ingredient list (10+ items)
- [ ] Recipes include title, ingredients, and instructions
- [ ] Recipes include nutritional information
- [ ] Dietary restrictions filter properly (vegetarian, vegan, gluten-free)
- [ ] Expiring ingredients are prioritized in suggestions
- [ ] Tool handles invalid ingredient combinations gracefully

## Missing Ingredient Detection
- [ ] Missing ingredients display separately from available ingredients
- [ ] Visual indicators clearly show missing vs available ingredients
- [ ] Ingredient availability check component renders correctly
- [ ] Substitution suggestions appear for missing ingredients
- [ ] User can generate alternative recipes with fewer missing items

## Chat Integration
- [ ] Recipe generation works through chat interface
- [ ] Recipes display properly in message format
- [ ] Recipe difficulty (beginner/intermediate/advanced) shows correctly
- [ ] Estimated cooking time displays accurately
- [ ] SaveRecipeButton appears on generated recipes
- [ ] Saved recipes include all metadata (difficulty, time, nutrition)

## Edge Cases
- [ ] Empty pantry handling
- [ ] Single ingredient handling
- [ ] Very long ingredient list (20+ items)
- [ ] Ingredients with special characters or unicode
- [ ] API timeout handling
- [ ] Network error recovery
