-- Seed Common Ingredient Substitutions
-- Run this SQL in your Supabase SQL Editor to populate the ingredient_substitutions table

-- Clear existing data (optional)
-- DELETE FROM public.ingredient_substitutions;

-- =============================================================================
-- DAIRY SUBSTITUTIONS
-- =============================================================================

INSERT INTO public.ingredient_substitutions (original_ingredient, substitute_ingredient, context, reason, ratio) VALUES
('milk', 'almond milk', 'all', 'Dairy-free alternative with similar consistency', '1:1'),
('milk', 'oat milk', 'all', 'Dairy-free with creamy texture, great for baking', '1:1'),
('milk', 'soy milk', 'all', 'High protein dairy-free alternative', '1:1'),
('milk', 'coconut milk', 'cooking', 'Rich, creamy alternative for curries and soups', '1:1'),

('butter', 'coconut oil', 'baking', 'Vegan alternative with similar fat content', '1:1'),
('butter', 'olive oil', 'cooking', 'Heart-healthy alternative for sautéing', '3:4'),
('butter', 'vegan butter', 'all', 'Plant-based direct replacement', '1:1'),
('butter', 'applesauce', 'baking', 'Low-fat alternative, adds moisture', '1:2'),

('cream', 'coconut cream', 'all', 'Rich dairy-free alternative', '1:1'),
('cream', 'cashew cream', 'all', 'Smooth, neutral-tasting vegan option', '1:1'),

('yogurt', 'coconut yogurt', 'all', 'Dairy-free probiotic alternative', '1:1'),
('yogurt', 'sour cream', 'cooking', 'Similar tang and texture', '1:1'),

('cheese', 'nutritional yeast', 'cooking', 'Adds cheesy flavor to vegan dishes', '1:4'),
('cheese', 'cashew cheese', 'all', 'Creamy vegan alternative', '1:1'),

-- =============================================================================
-- EGG SUBSTITUTIONS
-- =============================================================================

('eggs', 'flax eggs', 'baking', 'Vegan binding agent (1 egg = 1 tbsp ground flax + 3 tbsp water)', '1:1'),
('eggs', 'chia eggs', 'baking', 'Vegan binding agent (1 egg = 1 tbsp chia seeds + 3 tbsp water)', '1:1'),
('eggs', 'applesauce', 'baking', 'Adds moisture, works for cakes (1 egg = 1/4 cup applesauce)', '1:1'),
('eggs', 'mashed banana', 'baking', 'Natural sweetener and binder (1 egg = 1/4 cup mashed banana)', '1:1'),
('eggs', 'aquafaba', 'baking', 'Chickpea liquid, great for meringues (1 egg = 3 tbsp aquafaba)', '1:1'),

-- =============================================================================
-- FLOUR & GLUTEN SUBSTITUTIONS
-- =============================================================================

('wheat flour', 'almond flour', 'baking', 'Low-carb, gluten-free option', '1:1'),
('wheat flour', 'coconut flour', 'baking', 'High-fiber, gluten-free (very absorbent)', '1:4'),
('wheat flour', 'oat flour', 'baking', 'Gluten-free with mild flavor', '1:1'),
('wheat flour', 'rice flour', 'all', 'Gluten-free, neutral taste', '1:1'),
('wheat flour', 'gluten-free flour blend', 'all', 'Direct gluten-free replacement', '1:1'),

('bread crumbs', 'crushed cornflakes', 'cooking', 'Gluten-free crispy coating', '1:1'),
('bread crumbs', 'almond meal', 'cooking', 'Low-carb, gluten-free coating', '1:1'),

('pasta', 'zucchini noodles', 'cooking', 'Low-carb vegetable alternative', '1:1'),
('pasta', 'rice noodles', 'cooking', 'Gluten-free noodle option', '1:1'),
('pasta', 'chickpea pasta', 'cooking', 'High-protein, gluten-free option', '1:1'),

-- =============================================================================
-- SWEETENER SUBSTITUTIONS
-- =============================================================================

