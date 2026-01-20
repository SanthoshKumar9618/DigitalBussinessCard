import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getContactById, deleteContact } from "../../services/contactService";
import { useApp } from "@/components/context/AppContext";

export default function ContactDetail() {
  const { id } = useLocalSearchParams(); // contact_id
  const router = useRouter();
  const { colors } = useApp();
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    loadContact();
  }, []);

  const loadContact = async () => {
    try {
      const res = await getContactById(id as string);
      setContact(res.data);
    } catch (e) {
      console.log("Contact load error", e);
    }
  };

  if (!contact) return null;

  const profile = contact.target_profile;

  // 🔑 SNAPSHOT FIRST
  const name = contact.saved_display_name ?? profile.display_name;
  const company = contact.saved_company ?? profile.company;
  const job = contact.saved_job_title ?? profile.job_title;
  const phone = contact.saved_phone;
  const email = contact.saved_email;
  const whatsapp = contact.saved_whatsapp;
  const avatar = profile.avatar_url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      {/* BACK */}
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* AVATAR */}
      <Image source={{ uri: avatar }} style={styles.avatar} />

      {/* NAME */}
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>

      {job && (
        <Text style={[styles.role, { color: colors.primary }]}>
          {job}
        </Text>
      )}

      {company && (
        <Text style={[styles.company, { color: colors.subText }]}>
          @ {company}
        </Text>
      )}

      {/* SOURCE + TAG */}
      <View style={styles.metaRow}>
        {contact.source && (
          <Text
            style={[
              styles.metaBadge,
              { backgroundColor: colors.card, color: colors.primary },
            ]}
          >
            {contact.source.toUpperCase()}
          </Text>
        )}

        {contact.tag && (
          <Text
            style={[
              styles.metaBadge,
              { backgroundColor: colors.card, color: colors.text },
            ]}
          >
            {contact.tag}
          </Text>
        )}
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        {phone && (
          <TouchableOpacity
            style={[
              styles.callBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Ionicons name="call" size={18} color="#FFF" />
            <Text style={styles.btnText}>Call</Text>
          </TouchableOpacity>
        )}

        {whatsapp && (
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
            <Text style={styles.btnText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>

      {email && (
        <TouchableOpacity
          style={[
            styles.emailBtn,
            { backgroundColor: colors.card },
          ]}
          onPress={() => Linking.openURL(`mailto:${email}`)}
        >
          <Ionicons name="mail-outline" size={18} color={colors.text} />
          <Text style={[styles.btnText, { color: colors.text }]}>
            Email
          </Text>
        </TouchableOpacity>
      )}

      {/* NOTES */}
      {contact.notes && (
        <>
          <Text
            style={[
              styles.section,
              { color: colors.subText },
            ]}
          >
            NOTES
          </Text>

          <View
            style={[
              styles.box,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.text, { color: colors.text }]}>
              {contact.notes}
            </Text>
          </View>
        </>
      )}

      {/* REMOVE CONTACT */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={async () => {
          await deleteContact(contact.id);
          router.back();
        }}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
        <Text style={styles.deleteText}>Remove Contact</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginTop: 24,
    marginBottom: 16,
  },

  name: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  role: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 6,
  },

  company: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },

  metaBadge: {
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 6,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 12,
  },

  callBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
    flexDirection: "row",
    justifyContent: "center",
  },

  whatsappBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
    flexDirection: "row",
    justifyContent: "center",
  },

  emailBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
  },

  btnText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: 8,
  },

  section: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 28,
    marginBottom: 8,
    letterSpacing: 1,
  },

  box: {
    borderRadius: 14,
    padding: 14,
  },

  text: {
    fontSize: 14,
    lineHeight: 20,
  },

  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
  },

  deleteText: {
    color: "#EF4444",
    marginLeft: 6,
    fontWeight: "600",
  },
});
