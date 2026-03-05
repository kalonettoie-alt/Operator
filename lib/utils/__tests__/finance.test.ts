import { describe, it, expect } from "vitest";
import {
  calculateInterventionGain,
  calculateMonthlyRevenue,
  calculateMonthlyProviderCost,
  calculateMonthlyBlanchisserie,
  calculateMonthlyGain,
} from "../finance";

// ─── calculateInterventionGain ────────────────────────────────────────────────

describe("calculateInterventionGain", () => {
  it("calcule le gain sans blanchisserie", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: 80,
        prix_prestataire_ht: 50,
        blanchisserie_incluse: false,
        prix_blanchisserie: 0,
      })
    ).toBe(30);
  });

  it("calcule le gain avec blanchisserie", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: 80,
        prix_prestataire_ht: 50,
        blanchisserie_incluse: true,
        prix_blanchisserie: 15,
      })
    ).toBe(45);
  });

  it("ignore la blanchisserie si blanchisserie_incluse = false", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: 80,
        prix_prestataire_ht: 50,
        blanchisserie_incluse: false,
        prix_blanchisserie: 15, // présent mais non inclus
      })
    ).toBe(30);
  });

  it("gère les valeurs nulles (tout à 0)", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: null,
        prix_prestataire_ht: null,
        blanchisserie_incluse: false,
        prix_blanchisserie: null,
      })
    ).toBe(0);
  });

  it("gère blanchisserie_incluse = null (traité comme false)", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: 80,
        prix_prestataire_ht: 50,
        blanchisserie_incluse: null,
        prix_blanchisserie: 15,
      })
    ).toBe(30);
  });

  it("gère un gain négatif (prix presta > prix client)", () => {
    expect(
      calculateInterventionGain({
        prix_client_ttc: 40,
        prix_prestataire_ht: 50,
        blanchisserie_incluse: false,
        prix_blanchisserie: null,
      })
    ).toBe(-10);
  });
});

// ─── calculateMonthlyRevenue ──────────────────────────────────────────────────

describe("calculateMonthlyRevenue", () => {
  it("somme les prix_client_ttc des interventions terminées", () => {
    expect(
      calculateMonthlyRevenue([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
      ])
    ).toBe(180);
  });

  it("exclut les interventions annulées", () => {
    expect(
      calculateMonthlyRevenue([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "annulee" },
      ])
    ).toBe(80);
  });

  it("exclut les interventions en_cours (bug précédent)", () => {
    expect(
      calculateMonthlyRevenue([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
      ])
    ).toBe(80);
  });

  it("exclut les interventions assignées, acceptées, refusées, à attribuer", () => {
    expect(
      calculateMonthlyRevenue([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "assignee" },
        { prix_client_ttc: 120, prix_prestataire_ht: 70, blanchisserie_incluse: false, prix_blanchisserie: null, status: "acceptee" },
        { prix_client_ttc: 90, prix_prestataire_ht: 55, blanchisserie_incluse: false, prix_blanchisserie: null, status: "refusee" },
        { prix_client_ttc: 110, prix_prestataire_ht: 65, blanchisserie_incluse: false, prix_blanchisserie: null, status: "a_attribuer" },
      ])
    ).toBe(80);
  });

  it("retourne 0 pour une liste vide", () => {
    expect(calculateMonthlyRevenue([])).toBe(0);
  });

  it("retourne 0 si aucune intervention n'est terminée", () => {
    expect(
      calculateMonthlyRevenue([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "assignee" },
      ])
    ).toBe(0);
  });
});

// ─── calculateMonthlyProviderCost ─────────────────────────────────────────────

