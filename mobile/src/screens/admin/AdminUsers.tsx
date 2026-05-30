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
  ScrollView,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../utils/theme';
import { fetchUsers, deleteUser, updateUser, updateUserSuspension } from '../../api/api';
import RefreshSpinner from '../../components/RefreshSpinner';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
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

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      {/* Left Column: Avatar and Actions */}
      <View style={styles.userLeftCol}>
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {(item.name || item.email || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item.isSuspended && (
            <View style={styles.suspendedIndicator}>
              <Ionicons name="alert-circle" size={14} color="#FF4B4B" />
            </View>
          )}
        </View>

        <View style={styles.userActionRow}>
          <TouchableOpacity 
            style={[styles.miniActionBtn, styles.miniEditBtn]} 
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create" size={16} color={Theme.colors.lime} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.miniActionBtn, item.isSuspended ? styles.miniUnsuspendBtn : styles.miniSuspendBtn]} 
            onPress={() => handleSuspensionToggle(item)}
          >
            <Ionicons 
              name={item.isSuspended ? "play" : "pause"} 
              size={16} 
              color={item.isSuspended ? Theme.colors.lime : "#FF4B4B"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.miniActionBtn, styles.miniDeleteBtn]} 
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color="#FF4B4B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Column: User Info */}
      <View style={styles.userRightCol}>
        <View style={styles.userHeaderRow}>
          <Text style={styles.userName} numberOfLines={1}>{item.name || 'No Name'}</Text>
          <View style={[styles.statusBadge, item.isSuspended ? styles.badgeSuspended : styles.badgeActive]}>
            <Text style={[styles.statusBadgeText, { color: item.isSuspended ? '#FF4B4B' : Theme.colors.lime }]}>
              {item.isSuspended ? 'Suspended' : 'Active'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        
        <View style={styles.userStatsRow}>
          <View style={styles.userStatItem}>
            <Ionicons name="trophy-outline" size={12} color={Theme.colors.lime} />
            <Text style={styles.userStatValue}>{item.totalPoints || 0}</Text>
            <Text style={styles.userStatLabel}>pts</Text>
          </View>
          <View style={styles.userStatItem}>
            <Ionicons name="game-controller-outline" size={12} color={Theme.colors.textSecondary} />
            <Text style={styles.userStatValue}>{item.totalGamesPlayed || item.gamesPlayed || 0}</Text>
            <Text style={styles.userStatLabel}>played</Text>
          </View>
        </View>

        {item.isSuspended && item.suspendedUntil && (
          <View style={styles.suspensionInfo}>
            <Ionicons name="time-outline" size={10} color="#FF4B4B" style={{ marginRight: 4 }} />
            <Text style={styles.suspensionText}>
              Until {new Date(item.suspendedUntil).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <RefreshSpinner refreshing={refreshing} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users Management</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder="Search by name or email..."
          placeholderTextColor={Theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={Theme.colors.lime} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="transparent" 
              colors={['transparent']} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userLeftCol: {
    alignItems: 'center',
    width: 100,
    marginRight: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.elevated,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.lime,
  },
  avatarPlaceholderText: {
    color: Theme.colors.lime,
    fontSize: 28,
    fontWeight: '900',
  },
  suspendedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E1E26',
    borderRadius: 10,
    padding: 2,
  },
  userActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
  },
  miniEditBtn: {
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
  },
  miniSuspendBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  miniUnsuspendBtn: {
    backgroundColor: 'rgba(212, 255, 0, 0.1)',
  },
  miniDeleteBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  userRightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userName: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900', 
    marginRight: 8,
  },
  userEmail: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  userStatValue: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  userStatLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeActive: {
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
  },
  badgeSuspended: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  suspensionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  suspensionText: {
    color: '#FF4B4B',
    fontSize: 11,
    fontWeight: '700',
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    marginTop: 15,
    fontWeight: '700',
  },
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
