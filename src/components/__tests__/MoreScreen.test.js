import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import MoreScreen from '../MoreScreen';
import { fetchWithAuth } from '../../utils/apiHelpers';
import { API_BASE_URL } from '../../config';
import { clearTokens } from '../../utils/tokenStorage';

// Mock dependencies
jest.mock('../../utils/apiHelpers');
jest.mock('../../utils/tokenStorage');
jest.mock('../ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('MoreScreen', () => {
  const mockOnLogout = jest.fn();
  const mockOnNavigate = jest.fn();
  const mockConfigData = {
    partner_info: {
      business_name: 'Test Restaurant',
      location: 'Test Location',
      online_status: 'Online',
      closing_info: 'Closes at 12:00 am, Tomorrow',
    },
    logout_labels: {
      logout_title: 'Logout',
      logout_confirmation_message: 'Are you sure you want to logout?',
      cancel_button: 'Cancel',
      logout_button: 'Logout',
      logout_success_message: 'Logged out successfully',
    },
  };

  const mockMoreData = {
    screen_title: 'More',
    receiving_orders: {
      title: 'Receiving orders',
      subtitle: 'Closes at 12:00 AM, Tomorrow',
      toggle_enabled: true,
    },
    menu_items: [
      {
        id: 'outlet-timings',
        title: 'Outlet Timings',
        icon: 'clock',
        route: 'outlet-timings',
        show_arrow: true,
      },
      {
        id: 'prep-time',
        title: 'Prep Time',
        icon: 'timer',
        route: 'prep-time',
        show_arrow: true,
      },
    ],
    help_section: [
      {
        id: 'help-center',
        title: 'Help Center',
        icon: 'help',
        route: 'help-center',
        show_arrow: true,
      },
    ],
    logout_section: [
      {
        id: 'logout',
        title: 'Logout',
        route: 'v1/auth/logout',
        method: 'POST',
        show_arrow: false,
      },
    ],
  };

  const mockSettingsData = {
    receiving_orders: {
      is_accepting: true,
      closing_info: 'Closes at 12:00 AM, Tomorrow',
    },
    default_prep_time_minutes: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        status: 'success',
        data: {},
      }),
    });
  });

  describe('API Integration Tests', () => {
    test('TC-001: Should fetch config data on mount if not provided as prop', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          status: 'success',
          data: mockConfigData,
        }),
      });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/config`,
          { method: 'GET' }
        );
      });
    });

    test('TC-002: Should not fetch config data if provided as prop', async () => {
      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).not.toHaveBeenCalledWith(
          `${API_BASE_URL}v1/config`,
          expect.any(Object)
        );
      });
    });

    test('TC-003: Should fetch more screen data on mount', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockConfigData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/more`,
          { method: 'GET' }
        );
      });
    });

    test('TC-004: Should fetch settings data after more data is loaded', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings`,
          { method: 'GET' }
        );
      });
    });

    test('TC-005: Should update receiving orders toggle state from settings API', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: {
              receiving_orders: {
                is_accepting: false,
                closing_info: 'Closes at 11:00 PM, Today',
              },
            },
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings`,
          { method: 'GET' }
        );
      });
    });
  });

  describe('Toggle Order Receiving Tests', () => {
    test('TC-006: Should call PATCH API when toggling order receiving ON', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: {
              is_accepting: true,
              closing_info: 'Closes at 12:00 AM, Tomorrow',
            },
          }),
        });

      const { getByTestId } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const toggle = getByTestId('power-toggle');
        fireEvent(toggle, 'valueChange', true);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings/order-receiving`,
          {
            method: 'PATCH',
            body: JSON.stringify({ is_accepting: true }),
          }
        );
      });
    });

    test('TC-007: Should call PATCH API when toggling order receiving OFF', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: {
              is_accepting: false,
              closing_info: 'Currently not accepting orders',
            },
          }),
        });

      const { getByTestId } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const toggle = getByTestId('power-toggle');
        fireEvent(toggle, 'valueChange', false);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings/order-receiving`,
          {
            method: 'PATCH',
            body: JSON.stringify({ is_accepting: false }),
          }
        );
      });
    });

    test('TC-008: Should update local state after successful toggle', async () => {
      const updatedData = {
        is_accepting: false,
        closing_info: 'Currently not accepting orders',
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: updatedData,
          }),
        });

      const { getByTestId, getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const toggle = getByTestId('power-toggle');
        fireEvent(toggle, 'valueChange', false);
      });

      await waitFor(() => {
        expect(getByText('Currently not accepting orders')).toBeTruthy();
      });
    });

    test('TC-009: Should handle toggle API error gracefully', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            code: 400,
            status: 'error',
            message: 'Failed to update order receiving status',
          }),
        });

      const { getByTestId } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const toggle = getByTestId('power-toggle');
        fireEvent(toggle, 'valueChange', true);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings/order-receiving`,
          expect.any(Object)
        );
      });
    });
  });

  describe('Logout Tests', () => {
    test('TC-010: Should use logout route from backend when available', async () => {
      const logoutData = {
        ...mockMoreData,
        logout_section: [
          {
            id: 'logout',
            title: 'Logout',
            route: 'v1/auth/logout',
            method: 'POST',
          },
        ],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: logoutData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            message: 'Logged out successfully',
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      // Confirm logout in Alert
      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/auth/logout`,
          { method: 'POST' }
        );
      });
    });

    test('TC-011: Should use fallback logout URL if backend route not provided', async () => {
      const logoutData = {
        ...mockMoreData,
        logout_section: [
          {
            id: 'logout',
            title: 'Logout',
            route: null,
            method: 'POST',
          },
        ],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: logoutData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            message: 'Logged out successfully',
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/auth/logout`,
          { method: 'POST' }
        );
      });
    });

    test('TC-012: Should use logout method from backend when available', async () => {
      const logoutData = {
        ...mockMoreData,
        logout_section: [
          {
            id: 'logout',
            title: 'Logout',
            route: 'v1/auth/logout',
            method: 'DELETE',
          },
        ],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: logoutData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            message: 'Logged out successfully',
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/auth/logout`,
          { method: 'DELETE' }
        );
      });
    });

    test('TC-013: Should clear tokens and call onLogout after successful logout', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            message: 'Logged out successfully',
          }),
        });

      clearTokens.mockResolvedValue();

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(clearTokens).toHaveBeenCalled();
        expect(mockOnLogout).toHaveBeenCalled();
      });
    });

    test('TC-014: Should use dynamic logout labels from config', async () => {
      const customConfig = {
        ...mockConfigData,
        logout_labels: {
          logout_title: 'Custom Logout',
          logout_confirmation_message: 'Are you sure?',
          cancel_button: 'No',
          logout_button: 'Yes, Logout',
          logout_success_message: 'You have been logged out',
        },
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={customConfig}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(getByText('Custom Logout')).toBeTruthy();
        expect(getByText('Are you sure?')).toBeTruthy();
        expect(getByText('No')).toBeTruthy();
        expect(getByText('Yes, Logout')).toBeTruthy();
      });
    });
  });

  describe('Navigation Tests', () => {
    test('TC-015: Should navigate to outlet timings when menu item pressed', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const outletTimings = getByText('Outlet Timings');
        fireEvent.press(outletTimings);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith('outletTimings');
    });

    test('TC-016: Should navigate to prep time when menu item pressed', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const prepTime = getByText('Prep Time');
        fireEvent.press(prepTime);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith('prepTime');
    });

    test('TC-017: Should handle unknown routes gracefully', async () => {
      const moreDataWithUnknownRoute = {
        ...mockMoreData,
        menu_items: [
          {
            id: 'unknown',
            title: 'Unknown Route',
            icon: 'question',
            route: 'unknown-route',
            show_arrow: true,
          },
        ],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: moreDataWithUnknownRoute,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const unknownRoute = getByText('Unknown Route');
        fireEvent.press(unknownRoute);
      });

      // Should show toast for unknown route
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('UI Rendering Tests', () => {
    test('TC-018: Should display header with backend business name', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(getByText('Test Restaurant')).toBeTruthy();
      });
    });

    test('TC-019: Should display receiving orders section with backend data', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(getByText('Receiving orders')).toBeTruthy();
        expect(getByText('Closes at 12:00 AM, Tomorrow')).toBeTruthy();
      });
    });

    test('TC-020: Should display menu items from backend', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(getByText('Outlet Timings')).toBeTruthy();
        expect(getByText('Prep Time')).toBeTruthy();
      });
    });

    test('TC-021: Should display help section from backend', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(getByText('Help Center')).toBeTruthy();
      });
    });

    test('TC-022: Should display logout button from backend', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(getByText('Logout')).toBeTruthy();
      });
    });

    test('TC-023: Should show loading state while fetching data', () => {
      fetchWithAuth.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Error Handling Tests', () => {
    test('TC-024: Should handle config API error gracefully', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          code: 500,
          status: 'error',
          message: 'Internal server error',
        }),
      });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/config`,
          { method: 'GET' }
        );
      });
    });

    test('TC-025: Should handle more screen API error gracefully', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          code: 500,
          status: 'error',
          message: 'Failed to load more screen data',
        }),
      });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/more`,
          { method: 'GET' }
        );
      });
    });

    test('TC-026: Should handle settings API error gracefully', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            code: 500,
            status: 'error',
            message: 'Failed to load settings',
          }),
        });

      render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          `${API_BASE_URL}v1/settings`,
          { method: 'GET' }
        );
      });
    });

    test('TC-027: Should continue logout even if API call fails', async () => {
      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      clearTokens.mockResolvedValue();

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(clearTokens).toHaveBeenCalled();
        expect(mockOnLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    test('TC-028: Should handle empty menu items array', async () => {
      const emptyMoreData = {
        ...mockMoreData,
        menu_items: [],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: emptyMoreData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { queryByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(queryByText('Outlet Timings')).toBeNull();
      });
    });

    test('TC-029: Should handle missing receiving orders section', async () => {
      const moreDataWithoutReceivingOrders = {
        ...mockMoreData,
        receiving_orders: null,
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: moreDataWithoutReceivingOrders,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        });

      const { queryByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        expect(queryByText('Receiving orders')).toBeNull();
      });
    });

    test('TC-030: Should handle full URL in logout route', async () => {
      const logoutDataWithFullUrl = {
        ...mockMoreData,
        logout_section: [
          {
            id: 'logout',
            title: 'Logout',
            route: 'https://example.com/api/logout',
            method: 'POST',
          },
        ],
      };

      fetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: logoutDataWithFullUrl,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            data: mockSettingsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: 200,
            status: 'success',
            message: 'Logged out successfully',
          }),
        });

      const { getByText } = render(
        <MoreScreen
          onLogout={mockOnLogout}
          onNavigate={mockOnNavigate}
          configData={mockConfigData}
        />
      );

      await waitFor(() => {
        const logoutButton = getByText('Logout');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const confirmButton = getByText('Logout');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalledWith(
          'https://example.com/api/logout',
          { method: 'POST' }
        );
      });
    });
  });
});
