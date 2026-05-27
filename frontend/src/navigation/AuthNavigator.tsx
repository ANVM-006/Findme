import React from 'react';
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

const AuthNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
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
  );
};

export default AuthNavigator;
