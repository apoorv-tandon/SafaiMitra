import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FontAwesome } from '@expo/vector-icons';

const ISSUES_EN = ['Bad Smell', 'No Soap', 'Wet Floor', 'Dirty Sink', 'Overflowing Dustbin'];
const ISSUES_HI = ['बदबू', 'साबुन नहीं है', 'गीला फर्श', 'गंदा सिंक', 'कचरा पात्र भरा है'];

const TEXTS = {
  en: {
    title: 'Washroom Feedback',
    subtitle: 'Your feedback helps us maintain hygiene.',
    rate: 'How was your experience?',
    issues: 'Any specific issues?',
    comments: 'Additional Comments (Optional)',
    submit: 'Submit Feedback',
    submitting: 'Submitting...',
    langToggle: 'हिंदी में देखें',
  },
  hi: {
    title: 'शौचालय प्रतिक्रिया',
    subtitle: 'आपकी प्रतिक्रिया हमें स्वच्छता बनाए रखने में मदद करती है।',
    rate: 'आपका अनुभव कैसा रहा?',
    issues: 'कोई विशिष्ट समस्या?',
    comments: 'अतिरिक्त टिप्पणियाँ (वैकल्पिक)',
    submit: 'प्रतिक्रिया सबमिट करें',
    submitting: 'सबमिट हो रहा है...',
    langToggle: 'View in English',
  }
};

export default function CustomerFeedbackScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { washroomId, tenantId } = route.params || { washroomId: 'dummy_washroom', tenantId: 'dummy_tenant' };
  
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [rating, setRating] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = TEXTS[lang];
  const issuesList = lang === 'en' ? ISSUES_EN : ISSUES_HI;

  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert(lang === 'en' ? 'Please select a rating.' : 'कृपया रेटिंग चुनें।');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await addDoc(collection(db, 'customer_feedback'), {
        washroomId,
        tenantId,
        rating,
        issues: selectedIssues,
        comments,
        timestamp: serverTimestamp(),
        language: lang
      });
      navigation.replace('FeedbackSuccess', { lang });
    } catch (error) {
      console.error('Error submitting feedback', error);
      alert(lang === 'en' ? 'Submission failed.' : 'सबमिशन विफल रहा।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity 
        style={styles.langToggle} 
        onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
      >
        <Text style={styles.langText}>{t.langToggle}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.rate}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <FontAwesome 
                name={star <= rating ? 'star' : 'star-o'} 
                size={40} 
                color={star <= rating ? '#fbbf24' : '#cbd5e1'} 
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.issues}</Text>
        <View style={styles.issuesContainer}>
          {issuesList.map((issue) => (
            <TouchableOpacity 
              key={issue} 
              style={[
                styles.issuePill,
                selectedIssues.includes(issue) && styles.issuePillSelected
              ]}
              onPress={() => toggleIssue(issue)}
            >
              <Text style={[
                styles.issueText,
                selectedIssues.includes(issue) && styles.issueTextSelected
              ]}>
                {issue}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.comments}</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          value={comments}
          onChangeText={setComments}
          placeholder="..."
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t.submit}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
    paddingTop: 60, // Space for status bar if not using SafeArea
  },
  langToggle: {
    alignSelf: 'flex-end',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  star: {
    marginHorizontal: 4,
  },
  issuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  issuePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  issuePillSelected: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  issueText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
  issueTextSelected: {
    color: '#991b1b',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#22c55e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitDisabled: {
    backgroundColor: '#86efac',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
