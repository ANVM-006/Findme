import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type SplashNavProp = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const { width } = Dimensions.get('window');

const SplashScreen = (): JSX.Element => {
  const navigation = useNavigation<SplashNavProp>();
  const { isAuthenticated, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace('Login'); // RootNavigator handles this via isAuthenticated
      } else {
        navigation.replace('Login');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Decorative ring */}
          <View style={styles.ring}>
            <View style={styles.innerRing} />
          </View>

          <Text style={styles.logo}>FINDME</Text>
          <View style={styles.logoUnderline} />
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleFade }}>
          <Text style={styles.subtitle}>Universidad FESC</Text>
          <Text style={styles.tagline}>Conecta. Conoce. Descubre.</Text>
        </Animated.View>

        {/* Loader */}
        <Animated.View style={[styles.loaderContainer, { opacity: fadeAnim }]}>
          <ActivityIndicator color={colors.primary} size="small" />
        </Animated.View>
      </View>

      {/* Bottom decoration */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made for FESC students ❤️</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    top: -50,
  },
  innerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  logo: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 6,
  },
  logoUnderline: {
    width: 60,
    height: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
  },
  loaderContainer: {
    marginTop: 60,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default SplashScreen;
