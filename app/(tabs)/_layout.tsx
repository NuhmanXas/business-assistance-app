import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import ErrorBoundary from '@/components/ErrorBoundary';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="sales"
          options={{
            title: 'Sales',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />, // cart icon for sales
          }}
        />
        <Tabs.Screen
          name="purchase"
          options={{
            title: 'Purchase',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />, // credit card icon for purchase
          }}
        />
        <Tabs.Screen
          name="vendor"
          options={{
            title: 'Vendor',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />, // people icon for vendor
          }}
        />
        <Tabs.Screen
          name="customer"
          options={{
            title: 'Customer',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />, // single person icon for customer
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: 'Items',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="items" color={color} />, // inventory icon for items
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />, // gear icon for settings
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
