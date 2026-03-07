"use client";

// Composant : modal de prise de photos d'état des lieux
// Utilisé avant de démarrer une mission (status 'acceptee' → 'en_cours').
//
// Flux :
// 1. Le prestataire sélectionne ≥ 2 photos
// 2. Chaque photo est compressée (max 1200px, 500 Ko) avant upload
// 3. Upload vers Supabase Storage : intervention-reports/etat-lieux/{id}/
// 4. Appel RPC commencer_intervention → status = 'en_cours', started_at = now()

import { useState, useRef } from "react";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/images";
import { useCommencerMission } from "@/lib/hooks/useMissionsPrestataire";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MIN_PHOTOS = 2;
const STORAGE_BUCKET = "intervention-reports";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoPreview {
  /** Fichier original sélectionné par l'utilisateur */
  file: File;
  /** URL locale pour la prévisualisation (créée avec URL.createObjectURL) */
  previewUrl: string;
}

interface ModalEtatLieuxProps {
  /** ID de l'intervention à démarrer */
  interventionId: string;
  /** Contrôle l'ouverture/fermeture du modal */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après que le modal a démarré la mission avec succès */
  onSuccess: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ModalEtatLieux({
  interventionId,
  open,
  onOpenChange,
  onSuccess,
}: ModalEtatLieuxProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commencerMutation = useCommencerMission();

  // ── Sélection des fichiers ───────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newPreviews: PhotoPreview[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPreviews]);

    // Vider l'input pour permettre de re-sélectionner les mêmes fichiers
    e.target.value = "";
  }

  // ── Suppression d'une photo ──────────────────────────────────────────────

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Fermeture du modal (nettoie les URLs blob) ────────────────────────────

  function handleClose() {
    if (isUploading) return; // bloquer la fermeture pendant l'upload
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    onOpenChange(false);
  }

  // ── Validation + upload + démarrage ─────────────────────────────────────

  async function handleValider() {
    if (photos.length < MIN_PHOTOS) return;

    setIsUploading(true);
    try {
      // 1. Compresser + uploader chaque photo
      const uploadedUrls: string[] = [];

      for (const { file } of photos) {
        // Compression avant upload
        const compressed = await compressImage(file);

        // Nom de fichier unique : uuid + extension d'origine
        const ext = file.name.split(".").pop() ?? "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `etat-lieux/${interventionId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, compressed, {
            contentType: compressed.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Récupérer l'URL publique de la photo uploadée
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      // 2. Enregistrer les URLs + passer status → 'en_cours'
      await commencerMutation.mutateAsync({
        interventionId,
        photosUrls: uploadedUrls,
      });

      toast.success("Mission démarrée ! Bon courage 💪");

      // Nettoyage
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Erreur lors du démarrage de la mission");
      Sentry.captureException(err, {
        extra: { context: "ModalEtatLieux.handleValider", interventionId },
      });
    } finally {
      setIsUploading(false);
    }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const canSubmit = photos.length >= MIN_PHOTOS && !isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            État des lieux — photos avant ménage
          </DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground">
          Prenez au moins <strong>2 photos</strong> de l&apos;appartement{" "}
          <strong>avant</strong> de commencer le ménage. Ces photos sont
          conservées en cas de litige.
        </p>

        {/* Compteur */}
        <p className={`text-sm font-medium ${photos.length >= MIN_PHOTOS ? "text-green-600" : "text-orange-600"}`}>
          {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée
          {photos.length > 1 ? "s" : ""}
          {photos.length < MIN_PHOTOS && ` (minimum ${MIN_PHOTOS} requises)`}
        </p>

        {/* Grille de prévisualisation */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border"
                />
                {/* Bouton suppression */}
                <button
                  onClick={() => removePhoto(index)}
                  disabled={isUploading}
                  className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                  aria-label="Supprimer cette photo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {/* Bouton d'ajout dans la grille */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <ImagePlus className="size-5" />
              <span className="text-xs">Ajouter</span>
            </button>
          </div>
        )}

        {/* Bouton d'upload initial (quand aucune photo) */}
        {photos.length === 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Camera className="size-8" />
            <span className="text-sm">Appuyer pour prendre des photos</span>
          </button>
        )}

        {/* Input fichier caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleValider}
            disabled={!canSubmit}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Upload en cours…
              </>
            ) : (
              <>
                <Camera className="size-4 mr-2" />
                Valider et démarrer
                {photos.length < MIN_PHOTOS && (
                  <span className="ml-1 text-xs opacity-60">
                    ({MIN_PHOTOS - photos.length} photo
                    {MIN_PHOTOS - photos.length > 1 ? "s" : ""} manquante
                    {MIN_PHOTOS - photos.length > 1 ? "s" : ""})
                  </span>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
