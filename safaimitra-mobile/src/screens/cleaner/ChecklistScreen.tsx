import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { addToOfflineQueue } from '../../lib/storage';

export default function ChecklistScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { washroomId, washroomName } = route.params;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const [checklist, setChecklist] = useState({
    floor: false,
    sink: false,
    mirror: false,
    soap: false,
    dustbin: false,
    toilet: false
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && locationStatus === 'granted');
      
      if (locationStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    })();
  }, []);

  const toggleItem = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    const allChecked = Object.values(checklist).every(v => v);
    if (!allChecked) {
      Alert.alert('Incomplete', 'Please complete all checklist items before submitting.');
      return;
    }

    setSubmitting(true);

    const submissionData = {
      cleanerId: userData?.uid,
      washroomId,
      tenantId: userData?.tenantId,
      timestamp: serverTimestamp(), // If offline, will need to use Date.now() instead
      location: location ? {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      } : null,
      checklist,
      photos: ["dummy_photo_url.jpg"], // Placeholder for Expo Camera capture upload
      status: 'synced'
    };

    try {
      // Try online submission
      await addDoc(collection(db, 'cleaning_submissions'), submissionData);
      Alert.alert('Success', 'Cleaning proof submitted successfully!');
      navigation.goBack();
    } catch (error) {
      // Fallback to offline queue
      console.log("Network error, saving to offline queue");
      submissionData.status = 'pending_sync';
      submissionData.timestamp = Date.now(); // Replace server timestamp with local
      await addToOfflineQueue(submissionData);
      Alert.alert('Offline Mode', 'Saved locally. Will sync when online.');
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera or location</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{washroomName}</Text>
        <Text style={styles.subtitle}>Complete the checklist and capture photos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Checklist</Text>
        
        {Object.entries(checklist).map(([key, value]) => (
          <TouchableOpacity 
            key={key} 
            style={styles.checkItem}
            onPress={() => toggleItem(key as keyof typeof checklist)}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkText}>
              {key.charAt(0).toUpperCase() + key.slice(1)} Cleaned/Refilled
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Photo Evidence</Text>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>[ Camera Viewport Placeholder ]</Text>
          <Text style={styles.cameraSubtext}>In a real app, Expo Camera component goes here</Text>
        </View>
        <TouchableOpacity style={styles.captureBtn}>
          <Text style={styles.captureText}>Take Photo (Min 2)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Proof'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkText: {
    fontSize: 15,
    color: '#1e293b',
  },
  cameraPlaceholder: {
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
  },
  captureBtn: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#22c55e',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
