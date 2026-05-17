import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Dimensions
} from 'react-native';
import { Theme } from '../utils/theme';

const { height } = Dimensions.get('window');

interface ScoreModalProps {
  visible: boolean;
  onSubmit: (score: number) => void;
  onSkip: () => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ visible, onSubmit, onSkip }) => {
  const [score, setScore] = useState('');

  const handleSubmit = () => {
    const numericScore = parseInt(score);
    if (isNaN(numericScore) || numericScore < 0) {
      Alert.alert("Invalid Score", "Please enter a valid number.");
      return;
    }
    onSubmit(numericScore);
    setScore('');
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>How did you do?</Text>
          <Text style={styles.subtitle}>Enter your score from the game</Text>
          
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Theme.colors.textMuted}
            keyboardType="numeric"
            value={score}
            onChangeText={setScore}
            autoFocus={true}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit Score</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { 
    backgroundColor: Theme.colors.elevated, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 30, 
    alignItems: 'center',
    minHeight: height * 0.4 
  },
  handle: { width: 40, height: 4, backgroundColor: Theme.colors.border, borderRadius: 2, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 30 },
  input: { 
    backgroundColor: Theme.colors.surface, 
    color: Theme.colors.textPrimary, 
    width: '100%', 
    borderRadius: 10, 
    padding: 15, 
    fontSize: 20, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  submitBtn: { 
    backgroundColor: Theme.colors.lime, 
    width: '100%', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 15 
  },
  submitText: { fontSize: 14, fontWeight: '800', color: Theme.colors.background },
  skipBtn: { padding: 10 },
  skipText: { color: Theme.colors.textSecondary, fontSize: 13, fontWeight: '400' }
});

export default ScoreModal;