describe("calculateMonthlyProviderCost", () => {
  it("somme les prix_prestataire_ht des interventions terminées", () => {
    expect(
      calculateMonthlyProviderCost([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
      ])
    ).toBe(110);
  });

  it("exclut les interventions annulées", () => {
    expect(
      calculateMonthlyProviderCost([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "annulee" },
      ])
    ).toBe(50);
  });

  it("exclut les interventions en_cours (bug précédent)", () => {
    expect(
      calculateMonthlyProviderCost([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
      ])
    ).toBe(50);
  });

  it("exclut les interventions assignées, acceptées, refusées, à attribuer", () => {
    expect(
      calculateMonthlyProviderCost([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "assignee" },
        { prix_client_ttc: 120, prix_prestataire_ht: 70, blanchisserie_incluse: false, prix_blanchisserie: null, status: "acceptee" },
        { prix_client_ttc: 90, prix_prestataire_ht: 55, blanchisserie_incluse: false, prix_blanchisserie: null, status: "refusee" },
        { prix_client_ttc: 110, prix_prestataire_ht: 65, blanchisserie_incluse: false, prix_blanchisserie: null, status: "a_attribuer" },
      ])
    ).toBe(50);
  });

  it("retourne 0 si aucune intervention n'est terminée", () => {
    expect(
      calculateMonthlyProviderCost([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
      ])
    ).toBe(0);
  });
});

// ─── calculateMonthlyBlanchisserie ────────────────────────────────────────────

describe("calculateMonthlyBlanchisserie", () => {
  it("somme uniquement les interventions terminées avec blanchisserie incluse", () => {
    expect(
      calculateMonthlyBlanchisserie([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 15, status: "terminee" },
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: 15, status: "terminee" },
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 20, status: "terminee" },
      ])
    ).toBe(35);
  });

  it("exclut les interventions annulées", () => {
    expect(
      calculateMonthlyBlanchisserie([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 15, status: "annulee" },
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 20, status: "terminee" },
      ])
    ).toBe(20);
  });

  it("exclut les interventions en_cours avec blanchisserie (bug précédent)", () => {
    expect(
      calculateMonthlyBlanchisserie([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 15, status: "terminee" },
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 20, status: "en_cours" },
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 10, status: "assignee" },
      ])
    ).toBe(15);
  });
});

// ─── calculateMonthlyGain ─────────────────────────────────────────────────────

describe("calculateMonthlyGain", () => {
  it("calcule le gain total des interventions terminées", () => {
    // Intervention 1 : gain = 80 - 50 = 30
    // Intervention 2 : gain = 100 + 15 - 60 = 55
    expect(
      calculateMonthlyGain([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: true, prix_blanchisserie: 15, status: "terminee" },
      ])
    ).toBe(85);
  });

  it("exclut les interventions annulées du gain total", () => {
    expect(
      calculateMonthlyGain([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "annulee" },
      ])
    ).toBe(30);
  });

  it("exclut les interventions en_cours du gain total (bug précédent)", () => {
    expect(
      calculateMonthlyGain([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
      ])
    ).toBe(30);
  });

  it("exclut tous les statuts intermédiaires (assignee, acceptee, refusee, a_attribuer)", () => {
    expect(
      calculateMonthlyGain([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "assignee" },
        { prix_client_ttc: 120, prix_prestataire_ht: 70, blanchisserie_incluse: false, prix_blanchisserie: null, status: "acceptee" },
        { prix_client_ttc: 90, prix_prestataire_ht: 55, blanchisserie_incluse: false, prix_blanchisserie: null, status: "refusee" },
        { prix_client_ttc: 110, prix_prestataire_ht: 65, blanchisserie_incluse: false, prix_blanchisserie: null, status: "a_attribuer" },
      ])
    ).toBe(30); // gain = 80 - 50 = 30
  });

  it("retourne 0 pour une liste vide", () => {
    expect(calculateMonthlyGain([])).toBe(0);
  });

  it("retourne 0 si aucune intervention n'est terminée", () => {
    expect(
      calculateMonthlyGain([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "en_cours" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "assignee" },
      ])
    ).toBe(0);
  });
});
