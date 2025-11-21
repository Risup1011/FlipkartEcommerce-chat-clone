import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomButton from './CustomButton';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const HelpCenterScreen = ({ onBack, screenTitle = 'Help Center', route }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [expandedFaqs, setExpandedFaqs] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHelpData();
  }, [route]);

  const fetchHelpData = async () => {
    try {
      setIsLoading(true);
      
      // Build API endpoint from route prop
      // route could be "/help-center" or "/partner-faqs"
      let endpoint = route;
      if (!endpoint) {
        // Default to help-center if no route provided
        endpoint = '/help-center';
      }
      
      // Remove leading slash if present
      if (endpoint.startsWith('/')) {
        endpoint = endpoint.substring(1);
      }
      
      // Build full API URL
      const url = `${API_BASE_URL}v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Handle different response structures
        if (data.data?.faqs && Array.isArray(data.data.faqs)) {
          // If backend provides FAQs array
          setFaqs(data.data.faqs);
        } else if (data.data?.items && Array.isArray(data.data.items)) {
          // If backend provides items array
          setFaqs(data.data.items);
        } else if (Array.isArray(data.data)) {
          // If data is directly an array
          setFaqs(data.data);
        } else if (data.data) {
          // If data is an object, try to extract FAQs
          console.warn('⚠️ [HelpCenterScreen] Unexpected data structure, using fallback');
          setFaqs([]);
        } else {
          setFaqs([]);
        }
      } else {
        console.error('❌ [HelpCenterScreen] Failed to fetch help data:', data.message);
        // Use placeholder data as fallback
        setFaqs([
          { id: '1', question: 'What is Kamai24?', answer: 'Kamai24 is a platform for restaurant partners to manage their orders and business.' },
          { id: '2', question: 'How to manage orders?', answer: 'You can view and manage orders from the Orders tab in the bottom navigation.' },
          { id: '3', question: 'How to update menu items?', answer: 'Go to Menu tab and you can add, edit, or remove menu items from there.' },
        ]);
      }
    } catch (error) {
      console.error('❌ [HelpCenterScreen] Error fetching help data:', error);
      // Use placeholder data as fallback
      setFaqs([
        { id: '1', question: 'What is Kamai24?', answer: 'Kamai24 is a platform for restaurant partners to manage their orders and business.' },
        { id: '2', question: 'How to manage orders?', answer: 'You can view and manage orders from the Orders tab in the bottom navigation.' },
        { id: '3', question: 'How to update menu items?', answer: 'Go to Menu tab and you can add, edit, or remove menu items from there.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFaq = (faqId) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [faqId]: !prev[faqId],
    }));
  };

  const handleSendMessage = () => {
    showToast('Send message feature - Coming soon', 'info');
    // TODO: Implement send message functionality
  };

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CustomHeader
        title={screenTitle}
        onBack={onBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction Section */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            We're here to help you with anything and everything on Kamai24
          </Text>
          <Text style={styles.introText}>
            At Kamai24 we expect at a day's start is you, better and happier than yesterday. We have got you covered share your concern or check our frequently asked questions listed below.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Help"
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>FAQ</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FF6E1A" style={styles.loader} />
          ) : filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqItem}
                onPress={() => toggleFaq(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQuestionRow}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqToggle}>
                    {expandedFaqs[faq.id] ? '−' : '+'}
                  </Text>
                </View>
                {expandedFaqs[faq.id] && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noResults}>No FAQs found</Text>
          )}
        </View>

        {/* Call to Action Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Still stuck? Help us a mail away</Text>
          <CustomButton
            title="Send a message"
            onPress={handleSendMessage}
            style={styles.sendButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  introSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  introTitle: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  introText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  faqSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  faqTitle: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 16,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  faqToggle: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
    fontWeight: '700',
  },
  faqAnswer: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
    lineHeight: 20,
  },
  noResults: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  ctaTitle: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  sendButton: {
    marginTop: 8,
  },
});

export default HelpCenterScreen;