('sugar', 'honey', 'all', 'Natural sweetener (use less, it''s sweeter)', '3:4'),
('sugar', 'maple syrup', 'all', 'Natural liquid sweetener', '3:4'),
('sugar', 'coconut sugar', 'baking', 'Lower glycemic index alternative', '1:1'),
('sugar', 'stevia', 'all', 'Zero-calorie sweetener', '1:24'),
('sugar', 'monk fruit sweetener', 'all', 'Natural zero-calorie sweetener', '1:1'),
('sugar', 'agave nectar', 'cooking', 'Lower glycemic index liquid sweetener', '3:4'),

('brown sugar', 'coconut sugar', 'all', 'Similar caramel flavor', '1:1'),
('brown sugar', 'white sugar + molasses', 'baking', 'Make your own brown sugar', '1:1'),

-- =============================================================================
-- OIL & FAT SUBSTITUTIONS
-- =============================================================================

('vegetable oil', 'olive oil', 'cooking', 'Heart-healthy alternative', '1:1'),
('vegetable oil', 'avocado oil', 'all', 'High smoke point, neutral flavor', '1:1'),
('vegetable oil', 'coconut oil', 'baking', 'Adds subtle coconut flavor', '1:1'),
('vegetable oil', 'applesauce', 'baking', 'Low-fat alternative', '1:2'),

-- =============================================================================
-- MEAT SUBSTITUTIONS
-- =============================================================================

('ground beef', 'lentils', 'cooking', 'High-protein vegetarian option', '1:1'),
('ground beef', 'black beans', 'cooking', 'Protein-rich vegan alternative', '1:1'),
('ground beef', 'mushrooms', 'cooking', 'Umami-rich vegetarian option', '1:1'),
('ground beef', 'tempeh', 'cooking', 'High-protein soy product', '1:1'),

('chicken', 'tofu', 'cooking', 'Protein-rich vegan alternative', '1:1'),
('chicken', 'cauliflower', 'cooking', 'Low-carb vegetable option', '1:1'),
('chicken', 'chickpeas', 'cooking', 'Protein and fiber rich option', '1:1'),

-- =============================================================================
-- SEASONING SUBSTITUTIONS
-- =============================================================================

('soy sauce', 'tamari', 'all', 'Gluten-free soy sauce alternative', '1:1'),
('soy sauce', 'coconut aminos', 'all', 'Soy-free, slightly sweeter alternative', '1:1'),

('salt', 'sea salt', 'all', 'Contains trace minerals', '1:1'),
('salt', 'pink himalayan salt', 'all', 'Mineral-rich alternative', '1:1'),

-- =============================================================================
-- NUT SUBSTITUTIONS
-- =============================================================================

('peanut butter', 'almond butter', 'all', 'Tree nut alternative with similar texture', '1:1'),
('peanut butter', 'sunflower seed butter', 'all', 'Nut-free alternative', '1:1'),
('peanut butter', 'tahini', 'all', 'Sesame-based nut-free option', '1:1'),

('almonds', 'sunflower seeds', 'all', 'Nut-free crunchy alternative', '1:1'),
('almonds', 'pumpkin seeds', 'all', 'Nut-free nutrient-dense option', '1:1'),

-- =============================================================================
-- MISCELLANEOUS SUBSTITUTIONS
-- =============================================================================

('mayonnaise', 'greek yogurt', 'all', 'Lower-fat alternative', '1:1'),
('mayonnaise', 'avocado', 'raw', 'Creamy healthy fat alternative', '1:1'),

('sour cream', 'greek yogurt', 'all', 'Higher protein alternative', '1:1'),
('sour cream', 'cashew cream', 'all', 'Dairy-free alternative', '1:1'),

('corn starch', 'arrowroot powder', 'all', 'Paleo-friendly thickener', '1:1'),
('corn starch', 'tapioca starch', 'all', 'Gluten-free thickener', '1:1'),

('white rice', 'cauliflower rice', 'cooking', 'Low-carb vegetable alternative', '1:1'),
('white rice', 'quinoa', 'cooking', 'Higher protein grain alternative', '1:1');

-- Verify insertion
SELECT COUNT(*) as total_substitutions FROM public.ingredient_substitutions;
