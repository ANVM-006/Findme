import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { UserProfile } from '../types';

const { width } = Dimensions.get('window');

const ProfileScreen = (): JSX.Element => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(user);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/users/me');
      setProfile(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!profile || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const mainPhoto =
    profile.profile_photo ||
    (profile.photos?.length > 0 ? profile.photos[0].photo_url : null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile photo header */}
        <View style={styles.photoHeader}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={[styles.coverPhoto, styles.coverPhotoFallback]}>
              <Ionicons name="person" size={80} color={colors.textMuted} />
            </View>
          )}

          {/* Gradient */}
          <LinearGradient
            colors={['transparent', colors.background]}
            locations={[0.5, 1]}
            style={styles.coverGradient}
          />

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.editButtonInner}>
              <Ionicons name="create-outline" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile info */}
        <View style={styles.infoSection}>
          {/* Name & Age */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.age && <Text style={styles.age}>, {profile.age}</Text>}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {profile.career && (
              <View style={styles.statItem}>
                <Ionicons name="school-outline" size={16} color={colors.primary} />
                <Text style={styles.statText}>{profile.career}</Text>
              </View>
            )}
            {profile.semester && (
              <View style={styles.statItem}>
                <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                <Text style={styles.statText}>Semestre {profile.semester}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio ? (
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>Sobre mí</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBioBtn}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addBioText}>Agregar biografía</Text>
            </TouchableOpacity>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Intereses</Text>
              <View style={styles.interestsWrap}>
                {profile.interests.map((interest, i) => (
                  <View key={i} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gallery */}
          {profile.photos && profile.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mis fotos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.galleryRow}>
                  {profile.photos.map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.photo_url }}
                      style={styles.galleryPhoto}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Edit Profile button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editProfileGradient}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text style={styles.editProfileText}>Editar Perfil</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHeader: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFallback: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  editButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
    marginTop: -40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  name: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
  },
  age: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '400',
    marginBottom: 2,
  },
  statsRow: {
    gap: 8,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  bioSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  addBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  addBioText: {
    color: colors.primary,
    fontSize: 15,
  },
  section: {
    marginBottom: 28,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  interestChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  galleryPhoto: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  editProfileButton: {
    marginBottom: 14,
    borderRadius: 28,
    overflow: 'hidden',
  },
  editProfileGradient: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 28,
  },
  editProfileText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 28,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
