"use client";

// Formulaire de création / modification d'une intervention.
// Utilisé dans un Dialog sur /admin/interventions et /admin/interventions/[id].

import { useEffect } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

import { useLogements } from "@/lib/hooks/useLogements";
import { usePrestataires } from "@/lib/hooks/useProfiles";
import {
  useCreateIntervention,
  useUpdateIntervention,
  type InterventionDetail,
} from "@/lib/hooks/useInterventions";
import {
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  INTERVENTION_PRIORITIES,
} from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Schéma de validation ─────────────────────────────────────────────────────

const schema = z.object({
  logement_id: z.string().min(1, "Le logement est requis"),
  prestataire_id: z.string().nullable().optional(),
  date: z.string().min(1, "La date est requise"),
  type: z.enum([
    INTERVENTION_TYPES.MENAGE,
    INTERVENTION_TYPES.ETAT_LIEUX,
    INTERVENTION_TYPES.MAINTENANCE,
  ]),
  nb_voyageurs: z.number().int().min(0).nullable(),
  has_baby: z.boolean(),
  checkin_meme_jour: z.boolean(),
  special_instructions: z.string().nullable().optional(),
  blanchisserie_incluse: z.boolean(),
  prix_blanchisserie: z.number().min(0).nullable(),
  prix_client_ttc: z.number().min(0, "Doit être positif ou nul").nullable(),
  prix_prestataire_ht: z.number().min(0, "Doit être positif ou nul").nullable(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  intervention?: InterventionDetail; // présent → mode édition
  onSuccess: () => void;
}

// ─── Classes partagées ────────────────────────────────────────────────────────

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

// ─── Composant ────────────────────────────────────────────────────────────────

export function InterventionForm({ intervention, onSuccess }: Props) {
  const isEdit = !!intervention;

  const { data: logements, isLoading: logementsLoading } = useLogements();
  const { data: prestataires, isLoading: prestatairesLoading } = usePrestataires();
  const createMutation = useCreateIntervention();
  const updateMutation = useUpdateIntervention();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      logement_id: intervention?.logement_id ?? "",
      // null → chaîne vide pour le select, on convertit au submit
      prestataire_id: intervention?.prestataire_id ?? "",
      date: intervention?.date ?? "",
      type: (intervention?.type as FormData["type"]) ?? INTERVENTION_TYPES.MENAGE,
      nb_voyageurs: intervention?.nb_voyageurs ?? null,
      has_baby: intervention?.has_baby ?? false,
      checkin_meme_jour: intervention?.checkin_meme_jour ?? false,
      special_instructions: intervention?.special_instructions ?? "",
      blanchisserie_incluse: intervention?.blanchisserie_incluse ?? false,
      prix_blanchisserie: intervention?.prix_blanchisserie ?? null,
      prix_client_ttc: intervention?.prix_client_ttc ?? null,
      prix_prestataire_ht: intervention?.prix_prestataire_ht ?? null,
    },
  });

  const selectedLogementId = watch("logement_id");
  const blanchisserieIncluse = watch("blanchisserie_incluse");

  // Remplissage automatique des prix quand le logement change (création uniquement)
  useEffect(() => {
    if (isEdit || !selectedLogementId) return;
    const logement = logements?.find((l) => l.id === selectedLogementId);
    if (!logement) return;
    setValue("prix_client_ttc", logement.prix_client_ttc ?? null);
    setValue("prix_prestataire_ht", logement.prix_prestataire_ht ?? null);
    setValue("prix_blanchisserie", logement.prix_blanchisserie ?? null);
    // Activer la blanchisserie si le logement en prévoit une
    if (logement.type_blanchisserie && logement.type_blanchisserie !== "aucune") {
      setValue("blanchisserie_incluse", true);
    }
  }, [selectedLogementId, logements, isEdit, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      // Status auto : si prestataire → assignee, sinon a_attribuer
      const status = data.prestataire_id
        ? INTERVENTION_STATUSES.ASSIGNEE
        : INTERVENTION_STATUSES.A_ATTRIBUER;

      // Priority auto : check-in même jour → haute, sinon normale
      const priority = data.checkin_meme_jour
        ? INTERVENTION_PRIORITIES.HAUTE
        : INTERVENTION_PRIORITIES.NORMALE;

      // Convertir la chaîne vide du select en null pour la BDD
      const prestataire_id = data.prestataire_id || null;

      if (isEdit) {
        await updateMutation.mutateAsync({
          id: intervention.id,
          ...data,
          prestataire_id,
          status,
          priority,
        });
        toast.success("Intervention modifiée avec succès");
      } else {
        // client_id obligatoire en BDD : récupéré depuis le logement sélectionné
        const logement = logements?.find((l) => l.id === data.logement_id);
        if (!logement) {
          toast.error("Logement introuvable");
          return;
        }
        await createMutation.mutateAsync({
          ...data,
          prestataire_id,
          client_id: logement.client_id,
          status,
          priority,
        });
        toast.success("Intervention créée avec succès");
      }
      onSuccess();
    } catch (error) {
      toast.error(
        isEdit ? "Erreur lors de la modification" : "Erreur lors de la création"
      );
      Sentry.captureException(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Logement — Controller pour que la valeur s'affiche même après chargement async */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="logement_id">
          Logement *
        </label>
        <Controller
          name="logement_id"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              id="logement_id"
              className={selectClass}
              disabled={logementsLoading}
            >
              <option value="">
                {logementsLoading ? "Chargement…" : "Sélectionner un logement"}
              </option>
              {logements?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.city}
                </option>
              ))}
            </select>
          )}
        />
        {errors.logement_id && (
          <p className="text-xs text-destructive">{errors.logement_id.message}</p>
        )}
      </div>

      {/* Date + Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="date">
            Date *
          </label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="type">
            Type *
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <select {...field} id="type" className={selectClass}>
                <option value={INTERVENTION_TYPES.MENAGE}>Ménage</option>
                <option value={INTERVENTION_TYPES.ETAT_LIEUX}>État des lieux</option>
                <option value={INTERVENTION_TYPES.MAINTENANCE}>Maintenance</option>
              </select>
            )}
          />
        </div>
      </div>

      {/* Prestataire — Controller pour la même raison que logement */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="prestataire_id">
          Prestataire{" "}
          <span className="text-muted-foreground font-normal">(optionnel)</span>
        </label>
        <Controller
          name="prestataire_id"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={field.value ?? ""}
              id="prestataire_id"
              className={selectClass}
              disabled={prestatairesLoading}
            >
              <option value="">
                {prestatairesLoading
                  ? "Chargement…"
                  : "Non assigné — statut « À attribuer »"}
              </option>
              {prestataires?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Si un prestataire est sélectionné, le statut devient automatiquement
          &quot;Assignée&quot;.
        </p>
      </div>

      {/* Voyageurs */}
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Informations voyageurs</p>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="nb_voyageurs">
            Nombre de voyageurs
          </label>
          <Input
            id="nb_voyageurs"
            type="number"
            min="0"
            {...register("nb_voyageurs", {
              setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
            })}
            placeholder="2"
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("has_baby")} className="size-4" />
            Bébé présent (lit bébé requis)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("checkin_meme_jour")}
              className="size-4"
            />
            Check-in le même jour{" "}
            <span className="text-xs text-orange-600 font-medium">
              → priorité haute
            </span>
          </label>
        </div>
      </div>

      {/* Instructions spéciales */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="special_instructions">
          Instructions spéciales
        </label>
        <textarea
          id="special_instructions"
          rows={3}
          {...register("special_instructions")}
          placeholder="Attention au chien, clé sous le paillasson…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
      </div>

      {/* Tarification */}
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">
          Tarification{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (pré-rempli depuis le logement, modifiable)
          </span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="prix_client_ttc">
              Prix client TTC (€)
            </label>
            <Input
              id="prix_client_ttc"
              type="number"
              step="0.01"
              min="0"
              {...register("prix_client_ttc", {
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
              placeholder="80"
            />
            {errors.prix_client_ttc && (
              <p className="text-xs text-destructive">
                {errors.prix_client_ttc.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="prix_prestataire_ht">
              Prix prestataire HT (€)
            </label>
            <Input
              id="prix_prestataire_ht"
              type="number"
              step="0.01"
              min="0"
              {...register("prix_prestataire_ht", {
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
              placeholder="50"
            />
            {errors.prix_prestataire_ht && (
              <p className="text-xs text-destructive">
                {errors.prix_prestataire_ht.message}
              </p>
            )}
          </div>
        </div>

        {/* Blanchisserie */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("blanchisserie_incluse")}
              className="size-4"
            />
            Blanchisserie incluse
          </label>
          {blanchisserieIncluse && (
            <div className="space-y-1 ml-6">
              <label className="text-sm font-medium" htmlFor="prix_blanchisserie">
                Prix blanchisserie (€)
              </label>
              <Input
                id="prix_blanchisserie"
                type="number"
                step="0.01"
                min="0"
                {...register("prix_blanchisserie", {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
                placeholder="15"
                className="w-40"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bouton de soumission */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Enregistrement…"
            : isEdit
            ? "Modifier l'intervention"
            : "Créer l'intervention"}
        </Button>
      </div>
    </form>
  );
}
