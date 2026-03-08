"use client";

// Composant : modal de rapport de fin d'intervention
// Utilisé lorsque la mission est en cours (status = 'en_cours').
//
// Flux :
// 1. Checklist des tâches à effectuer (depuis logement.checklist_template ou défaut)
// 2. Upload ≥ 2 photos APRÈS le ménage (compressées avant envoi)
// 3. Section optionnelle dégâts (checkbox → description + photos)
// 4. Bouton "Terminer" actif seulement si checklist complète + 2 photos minimum
// 5. Upload Storage → appel RPC terminer_intervention → rapport créé + status 'terminee'

import { useState, useRef } from "react";
import {
  Camera,
  X,
  Loader2,
  ImagePlus,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/images";
import {
  useTerminerMission,
  type TacheChecklist,
} from "@/lib/hooks/useMissionsPrestataire";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MIN_PHOTOS = 2;
const STORAGE_BUCKET = "intervention-photos";

/** Tâches par défaut si le logement n'a pas de checklist personnalisée */
const TACHES_DEFAUT: string[] = [
  "Aspirateur et balayage dans toutes les pièces",
  "Lavage des sols",
  "Nettoyage cuisine (plans de travail, évier, plaques, four)",
  "Nettoyage salle de bain et WC",
  "Changement du linge de lit",
  "Remplacement des serviettes",
  "Vider les poubelles",
  "Vérification de l'état général du logement",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

interface ModalRapportInterventionProps {
  /** ID de l'intervention à terminer */
  interventionId: string;
  /** Tâches personnalisées du logement (depuis logement.checklist_template) */
  checklistTemplate: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après que le rapport a été soumis avec succès */
  onSuccess: () => void;
}

// ─── Sous-composant : aperçu photo ────────────────────────────────────────────

function PhotoGrid({
  photos,
  onRemove,
  onAdd,
  disabled,
  label,
}: {
  photos: PhotoPreview[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        <div key={index} className="relative group aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt={`${label} ${index + 1}`}
            className="w-full h-full object-cover rounded-lg border"
          />
          <button
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
            aria-label="Supprimer cette photo"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        disabled={disabled}
        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:pointer-events-none disabled:opacity-50"
      >
        <ImagePlus className="size-5" />
        <span className="text-xs">Ajouter</span>
      </button>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function ModalRapportIntervention({
  interventionId,
  checklistTemplate,
  open,
  onOpenChange,
  onSuccess,
}: ModalRapportInterventionProps) {
  // Initialiser la checklist depuis le template ou les tâches par défaut
  const tachesInitiales: TacheChecklist[] = (
    checklistTemplate?.length ? checklistTemplate : TACHES_DEFAUT
  ).map((label) => ({ label, done: false }));

  const [taches, setTaches] = useState<TacheChecklist[]>(tachesInitiales);
  const [photosApres, setPhotosApres] = useState<PhotoPreview[]>([]);
  const [degatsSignales, setDegatsSignales] = useState(false);
  const [degatsDescription, setDegatsDescription] = useState("");
  const [degatsPhotos, setDegatsPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputApresRef = useRef<HTMLInputElement>(null);
  const fileInputDegatsRef = useRef<HTMLInputElement>(null);

  const terminerMutation = useTerminerMission();

  // ── Calcul de validité du formulaire ────────────────────────────────────
  const toutesLesTachesCochees = taches.every((t) => t.done);
  const assezDePhotos = photosApres.length >= MIN_PHOTOS;
  const degatsValides = !degatsSignales || degatsDescription.trim().length > 0;
  const canSubmit =
    toutesLesTachesCochees && assezDePhotos && degatsValides && !isUploading;

  // ── Handlers checklist ──────────────────────────────────────────────────
  function toggleTache(index: number) {
    setTaches((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  }

  // ── Handlers photos après ────────────────────────────────────────────────
  function handleFilesApres(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotosApres((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    e.target.value = "";
  }

  function removePhotoApres(index: number) {
    setPhotosApres((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Handlers photos dégâts ──────────────────────────────────────────────
  function handleFilesDegats(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setDegatsPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    e.target.value = "";
  }

  function removePhotoDegat(index: number) {
    setDegatsPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Fermeture propre ─────────────────────────────────────────────────────
  function handleClose() {
    if (isUploading) return;
    photosApres.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    degatsPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotosApres([]);
    setDegatsPhotos([]);
    setTaches(tachesInitiales);
    setDegatsSignales(false);
    setDegatsDescription("");
    onOpenChange(false);
  }

  // ── Upload d'un tableau de photos vers Storage ────────────────────────────
  async function uploadPhotos(
    photos: PhotoPreview[],
    folder: string
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const { file } of photos) {
      const compressed = await compressImage(file);
      const ext = file.name.split(".").pop() ?? "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `${folder}/${interventionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, compressed, {
          contentType: compressed.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      urls.push(urlData.publicUrl);
    }
    return urls;
  }

  // ── Soumission du rapport ────────────────────────────────────────────────
  async function handleTerminer() {
    if (!canSubmit) return;

    setIsUploading(true);
    try {
      // 1. Upload photos après intervention
      const urlsApres = await uploadPhotos(photosApres, "interventions");

      // 2. Upload photos dégâts (si applicable)
      const urlsDegats = degatsSignales
        ? await uploadPhotos(degatsPhotos, "degats")
        : [];

      // 3. Appel RPC : crée le rapport + termine l'intervention
      await terminerMutation.mutateAsync({
        interventionId,
        photosIntervention: urlsApres,
        tachesEffectuees: taches,
        degatsSignales,
        degatsDescription: degatsSignales ? degatsDescription.trim() : null,
        degatsPhotos: urlsDegats,
      });

      toast.success("Mission terminée ! Rapport enregistré.");

      // Nettoyage
      photosApres.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      degatsPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotosApres([]);
      setDegatsPhotos([]);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Erreur lors de la soumission du rapport");
      Sentry.captureException(err, {
        extra: { context: "ModalRapportIntervention.handleTerminer", interventionId },
      });
    } finally {
      setIsUploading(false);
    }
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────

  const photosManquantes = Math.max(0, MIN_PHOTOS - photosApres.length);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="size-5" />
            Rapport de fin d&apos;intervention
          </DialogTitle>
        </DialogHeader>

        {/* Contenu scrollable */}
        <ScrollArea className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">

            {/* ── Checklist des tâches ────────────────────────────────── */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Tâches effectuées</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cochez toutes les tâches réalisées avant de terminer.
                </p>
              </div>

              <div className="space-y-2">
                {taches.map((tache, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => toggleTache(index)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {tache.done ? (
                        <CheckSquare className="size-5 text-primary" />
                      ) : (
                        <Square className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                    <span
                      className={`text-sm leading-snug transition-colors ${
                        tache.done
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {tache.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Indicateur de progression */}
              <p
                className={`text-xs font-medium ${
                  toutesLesTachesCochees ? "text-green-600" : "text-orange-600"
                }`}
              >
                {taches.filter((t) => t.done).length}/{taches.length} tâche
                {taches.length > 1 ? "s" : ""} effectuée
                {taches.filter((t) => t.done).length > 1 ? "s" : ""}
              </p>
            </section>

            {/* ── Photos après ────────────────────────────────────────── */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Photos après ménage</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prenez au moins <strong>2 photos</strong> du logement{" "}
                  <strong>après</strong> votre intervention.
                </p>
              </div>

              {photosApres.length > 0 ? (
                <PhotoGrid
                  photos={photosApres}
                  onRemove={removePhotoApres}
                  onAdd={() => fileInputApresRef.current?.click()}
                  disabled={isUploading}
                  label="Photo après"
                />
              ) : (
                <button
                  onClick={() => fileInputApresRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Camera className="size-6" />
                  <span className="text-sm">Appuyer pour ajouter des photos</span>
                </button>
              )}

              <p
                className={`text-xs font-medium ${
                  assezDePhotos ? "text-green-600" : "text-orange-600"
                }`}
              >
                {photosApres.length} photo{photosApres.length > 1 ? "s" : ""}{" "}
                sélectionnée{photosApres.length > 1 ? "s" : ""}
                {photosManquantes > 0 && ` (${photosManquantes} manquante${photosManquantes > 1 ? "s" : ""})`}
              </p>

              <input
                ref={fileInputApresRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesApres}
              />
            </section>

            {/* ── Section dégâts ──────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="degats"
                  checked={degatsSignales}
                  onCheckedChange={(checked) =>
                    setDegatsSignales(checked === true)
                  }
                />
                <Label
                  htmlFor="degats"
                  className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="size-4 text-orange-500" />
                  Dégâts constatés
                </Label>
              </div>

              {degatsSignales && (
                <div className="space-y-3 pl-7 border-l-2 border-orange-200 ml-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="degats-description" className="text-xs font-medium">
                      Description des dégâts{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="degats-description"
                      placeholder="Décrivez les dégâts observés (localisation, nature, gravité estimée)…"
                      value={degatsDescription}
                      onChange={(e) => setDegatsDescription(e.target.value)}
                      rows={3}
                      disabled={isUploading}
                      className="text-sm resize-none"
                    />
                    {degatsDescription.trim().length === 0 && (
                      <p className="text-xs text-destructive">
                        La description est requise si des dégâts sont signalés.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">
                      Photos des dégâts (optionnel)
                    </p>
                    {degatsPhotos.length > 0 ? (
                      <PhotoGrid
                        photos={degatsPhotos}
                        onRemove={removePhotoDegat}
                        onAdd={() => fileInputDegatsRef.current?.click()}
                        disabled={isUploading}
                        label="Photo dégât"
                      />
                    ) : (
                      <button
                        onClick={() => fileInputDegatsRef.current?.click()}
                        disabled={isUploading}
                        className="w-full h-20 rounded-lg border-2 border-dashed border-orange-200 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-orange-400 hover:text-orange-600 transition-colors text-sm"
                      >
                        <Camera className="size-5" />
                        Ajouter des photos
                      </button>
                    )}
                    <input
                      ref={fileInputDegatsRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFilesDegats}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Pied de page fixe */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleTerminer}
            disabled={!canSubmit}
            className="min-w-40"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <CheckSquare className="size-4 mr-2" />
                Terminer l&apos;intervention
                {!canSubmit && (
                  <span className="ml-1 text-xs opacity-60">
                    {!toutesLesTachesCochees
                      ? "(checklist incomplète)"
                      : !assezDePhotos
                      ? `(${photosManquantes} photo${photosManquantes > 1 ? "s" : ""} manquante${photosManquantes > 1 ? "s" : ""})`
                      : !degatsValides
                      ? "(description dégâts requise)"
                      : ""}
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
