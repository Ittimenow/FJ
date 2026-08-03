import { PERSONAL_DATA_CONSENT_TEXT, PERSONAL_DATA_CONSENT_VERSION } from "@cashflow/shared";
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных | Финансовое путешествие",
  alternates: { canonical: "/personal-data-consent" }
};

export default function PersonalDataConsentPage() {
  const [heading, ...paragraphs] = PERSONAL_DATA_CONSENT_TEXT.split("\n\n");
  return (
    <LegalDocument title={heading ?? "Согласие на обработку персональных данных"} version={formatVersion(PERSONAL_DATA_CONSENT_VERSION)}>
      <div className="rounded-xl bg-[#fff0df] p-4 font-semibold text-[#8a3d0a]" role="note">
        Реквизиты и контакты оператора будут добавлены владельцем сервиса. До этого документ не является окончательной редакцией для публичного запуска.
      </div>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </LegalDocument>
  );
}

function formatVersion(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
