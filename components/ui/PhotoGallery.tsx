"use client";

// PhotoGallery — grille de photos cliquables avec lightbox (Dialog).
// Réutilisable partout : état des lieux, rapport, dégâts.

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhotoGalleryProps {
  photos: string[];
  /** Titre affiché au-dessus de la grille */
  title?: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground rounded-lg border border-dashed">
        <ImageIcon className="size-8 opacity-40" />
        <p className="text-sm">Aucune photo</p>
      </div>
    );
  }

  function prev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function next() {
    setIndex((i) => (i + 1) % photos.length);
  }

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      )}

      {/* Grille de miniatures */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setIndex(i); setOpen(true); }}
            className="aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-4xl p-0 border-0 bg-black/95 gap-0"
          showCloseButton
        >
          <div className="relative flex items-center justify-center min-h-64 max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[index]}
              alt={`Photo ${index + 1} sur ${photos.length}`}
              className="max-h-[85vh] max-w-full object-contain"
            />

            {/* Navigation (seulement si plusieurs photos) */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prev}
                  className="absolute left-3 text-white hover:bg-white/20 hover:text-white"
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={next}
                  className="absolute right-3 text-white hover:bg-white/20 hover:text-white"
                >
                  <ChevronRight className="size-6" />
                </Button>
                <span className="absolute bottom-3 text-white/60 text-xs tabular-nums">
                  {index + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
