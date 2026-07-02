import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Dashboard: undefined;
  Checklist: { washroomId: string; washroomName: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Washroom {
  id: string;
  name: string;
}

export default function DashboardScreen() {
  const { userData, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [washrooms, setWashrooms] = useState<Washroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [userData]);

  const fetchAssignments = async () => {
    if (!userData?.tenantId) return;
    try {
      // In a real scenario we'd query cleaner_assignments first, but for dummy we just query washrooms in tenant
      const q = query(collection(db, 'washrooms'), where('tenantId', '==', userData.tenantId));
      const querySnapshot = await getDocs(q);
      const items: Washroom[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, name: doc.data().name } as Washroom);
      });
      setWashrooms(items);
    } catch (error) {
      console.error("Error fetching washrooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderWashroom = ({ item }: { item: Washroom }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Checklist', { washroomId: item.id, washroomName: item.name })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>
      <Text style={styles.cardAction}>Tap to start cleaning workflow →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.name}>{userData?.name || 'Cleaner'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Assigned Washrooms</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
        ) : washrooms.length === 0 ? (
          <Text style={styles.emptyText}>No washrooms assigned currently.</Text>
        ) : (
          <FlatList
            data={washrooms}
            keyExtractor={(item) => item.id}
            renderItem={renderWashroom}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#16a34a',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    color: '#dcfce7',
    fontSize: 14,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardAction: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  }
});
