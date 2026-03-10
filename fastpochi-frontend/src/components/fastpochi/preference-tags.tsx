import { cn } from "@/lib/utils";

interface PreferenceTagsProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  className?: string;
}

const TAG_LABELS: Record<string, string> = {
  pizza: "Pizza",
  hamburguesas: "Hamburguesas",
  sushi: "Sushi",
  mexicana: "Mexicana",
  italiana: "Italiana",
  china: "China",
  thai: "Thai",
  vegano: "Vegano",
  sin_gluten: "Sin Gluten",
  mariscos: "Mariscos",
  postres: "Postres",
  cafe: "Cafe",
  saludable: "Saludable",
  rapida: "Comida Rapida",
  guatemalteca: "Guatemalteca",
  gourmet: "Gourmet",
};

export function PreferenceTags({
  tags,
  selected,
  onToggle,
  className,
}: PreferenceTagsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            {TAG_LABELS[tag] || tag}
          </button>
        );
      })}
    </div>
  );
}

export { TAG_LABELS };
