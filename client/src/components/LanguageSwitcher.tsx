import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

// Toggles between English and Amharic.
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const next = i18n.language?.startsWith("am") ? "en" : "am";

  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="flex items-center gap-1 text-sm text-zinc-600 hover:text-app-green"
      title="Change language"
    >
      <Languages className="size-4" />
      {next === "am" ? "አማ" : "EN"}
    </button>
  );
};

export default LanguageSwitcher;
