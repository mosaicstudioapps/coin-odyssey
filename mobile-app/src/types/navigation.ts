// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  ResetPassword: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Scan: NavigatorScreenParams<ScanStackParamList>;
  Collection: NavigatorScreenParams<CollectionStackParamList>;
  Albums: NavigatorScreenParams<AlbumsStackParamList>;
  Settings: undefined;
};

export type AlbumsStackParamList = {
  AlbumsList: undefined;
  AlbumDetail: { albumId: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Map: undefined;
};

export type ScanStackParamList = {
  ScanCapture: undefined;
  ScanPipeline: { obverseUri: string; reverseUri: string };
  ScanReview: { result: import('../services/scanPipeline').ScanResult };
};

export type CollectionStackParamList = {
  CollectionList: undefined;
  CoinDetail: { coin: any };
  AddCoin: { initialImages?: { obverseUri?: string; reverseUri?: string } } | undefined;
  EditCoin: { coinId: string };
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

export type CollectionStackScreenProps<T extends keyof CollectionStackParamList> = StackScreenProps<
  CollectionStackParamList,
  T
>;

export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> = StackScreenProps<
  DashboardStackParamList,
  T
>;

export type AlbumsStackScreenProps<T extends keyof AlbumsStackParamList> = StackScreenProps<
  AlbumsStackParamList,
  T
>;