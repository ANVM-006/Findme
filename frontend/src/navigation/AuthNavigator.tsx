import React, { createContext, useContext, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorControlsValue = {
  resetTo: (screen: keyof AuthStackParamList) => void;
};

const AuthNavigatorControls = createContext<AuthNavigatorControlsValue | null>(null);

export const useAuthNavigatorControls = (): AuthNavigatorControlsValue => {
  const ctx = useContext(AuthNavigatorControls);
  if (!ctx) {
    throw new Error('useAuthNavigatorControls must be used within AuthNavigator');
  }
  return ctx;
};

const AuthNavigator = ({
  initialRouteName = 'Splash',
}: {
  initialRouteName?: AuthStackParamList[keyof AuthStackParamList] | keyof AuthStackParamList;
}): JSX.Element => {
  const navigatorRef = useRef<any>(null);

  const resetTo = (screen: keyof AuthStackParamList) => {
    navigatorRef.current?.reset({
      index: 0,
      routes: [{ name: screen }],
    });
  };

  return (
    <AuthNavigatorControls.Provider value={{ resetTo }}>
      <Stack.Navigator
        ref={navigatorRef}
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </AuthNavigatorControls.Provider>
  );
};

export default AuthNavigator;
