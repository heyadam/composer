import type { SavedFlow } from "@/lib/flow-storage/types";

// Import template JSON files
// You will create these files in lib/flows/templates/
import template1 from "@/lib/flows/templates/template-1.avy.json";
import template2 from "@/lib/flows/templates/template-2.avy.json";
import template3 from "@/lib/flows/templates/template-3.avy.json";

export interface TemplateDefinition {
  id: string;
  title: string;
  description: string;
  flow: SavedFlow;
}

export const templates: TemplateDefinition[] = [
  {
    id: "template-1",
    title: "Template 1",
    description: "Description for template 1",
    flow: template1 as SavedFlow,
  },
  {
    id: "template-2",
    title: "Template 2",
    description: "Description for template 2",
    flow: template2 as SavedFlow,
  },
  {
    id: "template-3",
    title: "Template 3",
    description: "Description for template 3",
    flow: template3 as SavedFlow,
  },
];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return templates.find((t) => t.id === id);
}
