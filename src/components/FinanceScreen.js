import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Poppins, icons, images } from '../assets';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const FinanceScreen = ({ configData }) => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [selectedDateFilter, setSelectedDateFilter] = useState('LAST_7_DAYS');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'
  const [isLoading, setIsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [payoutData, setPayoutData] = useState(null);
  const [selectedGranularity, setSelectedGranularity] = useState('DAILY');
  const [graphType, setGraphType] = useState('bar'); // 'bar' or 'line'

  // Get finance labels from config
  const financeLabels = configData?.finance_labels || {
    revenue: 'REVENUE',
    pay_out: 'PAYOUTS'
  };

  // Get date filters from config
  const dateFilters = configData?.finance_date_filters || [
    { id: 'TODAY', label: 'Today', type: 'PREDEFINED' },
    { id: 'YESTERDAY', label: 'Yesterday', type: 'PREDEFINED' },
    { id: 'LAST_7_DAYS', label: 'Last 7 Days', type: 'PREDEFINED' },
    { id: 'LAST_30_DAYS', label: 'Last 30 Days', type: 'PREDEFINED' },
    { id: 'THIS_MONTH', label: 'This Month', type: 'PREDEFINED' },
    { id: 'LAST_MONTH', label: 'Last Month', type: 'PREDEFINED' },
    { id: 'CUSTOM_RANGE', label: 'Custom Range', type: 'CUSTOM' },
  ];

  // Get granularity options from config (for revenue graph)
  const granularityOptions = configData?.finance_granularity_options || [
    { id: 'DAILY', label: 'Daily' },
    { id: 'WEEKLY', label: 'Weekly' },
    { id: 'MONTHLY', label: 'Monthly' },
  ];

  // Format date for API (DD-MM-YYYY)
  const formatDateForAPI = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch revenue graph data
  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}v1/finance/revenue/graph`;
      
      const requestBody = {
        filter_type: selectedDateFilter,
        granularity: selectedGranularity,
      };

      // Add custom date range if applicable
      if (selectedDateFilter === 'CUSTOM_RANGE') {
        requestBody.start_date = formatDateForAPI(customStartDate);
        requestBody.end_date = formatDateForAPI(customEndDate);
      }

      console.log('📊 Fetching revenue data:', requestBody);

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('✅ Revenue data received:', data);

      if (response.ok && data.status === 'success') {
        setRevenueData(data.data);
      } else {
        console.error('❌ Failed to load revenue data:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payout history data
  const fetchPayoutData = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}v1/finance/payout-history`;
      
      const requestBody = {
        filter_type: selectedDateFilter,
      };

      // Add custom date range if applicable
      if (selectedDateFilter === 'CUSTOM_RANGE') {
        requestBody.start_date = formatDateForAPI(customStartDate);
        requestBody.end_date = formatDateForAPI(customEndDate);
      }

      console.log('💰 Fetching payout data:', requestBody);

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('✅ Payout data received:', data);

      if (response.ok && data.status === 'success') {
        setPayoutData(data.data);
      } else {
        console.error('❌ Failed to load payout data:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching payout data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when tab, filter, or granularity changes
  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueData();
    } else {
      fetchPayoutData();
    }
  }, [activeTab, selectedDateFilter, selectedGranularity]);

  const handleCustomRangeTap = () => {
    setDatePickerMode('start');
    setTimeout(() => {
      setShowDatePicker(true);
    }, 100);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === 'start') {
        setCustomStartDate(selectedDate);
        if (Platform.OS === 'ios') {
          // On iOS, immediately show end date picker
          setDatePickerMode('end');
        } else {
          // On Android, show end date picker after a delay
          setTimeout(() => {
            setDatePickerMode('end');
            setShowDatePicker(true);
          }, 300);
        }
      } else {
        setCustomEndDate(selectedDate);
        setSelectedDateFilter('CUSTOM_RANGE');
        if (Platform.OS === 'android') {
          setShowDatePicker(false);
        }
      }
    }
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDateFilterLabel = () => {
    if (selectedDateFilter === 'CUSTOM_RANGE') {
      return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }
    const filter = dateFilters.find(f => f.id === selectedDateFilter);
    return filter?.label || 'Select Date';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Section with Restaurant Info - Same style as OrdersScreen/MenuScreen/MoreScreen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.paperPlaneIcon}>
            <Image
              source={icons.cooking}
              style={styles.cookingIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.restaurantName}>
              {configData?.partner_info?.business_name || ''}
            </Text>
            {configData?.partner_info && (
              <View style={styles.statusContainer}>
                <Text style={styles.onlineText}>
                  {configData.partner_info.online_status || ''}
                </Text>
                {configData.partner_info.online_status && configData.partner_info.closing_info && (
                  <>
                    <Text style={styles.statusDot}>•</Text>
                    <Text style={styles.closingText}>
                      {configData.partner_info.closing_info}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'revenue' && styles.activeTab
          ]}
          onPress={() => setActiveTab('revenue')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'revenue' && styles.activeTabText
            ]}
          >
            {financeLabels.revenue}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'payout' && styles.activeTab
          ]}
          onPress={() => setActiveTab('payout')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'payout' && styles.activeTabText
            ]}
          >
            {financeLabels.pay_out}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Filter Dropdown */}
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={styles.dateFilterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateFilterText}>{getDateFilterLabel()}</Text>
          <Text style={styles.dateFilterArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Date Filter Options Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.dateFilterModal}>
            <ScrollView>
              {dateFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.dateFilterOption,
                    selectedDateFilter === filter.id && styles.selectedDateFilterOption
                  ]}
                  onPress={() => {
                    if (filter.type === 'CUSTOM') {
                      setShowFilterModal(false);
                      handleCustomRangeTap();
                    } else {
                      setSelectedDateFilter(filter.id);
                      setShowFilterModal(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateFilterOptionText,
                      selectedDateFilter === filter.id && styles.selectedDateFilterOptionText
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker for Custom Range */}
      {showDatePicker && selectedDateFilter === 'CUSTOM_RANGE' && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContent}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    {datePickerMode === 'start' ? 'Select Start Date' : 'Select End Date'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDatePicker(false);
                      setDatePickerMode('start');
                    }}
                    style={styles.datePickerDoneButton}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={datePickerMode === 'start' ? customStartDate : customEndDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={datePickerMode === 'start' ? customStartDate : customEndDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )
      )}

      {/* Content */}
      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : activeTab === 'revenue' ? (
          // Revenue Tab Content
          revenueData ? (
            <View style={styles.dataContainer}>
              {/* Summary Cards */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>₹{revenueData.total_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Orders</Text>
                  <Text style={styles.summaryValue}>{revenueData.total_orders}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg Order Value</Text>
                  <Text style={styles.summaryValue}>₹{revenueData.average_order_value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
              </View>

              {/* Granularity Toggle - Dynamic from config */}
              {granularityOptions && granularityOptions.length > 0 && (
                <View style={styles.granularityContainer}>
                  <Text style={styles.granularityLabel}>View:</Text>
                  <View style={styles.granularityButtons}>
                    {granularityOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.granularityButton,
                          selectedGranularity === option.id && styles.granularityButtonActive
                        ]}
                        onPress={() => setSelectedGranularity(option.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.granularityButtonText,
                          selectedGranularity === option.id && styles.granularityButtonTextActive
                        ]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}



              {/* Revenue Graph */}
              <View style={styles.graphContainer}>
                {/* Graph Controls Row */}
                <View style={styles.graphControlsRow}>
                  {/* Graph Type Icons - Left */}
                  <View style={styles.graphTypeContainer}>
                    <View style={styles.graphTypeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.graphTypeIconButton,
                          graphType === 'bar' && styles.graphTypeButtonActive
                        ]}
                        onPress={() => setGraphType('bar')}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={images.barGraph}
                          style={styles.graphTypeIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.graphTypeIconButton,
                          graphType === 'line' && styles.graphTypeButtonActive
                        ]}
                        onPress={() => setGraphType('line')}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={images.lineGraph}
                          style={styles.graphTypeIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Title - Center */}
                  <View style={styles.graphTitleContainer}>
                    <Text style={styles.graphTitle}>Revenue Trend</Text>
                    {revenueData.data_points && revenueData.data_points.length > 5 && (
                      <Text style={styles.graphHint}>← Swipe →</Text>
                    )}
                  </View>


                </View>
                <View style={styles.graphContent}>
                  {revenueData.data_points && revenueData.data_points.length > 0 ? (
                    <View style={styles.graphWrapper}>
                      {/* Y-Axis */}
                      {(() => {
                        const maxRevenue = Math.max(...revenueData.data_points.map(p => p.revenue));
                        const yAxisValues = [
                          maxRevenue,
                          maxRevenue * 0.75,
                          maxRevenue * 0.5,
                          maxRevenue * 0.25,
                          0
                        ];
                        
                        return (
                          <View style={styles.yAxis}>
                            {yAxisValues.map((value, index) => (
                              <Text key={index} style={styles.yAxisLabel}>
                                ₹{value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}
                              </Text>
                            ))}
                          </View>
                        );
                      })()}
                      
                      {graphType === 'bar' ? (
                        /* Bar Chart */
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.barChartScrollContent}
                          style={styles.graphScrollView}
                        >
                          <View style={[
                            styles.barChartContainer,
                            { width: Math.max(revenueData.data_points.length * 40, 250) }
                          ]}>
                            {revenueData.data_points.map((point, index) => {
                              const maxRevenue = Math.max(...revenueData.data_points.map(p => p.revenue));
                              const heightPercentage = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                              
                              return (
                                <View key={index} style={styles.barWrapper}>
                                  <View style={styles.barContainer}>
                                    <View style={[styles.bar, { height: `${heightPercentage}%` }]}>
                                      {point.revenue > 0 && (
                                        <Text style={styles.barValue}>
                                          ₹{point.revenue >= 1000 ? `${(point.revenue / 1000).toFixed(1)}k` : point.revenue.toFixed(0)}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  <Text style={styles.barLabel} numberOfLines={2}>{point.label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      ) : (
                        /* Line Chart */
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.lineChartScrollContent}
                          style={styles.graphScrollView}
                        >
                          <View style={[
                            styles.lineChartContainer,
                            { width: Math.max(revenueData.data_points.length * 60, 250) }
                          ]}>
                            {/* Line Chart with Points */}
                            <View style={styles.lineChartGraph}>
                              {revenueData.data_points.map((point, index) => {
                                const maxRevenue = Math.max(...revenueData.data_points.map(p => p.revenue));
                                const heightPercentage = maxRevenue > 0 ? ((maxRevenue - point.revenue) / maxRevenue) * 180 : 90;
                                const nextPoint = revenueData.data_points[index + 1];
                                
                                return (
                                  <View key={index} style={styles.linePointWrapper}>
                                    {/* Data Point Dot */}
                                    <View style={[styles.linePointContainer, { top: heightPercentage }]}>
                                      <View style={styles.linePoint} />
                                    </View>
                                    
                                    {/* Connecting Line to Next Point */}
                                    {nextPoint && (
                                      <View style={styles.lineSegmentContainer}>
                                        {(() => {
                                          const nextHeightPercentage = maxRevenue > 0 ? ((maxRevenue - nextPoint.revenue) / maxRevenue) * 180 : 90;
                                          const deltaY = nextHeightPercentage - heightPercentage;
                                          const length = Math.sqrt(Math.pow(60, 2) + Math.pow(deltaY, 2));
                                          const angle = Math.atan2(deltaY, 60) * (180 / Math.PI);
                                          
                                          return (
                                            <View 
                                              style={[
                                                styles.lineSegment,
                                                {
                                                  width: length,
                                                  top: heightPercentage,
                                                  left: 0,
                                                  transform: [
                                                    { translateX: 30 },
                                                    { translateY: 0 },
                                                    { rotate: `${angle}deg` }
                                                  ],
                                                  transformOrigin: 'left center',
                                                }
                                              ]} 
                                            />
                                          );
                                        })()}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                            
                            {/* X-Axis Labels */}
                            <View style={styles.lineChartLabels}>
                              {revenueData.data_points.map((point, index) => (
                                <Text key={index} style={styles.lineChartLabel} numberOfLines={2}>
                                  {point.label}
                                </Text>
                              ))}
                            </View>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noDataText}>No data available</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.dataContainer}>
              <Text style={styles.noDataText}>No revenue data available</Text>
            </View>
          )
        ) : (
          // Payout Tab Content
          payoutData ? (
            <View style={styles.dataContainer}>
              <Text style={styles.sectionTitle}>Payout History</Text>
              {payoutData.payout_cycles && payoutData.payout_cycles.length > 0 ? (
                payoutData.payout_cycles.map((cycle, index) => (
                  <View key={index} style={styles.payoutCard}>
                    <View style={styles.payoutHeader}>
                      <Text style={styles.payoutPeriod}>{cycle.period}</Text>
                      <Text style={styles.payoutAmount}>
                        ₹{cycle.total_payout?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <Text style={styles.payoutOrders}>{cycle.total_orders} orders</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No payout history available</Text>
              )}
            </View>
          ) : (
            <View style={styles.dataContainer}>
              <Text style={styles.noDataText}>No payout data available</Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header styles - matching OrdersScreen, MenuScreen, and MoreScreen
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paperPlaneIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cookingIcon: {
    width: 24,
    height: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  restaurantName: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 4,
  },
  statusDot: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginHorizontal: 4,
  },
  closingText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#F97316',
  },
  tabText: {
    fontFamily: Poppins.Medium,
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  dateFilterContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateFilterText: {
    fontFamily: Poppins.Medium,
    fontSize: 14,
    color: '#111827',
  },
  dateFilterArrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dateFilterOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedDateFilterOption: {
    backgroundColor: '#FEF3E2',
  },
  dateFilterOptionText: {
    fontFamily: Poppins.Regular,
    fontSize: 14,
    color: '#111827',
  },
  selectedDateFilterOptionText: {
    fontFamily: Poppins.SemiBold,
    color: '#F97316',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontFamily: Poppins.SemiBold,
    fontSize: 16,
    color: '#111827',
  },
  datePickerDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePickerDoneText: {
    fontFamily: Poppins.SemiBold,
    fontSize: 14,
    color: '#F97316',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontFamily: Poppins.Regular,
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  dataContainer: {
    padding: 20,
    width: '100%',
  },
  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontFamily: Poppins.Regular,
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontFamily: Poppins.SemiBold,
    fontSize: 14,
    color: '#111827',
  },
  // Granularity Toggle
  granularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  granularityLabel: {
    fontFamily: Poppins.Medium,
    fontSize: 14,
    color: '#111827',
    marginRight: 12,
  },
  granularityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  granularityButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  granularityButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  granularityButtonText: {
    fontFamily: Poppins.Medium,
    fontSize: 12,
    color: '#6B7280',
  },
  granularityButtonTextActive: {
    color: '#FFFFFF',
  },
  // Graph
  graphContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  // Graph Title (Center)
  graphTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  graphTitle: {
    fontFamily: Poppins.SemiBold,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  graphHint: {
    fontFamily: Poppins.Regular,
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  graphContent: {
    minHeight: 240,
  },
  graphWrapper: {
    flexDirection: 'row',
  },
  graphScrollView: {
    flex: 1,
  },
  // Y-Axis Styles
  yAxis: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    paddingRight: 8,
    marginRight: 8,
  },
  yAxisLabel: {
    fontFamily: Poppins.Regular,
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
  },
  // Graph Controls Row (inside graph container)
  graphControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Graph Type Toggle (Left side)
  graphTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  graphTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  graphTypeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphTypeButtonActive: {
    borderColor: '#F97316',
    borderWidth: 2,
  },
  graphTypeIcon: {
    width: 24,
    height: 24,
  },
  // Bar Chart Styles
  barChartScrollContent: {
    paddingHorizontal: 8,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    minWidth: '100%',
  },
  barWrapper: {
    flex: 1,
    minWidth: 35,
    maxWidth: 60,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    maxWidth: 50,
    backgroundColor: '#81C784',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  barValue: {
    fontFamily: Poppins.SemiBold,
    fontSize: 8,
    color: '#FFFFFF',
  },
  barLabel: {
    fontFamily: Poppins.Regular,
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
  },
  // Line Chart Styles
  lineChartScrollContent: {
    paddingHorizontal: 20,
  },
  lineChartContainer: {
    minWidth: '100%',
  },
  lineChartGraph: {
    flexDirection: 'row',
    height: 200,
    position: 'relative',
    marginBottom: 10,
  },
  linePointWrapper: {
    flex: 1,
    minWidth: 60,
    height: 200,
    position: 'relative',
  },
  linePointContainer: {
    position: 'absolute',
    left: 30,
    alignItems: 'center',
    transform: [{ translateX: -4 }],
  },
  linePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  lineSegmentContainer: {
    position: 'absolute',
    width: 60,
    height: 200,
    left: 0,
    top: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#81C784',
  },
  lineChartLabels: {
    flexDirection: 'row',
    marginTop: 10,
  },
  lineChartLabel: {
    width: 60,
    fontFamily: Poppins.Regular,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Payout Cards
  sectionTitle: {
    fontFamily: Poppins.SemiBold,
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutPeriod: {
    fontFamily: Poppins.Medium,
    fontSize: 14,
    color: '#111827',
  },
  payoutAmount: {
    fontFamily: Poppins.SemiBold,
    fontSize: 16,
    color: '#F97316',
  },
  payoutOrders: {
    fontFamily: Poppins.Regular,
    fontSize: 12,
    color: '#6B7280',
  },
  noDataText: {
    fontFamily: Poppins.Regular,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default FinanceScreen;
