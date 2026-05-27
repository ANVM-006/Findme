import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type OnboardingNavProp = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

interface PhotoItem {
  id: string;
  photo_url: string;
  order_index: number;
}

const OnboardingScreen = (): JSX.Element => {
  const navigation = useNavigation<OnboardingNavProp>();
  const { updateUser, user } = useAuth();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Profile photo
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [profilePhotoUploaded, setProfilePhotoUploaded] = useState(false);

  // Step 2: Additional photos
  const [additionalPhotos, setAdditionalPhotos] = useState<PhotoItem[]>([]);

  // Step 3: Bio
  const [bio, setBio] = useState('');

  // Step 4: Interests
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToNextStep = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(width);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    });
  };

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para subir fotos.');
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
      setProfilePhotoUri(asset.uri);
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('photo', {
          uri: asset.uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);

        const res = await apiClient.post('/api/users/me/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfilePhotoUploaded(true);
        if (res.data?.user) updateUser(res.data.user);
      } catch {
        Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
        setProfilePhotoUri(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const pickAdditionalPhoto = async () => {
    if (additionalPhotos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes subir máximo 5 fotos adicionales.');
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
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('photo', {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any);

        const res = await apiClient.post('/api/users/me/photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.photo) {
          setAdditionalPhotos(prev => [...prev, res.data.photo]);
        }
      } catch {
        Alert.alert('Error', 'No se pudo subir la foto.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const deleteAdditionalPhoto = async (photoId: string) => {
    Alert.alert('Eliminar foto', '¿Seguro que quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/users/me/photos/${photoId}`);
            setAdditionalPhotos(prev => prev.filter(p => p.id !== photoId));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la foto.');
          }
        },
      },
    ]);
  };

  const saveBio = async () => {
    try {
      await apiClient.put('/api/users/me', { bio });
    } catch {
      // Continue anyway
    }
  };

  const saveInterests = async () => {
    try {
      await apiClient.put('/api/users/me/interests', { interests });
    } catch {
      // Continue anyway
    }
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

  const handleNext = async () => {
    if (step === 2) await saveBio();
    if (step === 3) {
      await saveInterests();
      navigation.replace('Login'); // Auth context will route to Main
      return;
    }
    animateToNextStep(step + 1);
  };

  const handleSkip = () => {
    if (step === 3) {
      navigation.replace('Login');
      return;
    }
    animateToNextStep(step + 1);
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            { backgroundColor: i <= step ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tu Foto de Perfil</Text>
      <Text style={styles.stepSubtitle}>Elige una foto que te represente bien</Text>

      <TouchableOpacity style={styles.profilePhotoArea} onPress={pickProfilePhoto}>
        {profilePhotoUri ? (
          <Image source={{ uri: profilePhotoUri }} style={styles.profilePhotoPreview} />
        ) : (
          <View style={styles.profilePhotoPlaceholder}>
            <LinearGradient
              colors={[colors.surface, colors.surfaceElevated]}
              style={styles.photoPlaceholderInner}
            >
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Agregar foto</Text>
            </LinearGradient>
          </View>
        )}

        {profilePhotoUri && (
          <View style={styles.editPhotoOverlay}>
            <Ionicons name="camera" size={24} color={colors.text} />
          </View>
        )}

        {isLoading && (
          <View style={styles.photoLoader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>

      {profilePhotoUploaded && (
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.successText}>Foto subida correctamente</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleNext}
        disabled={!profilePhotoUploaded}
        style={{ opacity: profilePhotoUploaded ? 1 : 0.4 }}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Más Fotos</Text>
      <Text style={styles.stepSubtitle}>Agrega hasta 5 fotos para mostrar tu personalidad</Text>

      <View style={styles.photosGrid}>
        {additionalPhotos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.photoSlot}
            onPress={() => deleteAdditionalPhoto(photo.id)}
          >
            <Image source={{ uri: photo.photo_url }} style={styles.photoSlotImage} />
            <View style={styles.deletePhotoOverlay}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </View>
          </TouchableOpacity>
        ))}

        {additionalPhotos.length < 5 && (
          <TouchableOpacity style={styles.photoSlotAdd} onPress={pickAdditionalPhoto}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="add" size={32} color={colors.textMuted} />
                <Text style={styles.addPhotoText}>Agregar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextButtonSmall}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tu Biografía</Text>
      <Text style={styles.stepSubtitle}>Cuéntales a otros quién eres</Text>

      <View style={styles.bioContainer}>
        <TextInput
          style={styles.bioInput}
          placeholder="Escribe algo sobre ti... tus hobbies, lo que buscas, qué te apasiona..."
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={(t) => t.length <= 300 && setBio(t)}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.charCounter}>
          <Text style={bio.length > 270 ? { color: colors.warning } : {}}>{bio.length}</Text>
          /300
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextButtonSmall}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tus Intereses</Text>
      <Text style={styles.stepSubtitle}>Agrega etiquetas que te definan</Text>

      <View style={styles.interestInputRow}>
        <TextInput
          style={styles.interestInput}
          placeholder="Ej: Música, Deportes, Tecnología..."
          placeholderTextColor={colors.textMuted}
          value={interestInput}
          onChangeText={setInterestInput}
          onSubmitEditing={addInterest}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addInterestBtn} onPress={addInterest}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.addInterestGradient}
          >
            <Ionicons name="add" size={22} color={colors.text} />
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
            <Ionicons name="close" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ))}
        {interests.length === 0 && (
          <Text style={styles.noInterestsText}>Agrega al menos un interés</Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextButtonSmall}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Finalizar 🎉</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configura tu perfil</Text>
          <Text style={styles.headerStep}>
            Paso {step + 1} de {TOTAL_STEPS}
          </Text>
        </View>

        {renderProgressBar()}

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {steps[step]()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerStep: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  profilePhotoArea: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profilePhotoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  profilePhotoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  photoSlot: {
    width: (width - 48 - 24) / 3,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoSlotImage: {
    width: '100%',
    height: '100%',
  },
  deletePhotoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  photoSlotAdd: {
    width: (width - 48 - 24) / 3,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  addPhotoText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  skipButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  nextButtonSmall: {
    flex: 1,
  },
  nextButtonGradient: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bioContainer: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  bioInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  interestInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  interestInput: {
    flex: 1,
    height: 52,
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
  },
  addInterestBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
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
    gap: 10,
    marginBottom: 24,
    minHeight: 50,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  interestChipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  noInterestsText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default OnboardingScreen;
