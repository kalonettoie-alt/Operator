"use client";

// Formulaire de création / modification d'un logement.
// Utilisé dans un Dialog sur /admin/logements.

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

import { useClients } from "@/lib/hooks/useProfiles";
import {
  useCreateLogement,
  useUpdateLogement,
  type LogementWithClient,
} from "@/lib/hooks/useLogements";
import { BLANCHISSERIE_TYPES } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Schéma de validation ─────────────────────────────────────────────────────

// Les champs numériques sont convertis en number | null via setValueAs dans register.
// Le schéma Zod ne reçoit donc que des number | null, jamais des strings.
const schema = z.object({
  client_id: z.string().min(1, "Le client est requis"),
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  city: z.string().min(1, "La ville est requise"),
  postal_code: z.string().min(1, "Le code postal est requis"),
  zone: z.string().nullable().optional(),
  access_code: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  prix_client_ttc: z.number().min(0, "Doit être positif ou nul").nullable(),
  prix_prestataire_ht: z.number().min(0, "Doit être positif ou nul").nullable(),
  type_blanchisserie: z.enum([
    BLANCHISSERIE_TYPES.AUCUNE,
    BLANCHISSERIE_TYPES.INTERVENTION,
    BLANCHISSERIE_TYPES.FORFAIT,
  ]),
  prix_blanchisserie: z.number().min(0, "Doit être positif ou nul").nullable(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  logement?: LogementWithClient; // présent → mode édition
  onSuccess: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function LogementForm({ logement, onSuccess }: Props) {
  const isEdit = !!logement;
  const { data: clients } = useClients();
  const createMutation = useCreateLogement();
  const updateMutation = useUpdateLogement();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: logement?.client_id ?? "",
      name: logement?.name ?? "",
      address: logement?.address ?? "",
      city: logement?.city ?? "",
      postal_code: logement?.postal_code ?? "",
      zone: logement?.zone ?? null,
      access_code: logement?.access_code ?? null,
      instructions: logement?.instructions ?? null,
      prix_client_ttc: logement?.prix_client_ttc ?? null,
      prix_prestataire_ht: logement?.prix_prestataire_ht ?? null,
      type_blanchisserie:
        (logement?.type_blanchisserie as FormData["type_blanchisserie"]) ??
        BLANCHISSERIE_TYPES.AUCUNE,
      prix_blanchisserie: logement?.prix_blanchisserie ?? null,
    },
  });

  // Marge calculée en temps réel
  const prixClient = watch("prix_client_ttc") ?? 0;
  const prixPrestataire = watch("prix_prestataire_ht") ?? 0;
  const typeBlanchisserie = watch("type_blanchisserie");
  const marge = (prixClient as number) - (prixPrestataire as number);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: logement.id, ...data });
        toast.success("Logement modifié avec succès");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Logement créé avec succès");
      }
      onSuccess();
    } catch (error) {
      toast.error(
        isEdit ? "Erreur lors de la modification" : "Erreur lors de la création"
      );
      Sentry.captureException(error);
    }
  };

  // Classe partagée pour les selects (alignée avec Input)
  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Client */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="client_id">
          Client *
        </label>
        <select id="client_id" className={selectClass} {...register("client_id")}>
          <option value="">Sélectionner un client</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        {errors.client_id && (
          <p className="text-xs text-destructive">{errors.client_id.message}</p>
        )}
      </div>

      {/* Nom */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="name">
          Nom du logement *
        </label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Appartement Paris 10"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Adresse, CP, Ville */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="address">
            Adresse *
          </label>
          <Input
            id="address"
            {...register("address")}
            placeholder="12 rue de la Paix"
          />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="postal_code">
              Code postal *
            </label>
            <Input
              id="postal_code"
              {...register("postal_code")}
              placeholder="75010"
            />
            {errors.postal_code && (
              <p className="text-xs text-destructive">
                {errors.postal_code.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="city">
              Ville *
            </label>
            <Input id="city" {...register("city")} placeholder="Paris" />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Zone */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="zone">
          Zone (optionnel)
        </label>
        <Input
          id="zone"
          {...register("zone")}
          placeholder="Zone Nord, Paris Centre…"
        />
      </div>

      {/* Code accès */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="access_code">
          Code d&apos;accès
        </label>
        <Input
          id="access_code"
          {...register("access_code")}
          placeholder="1234#"
        />
      </div>

      {/* Instructions */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="instructions">
          Instructions prestataire
        </label>
        <textarea
          id="instructions"
          rows={3}
          {...register("instructions")}
          placeholder="Clé sous le paillasson, sonnette gauche…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
      </div>

      {/* Tarification */}
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Tarification</p>
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

        {/* Marge temps réel */}
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          Marge nette :{" "}
          <span
            className={`font-semibold tabular-nums ${
              marge >= 0 ? "text-green-600" : "text-destructive"
            }`}
          >
            {marge.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Blanchisserie */}
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Blanchisserie</p>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="type_blanchisserie">
            Type
          </label>
          <select
            id="type_blanchisserie"
            className={selectClass}
            {...register("type_blanchisserie")}
          >
            <option value={BLANCHISSERIE_TYPES.AUCUNE}>Aucune</option>
            <option value={BLANCHISSERIE_TYPES.INTERVENTION}>
              Par intervention
            </option>
            <option value={BLANCHISSERIE_TYPES.FORFAIT}>Forfait mensuel</option>
          </select>
        </div>

        {typeBlanchisserie !== BLANCHISSERIE_TYPES.AUCUNE && (
          <div className="space-y-1">
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
            />
            {errors.prix_blanchisserie && (
              <p className="text-xs text-destructive">
                {errors.prix_blanchisserie.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bouton de soumission */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Enregistrement…"
            : isEdit
            ? "Modifier le logement"
            : "Créer le logement"}
        </Button>
      </div>
    </form>
  );
}
