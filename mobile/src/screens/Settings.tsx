import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Linking, TextInput, Modal, DevSettings } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/firebase';
import { Theme } from '../utils/theme';

const ALLOWED_ADMIN_EMAILS: string[] = [
  'appdevbsit@gmail.com',
  'kylematthewnnicor@gmail.com',
];

const Settings = ({ navigation }: any) => {
  const { user, isAdmin, setIsAdmin } = useAuth();
  const isAllowedAdmin = user?.email ? ALLOWED_ADMIN_EMAILS.includes(user.email) : false;

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bugReportText, setBugReportText] = useState('');
  const [bugModalVisible, setBugModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const [notifSetting, soundSetting] = await Promise.all([
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('soundEnabled'),
      ]);

      if (notifSetting !== null) setNotifications(JSON.parse(notifSetting));
      if (soundSetting !== null) setSoundEnabled(JSON.parse(soundSetting));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        onPress: async () => {
          try {
            await GoogleSignin.signOut();
          } catch (error) {
            console.error("Google sign out error", error);
          }
          await auth.signOut();
        }
      }
    ]);
  };

  const saveNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem('notifications', JSON.stringify(value));
    Alert.alert('Success', value ? 'Notifications enabled' : 'Notifications disabled');
  };

  const saveSoundEnabled = async (value: boolean) => {
    setSoundEnabled(value);
    await AsyncStorage.setItem('soundEnabled', JSON.stringify(value));
    Alert.alert('Success', value ? 'Sound enabled' : 'Sound disabled');
  };

  const handleProfileEdit = () => {
    setDisplayName(user?.displayName || '');
    setProfileModalVisible(true);
  };

  const saveProfileChanges = async () => {
    if (!displayName || displayName.trim() === '') {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName,
        });
        Alert.alert('Success', 'Profile updated successfully');
        setProfileModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error('Profile update error:', error);
    }
  };

  const handleEmail = () => {
    Alert.alert("Email Address", `Your email: ${user?.email || 'Not set'}\n\nTo change your email, please visit your account settings or contact support.`);
  };

  const handleTermsOfService = async () => {
    try {
      await Linking.openURL('https://www.example.com/terms');
    } catch {
      Alert.alert("Terms of Service", "Terms of Service:\n\nBy using PABG, you agree to these terms...\n\nFull terms available online.");
    }
  };

  const handleAbout = () => {
    Alert.alert(
      "About PABG",
      "PABG v1.0.0\n\n© 2026 PABG\n\nYour premium gaming platform\n\nMade by BSIT 3-1 Students."
    );
  };

  const handleBugReport = () => {
    setBugReportText('');
    setBugModalVisible(true);
  };

  const submitBugReport = async () => {
    if (bugReportText.trim() === '') {
      Alert.alert('Error', 'Please describe the bug');
      return;
    }

    try {
      await AsyncStorage.setItem('lastBugReport', JSON.stringify({
        text: bugReportText,
        userId: user?.uid,
        timestamp: new Date().toISOString(),
      }));
      Alert.alert('Thank You', 'Your bug report has been submitted. Our team will investigate it shortly.');
      setBugModalVisible(false);
      setBugReportText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit bug report');
      console.error('Bug report error:', error);
    }
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    isToggle = false,
    value = false,
    onToggle
  }: any) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color={Theme.colors.lime} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#3e3e3e', true: Theme.colors.lime }}
          thumbColor={value ? Theme.colors.lime : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(isAdmin ? 'AdminMain' : 'Main');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content} contentContainerStyle={{ paddingBottom: 45 }}>
        {/* Account Section */}
        <SettingSection title="ACCOUNT">
          <SettingRow
            icon="person-circle-outline"
            title="Profile"
            subtitle="Manage your profile information"
            onPress={handleProfileEdit}
          />
          <SettingRow
            icon="mail-outline"
            title="Email Address"
            subtitle={user?.email || "No email"}
            onPress={handleEmail}
          />
        </SettingSection>



        {/* Preferences Section */}
        <SettingSection title="PREFERENCES">
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            isToggle={true}
            value={notifications}
            onToggle={saveNotifications}
          />
          <SettingRow
            icon="volume-medium-outline"
            title="Sound & Vibration"
            subtitle="Enable sound and vibration effects"
            isToggle={true}
            value={soundEnabled}
            onToggle={saveSoundEnabled}
          />
        </SettingSection>

        {/* Privacy & Safety Section */}
        <SettingSection title="PRIVACY & SAFETY">
          <SettingRow
            icon="shield-outline"
            title="Terms of Service"
            subtitle="Review terms of service"
            onPress={handleTermsOfService}
          />
        </SettingSection>

        {/* About Section */}
        <SettingSection title="ABOUT">
          <SettingRow
            icon="information-circle-outline"
            title="About PABG"
            subtitle="Learn more about our app"
            onPress={handleAbout}
          />
          <SettingRow
            icon="bug-outline"
            title="Help Center"
            subtitle="Help us improve the app"
            onPress={handleBugReport}
          />
        </SettingSection>

        {/* Admin Portal Section for Allowed Admins (Bottom Button style) */}
        {isAllowedAdmin && (
          <View style={styles.adminSwapSection}>
            <TouchableOpacity
              style={styles.adminSwapButton}
              onPress={async () => {
                try {
                  if (isAdmin) {
                    await AsyncStorage.setItem('activeRole', 'user');
                    Alert.alert(
                      'Logged In', 
                      'Successfully logged in as User! Refreshing the launcher...',
                      [{ text: 'OK', onPress: () => DevSettings.reload() }]
                    );
                  } else {
                    await AsyncStorage.setItem('activeRole', 'admin');
                    Alert.alert(
                      'Logged In', 
                      'Successfully logged in as Admin! Refreshing the dashboard...',
                      [{ text: 'OK', onPress: () => DevSettings.reload() }]
                    );
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to save login preferences.');
                }
              }}
            >
              <Ionicons 
                name={isAdmin ? "person-outline" : "shield-outline"} 
                size={22} 
                color={Theme.colors.lime} 
              />
              <Text style={styles.adminSwapText}>
                {isAdmin ? "Login as User" : "Login as Admin"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out Section */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={22} color="#FF4B4B" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfileChanges}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your display name"
              placeholderTextColor={Theme.colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        visible={bugModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBugModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setBugModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Help Center</Text>
            <TouchableOpacity onPress={submitBugReport}>
              <Text style={styles.modalSave}>Submit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Describe the issue</Text>
            <TextInput
              style={[styles.input, styles.bugInput]}
              placeholder="Tell us what went wrong..."
              placeholderTextColor={Theme.colors.textMuted}
              value={bugReportText}
              onChangeText={setBugReportText}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{bugReportText.length}/500</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  content: { flex: 1, paddingVertical: 10 },
  section: { marginTop: 20, paddingHorizontal: 20 },
  settingsSectionTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 10, letterSpacing: 0.5 },
  sectionContent: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  signOutSection: { paddingHorizontal: 20, marginTop: 10, marginBottom: 40 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    paddingVertical: 16,
    borderRadius: 15,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4B4B',
    marginLeft: 10,
  },
  adminSwapSection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  adminSwapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
    paddingVertical: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.2)',
  },
  adminSwapText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.lime,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  modalClose: {
    fontSize: 16,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    color: Theme.colors.lime,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Theme.colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 15,
  },
  bugInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'right',
  },
});

export default Settings;
