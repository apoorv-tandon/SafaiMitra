import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/cleaner/DashboardScreen';
import ChecklistScreen from '../screens/cleaner/ChecklistScreen';
import CustomerFeedbackScreen from '../screens/customer/CustomerFeedbackScreen';
import FeedbackSuccessScreen from '../screens/customer/FeedbackSuccessScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {/* Public routes for QR code scans */}
      <Stack.Screen 
        name="Feedback" 
        component={CustomerFeedbackScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="FeedbackSuccess" 
        component={FeedbackSuccessScreen} 
        options={{ headerShown: false }} 
      />

      {/* Protected routes */}
      {user ? (
        <>
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Checklist" 
            component={ChecklistScreen}
            options={{ title: 'Cleaning Workflow' }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
