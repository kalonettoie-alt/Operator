// Composant Skeleton — placeholder animé pour les états de chargement.
// Remplace les spinners full-page par une structure de page visible immédiatement.

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}
