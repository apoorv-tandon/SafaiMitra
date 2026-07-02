import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';

export default function FeedbackSuccessScreen() {
  const route = useRoute<any>();
  const lang = route.params?.lang || 'en';
  
  const texts = {
    en: {
      title: 'Thank You!',
      msg: 'Your feedback has been recorded successfully.',
      submsg: 'We appreciate your help in keeping our facilities clean.'
    },
    hi: {
      title: 'धन्यवाद!',
      msg: 'आपकी प्रतिक्रिया सफलतापूर्वक दर्ज कर ली गई है।',
      submsg: 'हमारी सुविधाओं को स्वच्छ रखने में आपकी मदद की सराहना करते हैं।'
    }
  };
  
  const t = texts[lang as keyof typeof texts];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <FontAwesome name="check-circle" size={100} color="#22c55e" />
      </View>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.message}>{t.msg}</Text>
      <Text style={styles.submessage}>{t.submsg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
