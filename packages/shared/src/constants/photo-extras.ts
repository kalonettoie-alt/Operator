// Photos spécifiques demandées selon les specificities du logement

export const PHOTO_EXTRAS: Record<string, { label: string; description: string }> = {
  balcon: {
    label: 'Balcon',
    description: 'Photo du balcon propre et rangé',
  },
  terrasse: {
    label: 'Terrasse',
    description: 'Photo de la terrasse propre et rangée',
  },
  cave: {
    label: 'Cave',
    description: 'Photo de la cave accessible et rangée',
  },
  parking: {
    label: 'Parking',
    description: 'Photo de la place de parking dégagée',
  },
  piscine: {
    label: 'Piscine',
    description: 'Photo de la piscine propre',
  },
  jardin: {
    label: 'Jardin',
    description: 'Photo du jardin entretenu',
  },
};

// Nombre minimum de photos obligatoires
export const MIN_PHOTOS_BEFORE = 2;
export const MIN_PHOTOS_AFTER = 2;

// Compression photos
export const PHOTO_MAX_SIZE = 1024; // px (côté le plus long)
export const PHOTO_QUALITY = 0.7;
export const PHOTO_FORMAT = 'webp' as const;
