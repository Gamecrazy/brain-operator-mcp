export type Relation = "child" | "parent" | "jump" | "sibling";

export function relationToApiValue(relation: Relation): number {
  switch (relation) {
    case "child":
      return 1;
    case "parent":
      return 2;
    case "jump":
      return 3;
    case "sibling":
      return 4;
  }
}
