// lib/utils/images.ts
// Utilitaire de compression d'images avant upload Supabase Storage.
// Toujours appeler compressImage() avant tout upload pour rester sous 500 Ko.

import imageCompression from "browser-image-compression";

/**
 * Compresse une image côté navigateur.
 * - Redimensionne à 1200px max (côté le plus long)
 * - Qualité 80%
 * - Conserve le type MIME d'origine (jpeg, png, webp)
 *
 * @param file - Le fichier image sélectionné par l'utilisateur
 * @returns Le fichier compressé (toujours < 500 Ko en pratique)
 */
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,        // plafond à 500 Ko
    maxWidthOrHeight: 1200, // redimensionne si plus grand que 1200px
    useWebWorker: true,    // ne bloque pas le thread principal
    fileType: file.type,   // conserve le format d'origine
  });
}
