import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { uploadProfilePhoto, uploadAdditionalPhotos } from '../api/fileUpload';
import { UserProfile } from '../types';

const { width } = Dimensions.get('window');

const EditProfileScreen = (): JSX.Element => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [career, setCareer] = useState(user?.career || '');
  const [semester, setSemester] = useState(user?.semester?.toString() || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [photos, setPhotos] = useState<{ id: string; photo_url: string; order_index: number }[]>(
    user?.photos || []
  );
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(
    user?.profile_photo || null
  );

  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const successOpacity = useRef(new Animated.Value(0)).current;
  const saveButtonScale = useRef(new Animated.Value(1)).current;

  // Sync state when screen is focused - fetch latest data from server
  useFocusEffect(
    useCallback(() => {
      const refreshUserData = async () => {
        try {
          const response = await apiClient.get('/api/users/me');
          const freshUser = response.data;
          
          setName(freshUser.name || '');
          setAge(freshUser.age?.toString() || '');
          setCareer(freshUser.career || '');
          setSemester(freshUser.semester?.toString() || '');
          setBio(freshUser.bio || '');
          setInterests(freshUser.interests || []);
          setPhotos(freshUser.photos || []);
          setProfilePhotoUri(freshUser.profile_photo || null);
        } catch (err) {
          console.error('Error refreshing user data:', err);
          // Fallback to context user if API fails
          if (user) {
            setName(user.name || '');
            setAge(user.age?.toString() || '');
            setCareer(user.career || '');
            setSemester(user.semester?.toString() || '');
            setBio(user.bio || '');
            setInterests(user.interests || []);
            setPhotos(user.photos || []);
            setProfilePhotoUri(user.profile_photo || null);
          }
        }
      };
      
      refreshUserData();
    }, [user])
  );

  const showSuccess = () => {
    setSuccessVisible(true);
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSuccessVisible(false));
  };

  const handleChangeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoUploading(true);

      let uploaded = false;
      try {
        const res = await uploadProfilePhoto(
          asset.uri,
          asset.fileName || 'profile.jpg',
          asset.mimeType || 'image/jpeg'
        );
        const updatedUser: UserProfile = res;
        setProfilePhotoUri(updatedUser.profile_photo || asset.uri);
        updateUser(updatedUser);
        uploaded = true;
      } catch (error: any) {
        console.error('Error uploading profile photo:', error);
        Alert.alert('Error', `No se pudo subir la foto de perfil. ${error.message}`);
      }

      if (!uploaded) return;
      setPhotoUploading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Límite', 'Máximo 5 fotos adicionales.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const tempId = `temp_${Date.now()}`;
      const tempPhoto = { id: tempId, photo_url: asset.uri, order_index: photos.length };
      setPhotos(prev => [...prev, tempPhoto]);
      setPhotoUploading(true);
      try {
        const res = await uploadAdditionalPhotos(
          asset.uri,
          asset.fileName || `photo_${Date.now()}.jpg`,
          asset.mimeType || 'image/jpeg'
        );

        if (Array.isArray(res?.photos)) {
          setPhotos(res.photos);
        }
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        setPhotos(prev => prev.filter(p => p.id !== tempId));
        Alert.alert('Error', `No se pudo subir la foto. ${error.message}`);
      } finally {
        setPhotoUploading(false);
      }
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/users/me/photos/${photoId}`);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la foto.');
          }
        },
      },
    ]);
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 15) {
      setInterests(prev => [...prev, trimmed]);
      setInterestInput('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(prev => prev.filter(i => i !== interest));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }

    Animated.sequence([
      Animated.spring(saveButtonScale, { toValue: 0.95, useNativeDriver: true, friction: 6 }),
      Animated.spring(saveButtonScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();

    setSaving(true);
    try {
      // Save main profile
      await apiClient.put('/api/users/me', {
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        career: career.trim() || null,
        semester: semester ? parseInt(semester, 10) : null,
        bio: bio.trim() || null,
      });

      // Save interests
      await apiClient.put('/api/users/me/interests', { interests });

      // Fetch the complete updated profile from the server
      const response = await apiClient.get('/api/users/me');
      const updatedUser: UserProfile = response.data;
      updateUser(updatedUser);

      showSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al guardar los cambios.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Photo */}
          <View style={styles.profilePhotoSection}>
            <TouchableOpacity style={styles.profilePhotoWrapper} onPress={handleChangeProfilePhoto}>
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} />
              ) : (
                <View style={[styles.profilePhoto, styles.profilePhotoFallback]}>
                  <Ionicons name="person" size={50} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.photoEditOverlay}>
                {photoUploading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Ionicons name="camera" size={20} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Cambiar foto de perfil</Text>
          </View>

          {/* Personal Info */}
          <Text style={styles.sectionLabel}>Información Personal</Text>
          <View style={styles.card}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.divider} />

            {/* Age */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Edad</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.divider} />

            {/* Career */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Carrera</Text>
              <TextInput
                style={styles.input}
                value={career}
                onChangeText={setCareer}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.divider} />

            {/* Semester */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Semestre</Text>
              <TextInput
                style={styles.input}
                value={semester}
                onChangeText={(v) => {
                  const num = parseInt(v.replace(/[^0-9]/g, ''), 10);
                  if (!v || (num >= 1 && num <= 10)) setSemester(v.replace(/[^0-9]/g, ''));
                }}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          {/* Bio */}
          <Text style={styles.sectionLabel}>Biografía</Text>
          <View style={[styles.card, styles.bioCard]}>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={(t) => t.length <= 300 && setBio(t)}
              placeholder="Cuéntanos sobre ti..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              <Text style={bio.length > 270 ? { color: colors.warning } : {}}>{bio.length}</Text>
              /300
            </Text>
          </View>

          {/* Interests */}
          <Text style={styles.sectionLabel}>Intereses</Text>
          <View style={styles.card}>
            <View style={styles.interestInputRow}>
              <TextInput
                style={styles.interestInput}
                value={interestInput}
                onChangeText={setInterestInput}
                placeholder="Agregar interés..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addInterest}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addInterestBtn} onPress={addInterest}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={styles.addInterestGradient}
                >
                  <Ionicons name="add" size={20} color={colors.text} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.interestsWrap}>
              {interests.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={styles.interestChip}
                  onPress={() => removeInterest(interest)}
                >
                  <Text style={styles.interestChipText}>{interest}</Text>
                  <Ionicons name="close" size={13} color={colors.primary} />
                </TouchableOpacity>
              ))}
              {interests.length === 0 && (
                <Text style={styles.noInterests}>Agrega tus intereses</Text>
              )}
            </View>
          </View>

          {/* Additional Photos */}
          <Text style={styles.sectionLabel}>Mis Fotos</Text>
          <View style={styles.card}>
            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoSlot}
                  onPress={() => handleDeletePhoto(photo.id)}
                >
                  <Image source={{ uri: photo.photo_url }} style={styles.photoSlotImage} />
                  <View style={styles.deleteOverlay}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </View>
                </TouchableOpacity>
              ))}

              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhotoSlot} onPress={handleAddPhoto}>
                  {photoUploading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="add" size={28} color={colors.textMuted} />
                      <Text style={styles.addPhotoText}>Agregar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Success message */}
          {successVisible && (
            <Animated.View style={[styles.successBanner, { opacity: successOpacity }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>¡Perfil actualizado correctamente!</Text>
            </Animated.View>
          )}

          {/* Spacer for sticky button */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Sticky Save Button */}
        <View style={styles.saveContainer}>
          <Animated.View style={{ transform: [{ scale: saveButtonScale }] }}>
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color={colors.text} />
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SLOT_SIZE = (width - 48 - 24) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  profilePhotoWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profilePhotoFallback: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  changePhotoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  bioCard: {
    padding: 16,
  },
  fieldGroup: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  bioInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  interestInputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  interestInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },
  addInterestBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addInterestGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    paddingTop: 4,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  interestChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  noInterests: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    padding: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  photoSlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE * 1.3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoSlotImage: {
    width: '100%',
    height: '100%',
  },
  deleteOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  addPhotoSlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE * 1.3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  addPhotoText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}20`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    marginBottom: 10,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EditProfileScreen;
