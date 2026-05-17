import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../utils/theme';
import { fetchUsers, deleteUser, updateUser, updateUserSuspension } from '../../api/api';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Suspension Modal States
  const [isSuspensionModalOpen, setIsSuspensionModalOpen] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<any>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('permanent'); // '1' | '7' | '30' | 'permanent'
  const [savingSuspension, setSavingSuspension] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoading(false);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const result = await updateUser(editingUser.id, { name: editName.trim() });
      if (result.success) {
        Alert.alert('Success', 'User updated successfully');
        setIsEditModalOpen(false);
        loadUsers();
      } else {
        Alert.alert('Error', result.error || 'Failed to update user.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSuspensionToggle = async (user: any) => {
    if (user.isSuspended) {
      // Direct unsuspend
      Alert.alert(
        'Unsuspend User',
        `Are you sure you want to unsuspend ${user.name || user.email}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unsuspend',
            onPress: async () => {
              try {
                const result = await updateUserSuspension(user.id, false, '', null);
                if (result.success) {
                  Alert.alert('Success', 'User unsuspended');
                  loadUsers();
                } else {
                  Alert.alert('Error', result.error || 'Failed to unsuspend user');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to update suspension');
              }
            }
          }
        ]
      );
    } else {
      // Open suspend modal
      setSuspendingUser(user);
      setSuspensionReason('');
      setSuspensionDuration('permanent');
      setIsSuspensionModalOpen(true);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      Alert.alert('Error', 'Suspension reason is required.');
      return;
    }

    const durationMap: Record<string, number | null> = {
      '1': 1,
      '7': 7,
      '30': 30,
      'permanent': null
    };

    setSavingSuspension(true);
    try {
      const result = await updateUserSuspension(
        suspendingUser.id,
        true,
        suspensionReason.trim(),
        durationMap[suspensionDuration]
      );
      if (result.success) {
        Alert.alert('Success', 'User suspended successfully');
        setIsSuspensionModalOpen(false);
        loadUsers();
      } else {
        Alert.alert('Error', result.error || 'Failed to update suspension.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update suspension.');
    } finally {
      setSavingSuspension(false);
    }
  };

  const handleDelete = async (user: any) => {
    Alert.alert(
      'Delete User',
      `Delete ${user.name || user.email}? This will remove the user record and all related data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteUser(user.id);
              if (result.success) {
                Alert.alert('Success', 'User deleted');
                loadUsers();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name || 'No Name'}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statText}>Points: <Text style={styles.statValue}>{item.totalPoints || 0}</Text></Text>
          <Text style={styles.statText}>Played: <Text style={styles.statValue}>{item.totalGamesPlayed || item.gamesPlayed || 0}</Text></Text>
        </View>
        <View style={styles.badgeContainer}>
          {item.isSuspended ? (
            <View>
              <Text style={[styles.badge, styles.badgeSuspended]}>Suspended</Text>
              {item.suspendedUntil && (
                <Text style={styles.suspensionMeta}>
                  Until: {new Date(item.suspendedUntil).toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.badge, styles.badgeActive]}>Active</Text>
          )}
        </View>
      </View>
      
      <View style={styles.actionColumn}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color={Theme.colors.lime} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, item.isSuspended ? styles.unsuspendBtn : styles.suspendBtn]} 
          onPress={() => handleSuspensionToggle(item)}
        >
          <Ionicons name={item.isSuspended ? "play" : "pause"} size={18} color={item.isSuspended ? Theme.colors.lime : "#FF4B4B"} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={18} color="#FF4B4B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={Theme.colors.lime} style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found.</Text>
          }
        />
      )}

      {/* Edit User Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalSubtitle}>
                Update the user's name. Score and games played are updated automatically through gameplay.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter name"
                  placeholderTextColor={Theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.textInput, styles.disabledInput]}
                  value={editEmail}
                  editable={false}
                  placeholderTextColor={Theme.colors.textSecondary}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnOutline]} 
                  onPress={() => setIsEditModalOpen(false)}
                >
                  <Text style={styles.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnPrimary]} 
                  onPress={handleUpdateUser}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Update User</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Suspension Modal */}
      <Modal
        visible={isSuspensionModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSuspensionModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suspend User</Text>
              <TouchableOpacity onPress={() => setIsSuspensionModalOpen(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.warningBanner}>
                <Text style={styles.warningBannerText}>
                  Suspended accounts cannot use protected app features until the suspension expires or is manually removed.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={suspensionReason}
                  onChangeText={setSuspensionReason}
                  placeholder="Enter reason for suspension"
                  placeholderTextColor={Theme.colors.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration</Text>
                <View style={styles.durationContainer}>
                  {[
                    { label: '1 Day', value: '1' },
                    { label: '7 Days', value: '7' },
                    { label: '30 Days', value: '30' },
                    { label: 'Permanent', value: 'permanent' }
                  ].map((dur) => (
                    <TouchableOpacity
                      key={dur.value}
                      style={[
                        styles.durationPill,
                        suspensionDuration === dur.value && styles.activeDurationPill
                      ]}
                      onPress={() => setSuspensionDuration(dur.value)}
                    >
                      <Text style={[
                        styles.durationText,
                        suspensionDuration === dur.value && styles.activeDurationText
                      ]}>
                        {dur.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnOutline]} 
                  onPress={() => setIsSuspensionModalOpen(false)}
                >
                  <Text style={styles.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnDanger]} 
                  onPress={handleConfirmSuspension}
                  disabled={savingSuspension}
                >
                  {savingSuspension ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnDangerText}>Confirm Suspension</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  userEmail: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 8,
  },
  statText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  statValue: {
    color: Theme.colors.lime,
    fontWeight: '700',
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeActive: {
    backgroundColor: 'rgba(212, 255, 0, 0.1)',
    color: Theme.colors.lime,
  },
  badgeSuspended: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    color: '#FF4B4B',
  },
  suspensionMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  actionColumn: {
    justifyContent: 'center',
    gap: 10,
    marginLeft: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
  },
  suspendBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  unsuspendBtn: {
    backgroundColor: 'rgba(212, 255, 0, 0.1)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  modalScroll: {
    paddingBottom: 10,
  },
  modalSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Theme.colors.elevated,
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
  },
  disabledInput: {
    opacity: 0.5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  warningBanner: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    marginBottom: 20,
  },
  warningBannerText: {
    color: '#FF4B4B',
    fontSize: 12,
    lineHeight: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationPill: {
    backgroundColor: Theme.colors.elevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeDurationPill: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  durationText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeDurationText: {
    color: '#000000',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  btnOutlineText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: Theme.colors.lime,
  },
  btnPrimaryText: {
    color: '#000',
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#FF4B4B',
  },
  btnDangerText: {
    color: '#FFF',
    fontWeight: '700',
  }
});

export default AdminUsers;
