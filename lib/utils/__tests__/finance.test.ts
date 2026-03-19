import { describe, it, expect } from "vitest";
import {
  calculateInterventionGain,
  calculateMonthlyRevenue,
  calculateMonthlyProviderCost,
  calculateMonthlyBlanchisserie,
  calculateMonthlyGain,
  calculateClientMonthlyBilling,
  countWorkingDaysInMonth,
  simulateLogementRevenue,
  simulateCroissance,
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

// ─── countWorkingDaysInMonth ──────────────────────────────────────────────────

describe("countWorkingDaysInMonth", () => {
  it("calcule les jours ouvrés (lun-sam) de mars 2026 — 26 jours", () => {
    // Mars 2026 : 31 jours, commence un dimanche → 5 dimanches → 31 - 5 = 26
    expect(countWorkingDaysInMonth(2026, 3)).toBe(26);
  });

  it("calcule les jours ouvrés de février 2026 — 24 jours", () => {
    // Fév 2026 : 28 jours, commence un dimanche → 4 dimanches → 28 - 4 = 24
    expect(countWorkingDaysInMonth(2026, 2)).toBe(24);
  });

  it("calcule les jours ouvrés de janvier 2026 — 27 jours", () => {
    // Jan 2026 : 31 jours, commence un jeudi → dimanches les 4,11,18,25 → 31 - 4 = 27
    expect(countWorkingDaysInMonth(2026, 1)).toBe(27);
  });

  it("retourne un nombre positif pour n'importe quel mois valide", () => {
    for (let m = 1; m <= 12; m++) {
      expect(countWorkingDaysInMonth(2026, m)).toBeGreaterThan(0);
    }
  });
});

// ─── simulateLogementRevenue ──────────────────────────────────────────────────

describe("simulateLogementRevenue", () => {
  it("calcule les revenus mensuels sans blanchisserie", () => {
    const result = simulateLogementRevenue({
      prix_client_ttc:       80,
      prix_prestataire_ht:   50,
      nb_interventions_mois:  4,
      blanchisserie_incluse: false,
      prix_blanchisserie:     0,
    });
    // revenuParIntervention = 80, gainParIntervention = 30
    expect(result.revenuMensuel).toBe(320);          // 80 × 4
    expect(result.coutMensuel).toBe(200);            // 50 × 4
    expect(result.gainMensuel).toBe(120);            // 30 × 4
    expect(result.gainAnnuel).toBe(1440);            // 120 × 12
    expect(result.margePercent).toBeCloseTo(37.5, 1); // 120 / 320
  });

  it("calcule les revenus mensuels avec blanchisserie", () => {
    const result = simulateLogementRevenue({
      prix_client_ttc:       100,
      prix_prestataire_ht:    60,
      nb_interventions_mois:   4,
      blanchisserie_incluse:  true,
      prix_blanchisserie:     15,
    });
    // gainParIntervention = 100 + 15 - 60 = 55, revenuParIntervention = 115
    expect(result.revenuMensuel).toBe(460);           // 115 × 4
    expect(result.coutMensuel).toBe(240);             // 60 × 4
    expect(result.gainMensuel).toBe(220);             // 55 × 4
    expect(result.gainAnnuel).toBe(2640);             // 220 × 12
    expect(result.margePercent).toBeCloseTo(47.83, 1); // 220 / 460
  });

  it("retourne 0 pour 0 interventions par mois", () => {
    const result = simulateLogementRevenue({
      prix_client_ttc:       80,
      prix_prestataire_ht:   50,
      nb_interventions_mois:  0,
      blanchisserie_incluse: false,
      prix_blanchisserie:     0,
    });
    expect(result.revenuMensuel).toBe(0);
    expect(result.gainMensuel).toBe(0);
    expect(result.gainAnnuel).toBe(0);
    expect(result.margePercent).toBe(0);
  });

  it("gère une marge négative (presta > client)", () => {
    const result = simulateLogementRevenue({
      prix_client_ttc:       40,
      prix_prestataire_ht:   50,
      nb_interventions_mois:  3,
      blanchisserie_incluse: false,
      prix_blanchisserie:     0,
    });
    expect(result.gainMensuel).toBe(-30);           // -10 × 3
    expect(result.margePercent).toBeCloseTo(-25, 1); // -30 / 120
  });
});

// ─── calculateClientMonthlyBilling ────────────────────────────────────────────

describe("calculateClientMonthlyBilling", () => {
  it("somme ménage + blanchisserie pour les interventions terminées", () => {
    // Intervention 1 : 80 + 0 = 80, Intervention 2 : 100 + 15 = 115 → total 195
    expect(
      calculateClientMonthlyBilling([
        { prix_client_ttc: 80,  prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: true,  prix_blanchisserie: 15,   status: "terminee" },
      ])
    ).toBe(195);
  });

  it("n'inclut pas la blanchisserie si blanchisserie_incluse = false", () => {
    expect(
      calculateClientMonthlyBilling([
        { prix_client_ttc: 80, prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: 15, status: "terminee" },
      ])
    ).toBe(80); // 15€ non inclus
  });

  it("exclut les interventions annulées", () => {
    expect(
      calculateClientMonthlyBilling([
        { prix_client_ttc: 80,  prix_prestataire_ht: 50, blanchisserie_incluse: false, prix_blanchisserie: null, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: false, prix_blanchisserie: null, status: "annulee"  },
      ])
    ).toBe(80);
  });

  it("exclut les interventions en_cours", () => {
    expect(
      calculateClientMonthlyBilling([
        { prix_client_ttc: 80,  prix_prestataire_ht: 50, blanchisserie_incluse: true, prix_blanchisserie: 10, status: "terminee" },
        { prix_client_ttc: 100, prix_prestataire_ht: 60, blanchisserie_incluse: true, prix_blanchisserie: 15, status: "en_cours" },
      ])
    ).toBe(90); // 80 + 10 = 90
  });

  it("retourne 0 pour une liste vide", () => {
    expect(calculateClientMonthlyBilling([])).toBe(0);
  });

  it("gère les valeurs nulles", () => {
    expect(
      calculateClientMonthlyBilling([
        { prix_client_ttc: null, prix_prestataire_ht: null, blanchisserie_incluse: true, prix_blanchisserie: null, status: "terminee" },
      ])
    ).toBe(0);
  });
});

// ─── simulateCroissance ───────────────────────────────────────────────────────

describe("simulateCroissance", () => {
  it("projette CA, coût, gain et nb prestataires pour un parc donné", () => {
    const result = simulateCroissance({
      nbLogements:                          10,
      interventionsMoyennesParLogementMois:  4,
      prixMoyenClient:                      100,
      prixMoyenPrestataire:                  60,
      maxDailyInterventionsParPresta:         3,
    });
    // totalInterventions = 10 × 4 = 40
    expect(result.totalInterventionsMois).toBe(40);
    expect(result.caMensuel).toBe(4000);    // 40 × 100
    expect(result.coutMensuel).toBe(2400);  // 40 × 60
    expect(result.gainMensuel).toBe(1600);  // 4000 - 2400
    expect(result.caAnnuel).toBe(48000);    // 4000 × 12
    expect(result.gainAnnuel).toBe(19200);  // 1600 × 12
    expect(result.margePercent).toBe(40);   // 1600 / 4000
    // capacite = 3 × 26 = 78 → ceil(40 / 78) = 1
    expect(result.nbPrestatairesNecessaires).toBe(1);
  });

  it("calcule le bon nombre de prestataires quand la charge dépasse 1", () => {
    const result = simulateCroissance({
      nbLogements:                          50,
      interventionsMoyennesParLogementMois:  4,
      prixMoyenClient:                      100,
      prixMoyenPrestataire:                  60,
      maxDailyInterventionsParPresta:         3,
    });
    // totalInterventions = 200, capacite = 78 → ceil(200 / 78) = 3
    expect(result.totalInterventionsMois).toBe(200);
    expect(result.nbPrestatairesNecessaires).toBe(3);
  });

  it("retourne 0 prestataires si maxDailyInterventions = 0 (division par zéro)", () => {
    const result = simulateCroissance({
      nbLogements:                          10,
      interventionsMoyennesParLogementMois:  4,
      prixMoyenClient:                      100,
      prixMoyenPrestataire:                  60,
      maxDailyInterventionsParPresta:         0,
    });
    expect(result.nbPrestatairesNecessaires).toBe(0);
  });

  it("retourne tout à 0 pour 0 logements", () => {
    const result = simulateCroissance({
      nbLogements:                           0,
      interventionsMoyennesParLogementMois:   4,
      prixMoyenClient:                       100,
      prixMoyenPrestataire:                   60,
      maxDailyInterventionsParPresta:          3,
    });
    expect(result.totalInterventionsMois).toBe(0);
    expect(result.caMensuel).toBe(0);
    expect(result.nbPrestatairesNecessaires).toBe(0);
    expect(result.margePercent).toBe(0);
  });
});
