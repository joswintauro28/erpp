"use client";

interface RecordIframeProps {
  record: Record<string, unknown>;
  entityName: string;
}

function formatKey(key: string, entityName: string) {
  if (entityName === "Requirement" && key === "name") return "Requirements";
  if (entityName === "Opportunity" && key === "name") return "Deal";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(_key: string, value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function RecordIframe({ record, entityName }: RecordIframeProps) {
  const ignoredKeys = [
    "id", "id_str", "file_data", "files", "updated_at",
    "last_contact", "last_login", "date", "date_raised",
  ];
  const fields = Object.entries(record).filter(
    ([key]) => !ignoredKeys.includes(key),
  );
  const nameField =
    (record.name as string) ||
    (record.title as string) ||
    (record.account as string) ||
    (record.id_str as string) ||
    "Record Details";
  const subTitleField =
    (record.company as string) ||
    (record.category as string) ||
    (record.stage as string) ||
    (record.type as string) ||
    "";

  const htmlContent = `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
          .details-sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
          .subtitle { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
          .details-list { font-size: 13px; }
          .details-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .details-label { color: #64748b; font-weight: 500; }
          .details-val { font-weight: 600; color: #1e293b; }
        </style>
      </head>
      <body>
        <div class="details-sheet">
          <div class="header">
            <h1 class="title">${nameField}</h1>
            ${subTitleField ? `<p class="subtitle">${subTitleField}</p>` : ""}
          </div>
          <div class="details-list">
            ${fields
              .map(
                ([key, val]) => `
              <div class="details-item">
                <span class="details-label">${formatKey(key, entityName)}</span>
                <span class="details-val">${formatValue(key, val)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-[360px] rounded-lg border border-border"
      title={nameField}
    />
  );
}
