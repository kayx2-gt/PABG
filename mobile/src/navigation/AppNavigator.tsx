import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../utils/theme';

import Home from '../screens/Home';
import GameDetails from '../screens/GameDetails';
import GamePlayer from '../screens/GamePlayer';
import Leaderboard from '../screens/Leaderboard';
import Profile from '../screens/Profile';
import Favorites from '../screens/Favorites';
import Search from '../screens/Search';
import LoginScreen from '../screens/LoginScreen';
import GamesList from '../screens/GamesList';
import Settings from '../screens/Settings';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholders for additional tabs
const Placeholder = () => <View style={{ flex: 1, backgroundColor: Theme.colors.background }} />;

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />

  </Stack.Navigator>
);

const AppTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Leaderboard') iconName = focused ? 'trophy' : 'trophy-outline';

          return (
            <View style={[
              styles.iconContainer, 
              focused && styles.activeIconBg
            ]}>
              <Ionicons name={iconName} size={focused ? 24 : 22} color={focused ? '#000' : '#FFF'} />
            </View>
          );
        },
        tabBarActiveTintColor: Theme.colors.lime,
        tabBarInactiveTintColor: '#FFF',
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(20, insets.bottom + 10),
          left: 40,
          right: 40,
          backgroundColor: '#000000',
          borderRadius: 35,
          height: 65,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          paddingBottom: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Search" component={Search} />
      <Tab.Screen name="Leaderboard" component={Leaderboard} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={AppTabs} />
            <Stack.Screen name="GameDetails" component={GameDetails} />
            <Stack.Screen name="GamePlayer" component={GamePlayer} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Favorites" component={Favorites} />
            <Stack.Screen name="GamesList" component={GamesList} />
            <Stack.Screen name="Settings" component={Settings} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  activeIconBg: {
    backgroundColor: Theme.colors.lime,
  },
  activeDot: {
    display: 'none',
  }
});

export default AppNavigator;
