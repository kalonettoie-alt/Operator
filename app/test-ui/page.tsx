"use client";

// Page de test UI — À SUPPRIMER avant la mise en production
// Vérifie que shadcn/ui et Sonner sont correctement configurés

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test UI — shadcn/ui + Sonner</h1>
          <p className="text-gray-500 text-sm mt-1">
            Page de validation — à supprimer avant la mise en production.
          </p>
        </div>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Utilisés pour les statuts des interventions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Par défaut</Badge>
            <Badge variant="secondary">Secondaire</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Erreur</Badge>
          </CardContent>
        </Card>

        {/* Boutons */}
        <Card>
          <CardHeader>
            <CardTitle>Boutons</CardTitle>
            <CardDescription>Toutes les variantes de boutons disponibles</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Principal</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Supprimer</Button>
          </CardContent>
        </Card>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Champs de formulaire</CardTitle>
            <CardDescription>Input standard utilisé dans les formulaires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Nom du logement..." />
            <Input placeholder="Prix HT..." type="number" />
            <Input placeholder="Désactivé" disabled />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Onglets</CardTitle>
            <CardDescription>Navigation entre sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="interventions">
              <TabsList>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="logements">Logements</TabsTrigger>
                <TabsTrigger value="finances">Finances</TabsTrigger>
              </TabsList>
              <TabsContent value="interventions" className="pt-4 text-sm text-gray-600">
                Liste des interventions à venir...
              </TabsContent>
              <TabsContent value="logements" className="pt-4 text-sm text-gray-600">
                Liste des logements gérés...
              </TabsContent>
              <TabsContent value="finances" className="pt-4 text-sm text-gray-600">
                Récapitulatif financier...
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Toasts */}
        <Card>
          <CardHeader>
            <CardTitle>Toasts (Sonner)</CardTitle>
            <CardDescription>Notifications utilisées à la place des alert()</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => toast.success("Intervention enregistrée avec succès")}>
              Toast succès
            </Button>
            <Button variant="destructive" onClick={() => toast.error("Erreur lors de l&apos;enregistrement")}>
              Toast erreur
            </Button>
            <Button variant="outline" onClick={() => toast.info("Synchronisation en cours...")}>
              Toast info
            </Button>
            <Button variant="secondary" onClick={() => toast.warning("Aucun prestataire disponible")}>
              Toast avertissement
            </Button>
          </CardContent>
          <CardFooter className="text-xs text-gray-400">
            Les toasts apparaissent en bas à droite de l&apos;écran
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
