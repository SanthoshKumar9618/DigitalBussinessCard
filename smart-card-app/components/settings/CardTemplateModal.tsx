import { CARD_TEMPLATES } from "../../constants/cardTemplates";
import { useApp } from "../context/AppContext";
import { OptionSheet } from "../ui/kit";

/** Picker for settings.card_template. Not shown yet: no card or page renders templates. */
export default function CardTemplateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, updateSetting } = useApp();
  if (!settings) return null;

  return (
    <OptionSheet
      visible={visible}
      title="Card template"
      value={settings.card_template}
      options={CARD_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
      onSelect={(v) => updateSetting("card_template", v)}
      onClose={onClose}
    />
  );
}
