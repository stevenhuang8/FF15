/**
 * Unit Conversion Utilities
 *
 * Handles conversions between different measurement units for nutrition tracking
 */

// ============================================================================
// Unit Types
// ============================================================================

export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb' | 'mg';
export type VolumeUnit = 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'fl oz';
export type Unit = WeightUnit | VolumeUnit | 'serving' | 'piece' | 'slice' | 'whole';

// ============================================================================
// Conversion Tables
// ============================================================================

// Weight conversions (all to grams)
const WEIGHT_TO_GRAMS: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  mg: 0.001,
};

// Volume conversions (all to milliliters)
const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  cup: 236.588, // US cup
  tbsp: 14.7868, // US tablespoon
  tsp: 4.92892, // US teaspoon
  'fl oz': 29.5735, // US fluid ounce
};

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: string): unit is WeightUnit {
  return ['g', 'kg', 'oz', 'lb', 'mg'].includes(unit);
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: string): unit is VolumeUnit {
  return ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'].includes(unit);
}

/**
 * Convert weight from one unit to another
 */
export function convertWeight(
  value: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number {
  // Convert to grams first, then to target unit
  const grams = value * WEIGHT_TO_GRAMS[fromUnit];
  return grams / WEIGHT_TO_GRAMS[toUnit];
}

/**
 * Convert volume from one unit to another
 */
export function convertVolume(
  value: number,
  fromUnit: VolumeUnit,
  toUnit: VolumeUnit
): number {
  // Convert to ml first, then to target unit
  const ml = value * VOLUME_TO_ML[fromUnit];
  return ml / VOLUME_TO_ML[toUnit];
}

/**
 * Universal conversion function that handles both weight and volume
 */
export function convertUnit(
  value: number,
  fromUnit: Unit,
  toUnit: Unit
): number | null {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return value;
  }

  // Handle weight conversions
  if (isWeightUnit(fromUnit) && isWeightUnit(toUnit)) {
    return convertWeight(value, fromUnit, toUnit);
  }

  // Handle volume conversions
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    return convertVolume(value, fromUnit, toUnit);
  }

  // Cannot convert between weight and volume without density
  console.warn(
    `Cannot convert between ${fromUnit} and ${toUnit} without density information`
  );
  return null;
}

/**
 * Normalize a unit string to standard format
 * Handles common variations and abbreviations
 */
export function normalizeUnit(unit: string): Unit {
  const normalized = unit.toLowerCase().trim();

  // Weight unit mappings
  const weightMappings: Record<string, WeightUnit> = {
    g: 'g',
    gram: 'g',
    grams: 'g',
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    oz: 'oz',
    ounce: 'oz',
    ounces: 'oz',
    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',
    mg: 'mg',
    milligram: 'mg',
    milligrams: 'mg',
  };

  // Volume unit mappings
  const volumeMappings: Record<string, VolumeUnit> = {
    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    l: 'l',
    liter: 'l',
    liters: 'l',
    cup: 'cup',
    cups: 'cup',
    c: 'cup',
    tbsp: 'tbsp',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tbs: 'tbsp',
    tsp: 'tsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    'fl oz': 'fl oz',
    'fluid ounce': 'fl oz',
    'fluid ounces': 'fl oz',
    floz: 'fl oz',
  };

  return weightMappings[normalized] || volumeMappings[normalized] || (normalized as Unit);
}

/**
 * Convert to standard 100g serving for consistent nutrition data storage
 */
export function convertTo100g(
  value: number,
  fromUnit: Unit,
  density?: number
): number | null {
  // If already in grams, scale to 100g
  if (fromUnit === 'g') {
    return (value / 100) * 100; // This is just value, but explicit for clarity
  }

  // Convert other weight units to grams
  if (isWeightUnit(fromUnit)) {
    const grams = convertWeight(value, fromUnit, 'g');
    return grams;
  }

  // For volume units, we need density to convert to weight
  if (isVolumeUnit(fromUnit) && density) {
    // Convert to ml first
    const ml = convertVolume(value, fromUnit, 'ml');
    // ml * density = grams (assuming density is g/ml)
    return ml * density;
  }

  // Cannot convert without density
  return null;
}

/**
 * Common food densities (g/ml) for volume-to-weight conversions
 * These are approximate values
 */
export const FOOD_DENSITIES: Record<string, number> = {
  // Liquids
  water: 1.0,
  milk: 1.03,
  'olive oil': 0.92,
  oil: 0.92,
  honey: 1.42,
  'maple syrup': 1.37,

  // Dry ingredients (approximate when packed)
  flour: 0.53,
  sugar: 0.85,
  'brown sugar': 0.90,
  salt: 1.22,
  rice: 0.85,
  oats: 0.41,

  // Semi-solids
  butter: 0.96,
  'peanut butter': 1.08,
  yogurt: 1.04,
  'sour cream': 1.03,
};

/**
 * Attempt to convert volume to weight using known food densities
 */
export function volumeToWeight(
  value: number,
  fromUnit: VolumeUnit,
  foodName: string
): number | null {
  const normalizedFood = foodName.toLowerCase().trim();

  // Look for matching density
  for (const [food, density] of Object.entries(FOOD_DENSITIES)) {
    if (normalizedFood.includes(food)) {
      const ml = convertVolume(value, fromUnit, 'ml');
      return ml * density; // Returns grams
    }
  }

  return null;
}

/**
 * Format a unit value for display
 */
export function formatUnitValue(value: number, unit: Unit, decimals: number = 1): string {
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `${rounded} ${unit}`;
}

/**
 * Parse a quantity string like "1 cup" or "250g" into value and unit
 */
export function parseQuantityString(
  quantityStr: string
): { value: number; unit: Unit } | null {
  const trimmed = quantityStr.trim();

  // Match patterns like "1 cup", "250g", "1.5 oz", "2 tablespoons"
  const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z\s]+)$/);

  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  const unit = normalizeUnit(match[2]);

  return { value, unit };
}
