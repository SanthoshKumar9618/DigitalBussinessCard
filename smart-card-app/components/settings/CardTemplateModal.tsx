import { Modal, View, Text, TouchableOpacity } from "react-native";
import { CARD_TEMPLATES } from "../../constants/cardTemplates";
import { useApp } from "../context/AppContext";

export default function CardTemplateModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { settings, updateSetting, colors } = useApp();

  // ✅ THIS LINE FIXES THE ERROR
  if (!settings) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            padding: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 16,
            }}
          >
            Card Template
          </Text>

          {CARD_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl.id}
              onPress={() => {
                updateSetting("card_template", tpl.id);
                onClose();
              }}
              style={{ paddingVertical: 14 }}
            >
              <Text
                style={{
                  color:
                    settings.card_template === tpl.id
                      ? colors.primary
                      : colors.text,
                }}
              >
                {tpl.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
