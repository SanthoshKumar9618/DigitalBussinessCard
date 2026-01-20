import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Platform, Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import SafeScreen from "@/components/ui/Screen1";
import {
  getContacts,
  searchContacts,
} from "../../services/contactService";
import { useApp } from "@/components/context/AppContext";
import { useRefresh } from "@/components/context/RefreshContext";
import { BASE_URL } from "@/services/api";
import * as IntentLauncher from "expo-intent-launcher";


export default function NetworkScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { colors } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const searchTimerRef = useRef<number | null>(null);


  
 useFocusEffect(
  useCallback(() => {
    loadContacts(); // 🔥 always refresh when screen opens
  }, [])
);


  const loadContacts = async () => {
    try {
      const res = await getContacts();
      setContacts(res.data);
    } catch (e) {
      console.log("Contacts error", e);
    }
  };

 const handleSearch = (text: string, category?: string) => {
  setSearch(text);

  if (searchTimerRef.current) {
    clearTimeout(searchTimerRef.current);
  }

  searchTimerRef.current = setTimeout(async () => {
    // nothing typed and no category → load all
    if (!text.trim() && !category) {
      loadContacts();
      return;
    }

    let query = text.trim();

    // OPTIONAL: category is just a UI filter, backend still does OR search
    if (category) {
      query = `${query} ${category}`;
    }

    try {
      const res = await searchContacts(query);
      setContacts(res.data);
    } catch (e) {
      console.log("Search error", e);
    }
  }, 300);
};

const openPhoneContacts = async () => {
  if (Platform.OS === "android") {
    await IntentLauncher.startActivityAsync(
      "android.intent.action.VIEW",
      {
        data: "content://contacts/people",
      }
    );
  } else {
    await Linking.openURL("contacts://");
  }
};




  const renderItem = ({ item }: any) => {
  const name = item.saved_display_name;
  const company = item.saved_company;
  const job = item.saved_job_title;
  const avatar = item.target_profile?.avatar_url;
  router.push; 

   return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() =>
        router.push({
          pathname: "/contact/detail",
          params: {
            contact: JSON.stringify(item),
          },
        })
      }
    >
      {avatar ? (
        <Image
          source={{
            uri: avatar.startsWith("http")
              ? avatar
              : `${BASE_URL}${avatar}`,
          }}
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={22} color={colors.subText} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>
          {item.saved_display_name}
        </Text>

        {(item.saved_job_title || item.saved_company) && (
          <Text style={styles.subtitle}>
            {item.saved_job_title}
            {item.saved_company && ` @ ${item.saved_company}`}
          </Text>
        )}

        <View style={styles.badgeRow}>
          {item.source && (
            <Text style={styles.badge}>
              {item.source.toUpperCase()}
            </Text>
          )}
          {item.tag && <Text style={styles.badge}>{item.tag}</Text>}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.subText}
      />
    </TouchableOpacity>
  );
};
    
    
      return (
  <SafeScreen>
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          My Network
        </Text>

        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons
              name="filter-outline"
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
  style={[styles.addBtn, { backgroundColor: colors.card }]}
  onPress={openPhoneContacts}
>
  <Ionicons name="add" size={16} color={colors.text} />
  <Text style={[styles.addText, { color: colors.text }]}>
    Phone Contact
  </Text>
</TouchableOpacity>


        </View>
      </View>

      {/* SEARCH */}
      <View
        style={[styles.searchBox, { backgroundColor: colors.card }]}
      >
        <Ionicons name="search" size={16} color={colors.text} />
        <TextInput
          placeholder="Search profiles, tags, companies..."
          placeholderTextColor={colors.subText}
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={(text) =>
            handleSearch(text, selectedCategory ?? undefined)
          }
        />
      </View>

      {/* CATEGORY FILTER */}
      <View style={styles.tagsRow}>
        {["Business", "Founder", "Investor"].map((tag) => {
          const active = selectedCategory === tag;

          return (
            <TouchableOpacity
              key={tag}
              onPress={() => {
                const next = active ? null : tag;
                setSelectedCategory(next);
                handleSearch(search, next ?? undefined);
              }}
              style={[
                styles.tag,
                {
                  backgroundColor: active
                    ? colors.primary
                    : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: active ? "#FFF" : colors.text },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LIST */}
      <FlatList
      data={contacts}
      extraData={contacts}   // ⭐ THIS IS THE FIX
      keyExtractor={(item, index) => String(item.id ?? index)} // ⭐ SAFETY
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 120 }}
      />

      {contacts.length === 0 && search.trim() !== "" && (
  <View style={{ alignItems: "center", marginTop: 40 }}>
    <Ionicons
      name="search-outline"
      size={36}
      color={colors.subText}
    />
    <Text
      style={{
        marginTop: 10,
        color: colors.subText,
        fontSize: 14,
      }}
    >
      No contacts found
    </Text>
  </View>
)}
    </View>
  </SafeScreen>
);
}


const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    padding: 16,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  addBtn: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginLeft: 12,
  },
  addText: {    
    marginLeft: 6,
    fontSize: 13,
  },
  filterBtn: {
    padding: 6,
    marginRight: 12,
  },

  /* Tags */
  tagsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
  },

  /* Search */
  searchBox: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
  },

  /* Card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  subtitle: {
    color: "#A1A1A1",
    fontSize: 13,
    marginTop: 2,
  },
 
  badgeText: {
    color: "#C9A24D",
    fontSize: 11,
    marginLeft: 4,
  },
  avatarPlaceholder: {
  backgroundColor: "#2A2A2A",
  justifyContent: "center",
  alignItems: "center",
},

badgeRow: {
  flexDirection: "row",
  marginTop: 6,
},

badge: {
  fontSize: 11,
  color: "#C9A24D",
  backgroundColor: "#1C1C1E",
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
  marginRight: 6,
},


});
