// lib/invoices/email.ts
// Logique d'email pour les factures, partagée entre :
//   - app/api/invoices/[id]/send/route.ts  (envoi manuel admin)
//   - app/api/cron/generate-invoices/route.ts  (envoi automatique cron)

// Calcule la due_date = period_end + 5 jours calendaires
export function computeDueDate(periodEnd: string): string {
  const d = new Date(periodEnd);
  d.setDate(d.getDate() + 5);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(value);
}

export interface BuildEmailHtmlParams {
  clientName:    string;
  invoiceNumber: string;
  periodStart:   string;
  periodEnd:     string;
  totalTtc:      number;
  dueDate:       string;
  pdfUrl:        string;
  companyName:   string;
  companyEmail:  string;
  companyPhone:  string;
}

export function buildEmailHtml(params: BuildEmailHtmlParams): string {
  const {
    clientName, invoiceNumber, periodStart, periodEnd,
    totalTtc, dueDate, pdfUrl, companyName, companyEmail, companyPhone,
  } = params;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- En-tête doré -->
          <tr>
            <td style="background:#8B7D3C;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                ${companyName.toUpperCase()}
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">
                Facture N° ${invoiceNumber}
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 20px;font-size:15px;color:#444;">
                Bonjour <strong>${clientName}</strong>,
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                Veuillez trouver ci-joint votre facture pour la période du
                <strong>${formatDate(periodStart)}</strong> au <strong>${formatDate(periodEnd)}</strong>,
                correspondant aux prestations de nettoyage et blanchisserie réalisées dans vos logements.
              </p>

              <!-- Récapitulatif -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#faf8f2;border:1px solid #e8e0c8;border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">N° de facture</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">${invoiceNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">Période</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">
                          ${formatDate(periodStart)} → ${formatDate(periodEnd)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">Date d'échéance</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">${formatDate(dueDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#1a1a1a;">Total TTC</td>
                        <td style="font-size:18px;font-weight:700;color:#8B7D3C;text-align:right;">
                          ${formatPrix(totalTtc)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bouton téléchargement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${pdfUrl}"
                      style="display:inline-block;background:#8B7D3C;color:#ffffff;text-decoration:none;
                             padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;
                             letter-spacing:0.5px;">
                      Télécharger la facture PDF
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              <p style="margin:0 0 28px;font-size:11px;color:#aaa;text-align:center;word-break:break-all;">
                ${pdfUrl}
              </p>

              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                Pour toute question concernant cette facture, n'hésitez pas à nous contacter :
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#555;">
                ${companyEmail ? `<a href="mailto:${companyEmail}" style="color:#8B7D3C;">${companyEmail}</a>` : ""}
                ${companyPhone ? ` · ${companyPhone}` : ""}
              </p>

            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:#f0ece0;padding:16px 40px;text-align:center;border-top:1px solid #e8e0c8;">
              <p style="margin:0;font-size:11px;color:#aaa;">
                ${companyName} · Règlement à réception · TVA 20%
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
