import {
  Baby, Egg, Beef, Drumstick, Ham, Fish, Milk, Salad, Grape, Citrus, Sprout, Leaf,
  Nut, Wheat, Carrot, Utensils, Bug, FlaskConical, Magnet, Tag, Store, Package,
  Tractor, Warehouse, Tent,
  type LucideIcon,
} from "lucide-react";
import type { ContaminantType } from "@/data/contaminants";
import type { UsdaDirectory } from "@/data/types";

/** Food category id -> drawn icon. Unknown ids fall back to `Utensils`. */
export const FOOD_ICONS: Record<string, LucideIcon> = {
  "infant-formula": Baby,
  eggs: Egg,
  beef: Beef,
  poultry: Drumstick,
  pork: Ham,
  seafood: Fish,
  dairy: Milk,
  "leafy-greens": Salad,
  berries: Grape,
  melons: Citrus,
  sprouts: Sprout,
  "herbs-supplements": Leaf,
  "nuts-seeds": Nut,
  "flour-grain": Wheat,
  "other-produce": Carrot,
  other: Utensils,
};

export function foodIcon(id: string): LucideIcon {
  return FOOD_ICONS[id] ?? Utensils;
}

export const HAZARD_ICONS: Record<ContaminantType, LucideIcon> = {
  biological: Bug,
  chemical: FlaskConical,
  physical: Magnet,
  allergenic: Nut,
  other: Tag,
};

export const DIRECTORY_ICONS: Record<UsdaDirectory, LucideIcon> = {
  farmersmarket: Store,
  csa: Package,
  onfarmmarket: Tractor,
  foodhub: Warehouse,
  agritourism: Tent,
};
