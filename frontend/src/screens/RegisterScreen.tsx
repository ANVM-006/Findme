import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList, useAuthNavigatorControls } from '../navigation/AuthNavigator';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const getPasswordStrength = (
  pass: string
): { label: string; color: string; width: string } => {
  if (pass.length === 0) return { label: '', color: 'transparent', width: '0%' };
  if (pass.length < 6) return { label: 'Débil', color: colors.error, width: '25%' };
  if (pass.length < 8 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass) || !/[a-z]/.test(pass)) {
    return { label: 'Media', color: colors.warning, width: '60%' };
  }
  return { label: 'Fuerte', color: colors.success, width: '100%' };
};

// Moved Outside to prevent keyboard from losing focus on every render / keystroke
const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry,
  rightElement,
  errorText,
  autoCapitalize = 'none',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value: string;
  onChangeText: (val: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
  errorText?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
        <Ionicons
          name={icon}
          size={20}
          color={focused ? colors.primary : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
      {errorText ? <Text style={styles.fieldError}>{errorText}</Text> : null}
    </View>
  );
};

const RegisterScreen = (): JSX.Element => {
  const navigation = useNavigation<RegisterNavProp>();
  const { register } = useAuth();
  const { resetTo } = useAuthNavigatorControls();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [career, setCareer] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const buttonScale = useRef(new Animated.Value(1)).current;
  const passwordStrength = getPasswordStrength(password);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const validateEmail = (val: string) => {
    setEmail(val);
    if (val.length > 5 && !val.toLowerCase().endsWith('@fesc.edu.co')) {
      setEmailError('Debes usar tu correo institucional @fesc.edu.co');
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async () => {
    setError('');

    if (!name.trim()) { setError('Ingresa tu nombre'); return; }
    if (!email.trim()) { setError('Ingresa tu correo'); return; }
    if (!email.toLowerCase().endsWith('@fesc.edu.co')) {
      setError('El correo debe ser @fesc.edu.co');
      return;
    }
    if (!password) { setError('Ingresa una contraseña'); return; }
    
    // Aligned validations with the backend strict requirements
    if (password.length < 8) { 
      setError('La contraseña debe tener al menos 8 caracteres'); 
      return; 
    }
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe tener al menos una letra mayúscula');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('La contraseña debe tener al menos una letra minúscula');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('La contraseña debe tener al menos un número');
      return;
    }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    setIsLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        career: career.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
      resetTo('Onboarding');
    } catch (err: any) {
      console.log('Registration error:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'No se pudo conectar con el servidor. ¿El backend está encendido en tu PC?';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a la comunidad FESC</Text>

          {/* Form Fields */}
          <View style={styles.form}>
            <InputField
              icon="person-outline"
              placeholder="Nombre completo"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <InputField
              icon="mail-outline"
              placeholder="tucorreo@fesc.edu.co"
              value={email}
              onChangeText={validateEmail}
              keyboardType="email-address"
              errorText={emailError}
            />

            <InputField
              icon="school-outline"
              placeholder="Carrera (ej: Ingeniería de Sistemas)"
              value={career}
              onChangeText={setCareer}
              autoCapitalize="words"
            />

            <InputField
              icon="calendar-outline"
              placeholder="Edad"
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />

            {/* Password */}
            <View style={styles.fieldWrapper}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Strength indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: passwordStrength.width as any,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldWrapper}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <Text style={styles.fieldError}>Las contraseñas no coinciden</Text>
              )}
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleRegister}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.registerButtonText}>Crear Cuenta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    height: '100%',
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  registerButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default RegisterScreen;
