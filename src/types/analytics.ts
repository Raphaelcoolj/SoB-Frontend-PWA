export interface DailyMetric {
  date: string;
  newUsers: number;
  activeUsers: number;
  dau: number;
  wau: number;
  mau: number;
  sessions: number;
  averageSessionDuration: number;
  postsCreated: number;
  postsPublished: number;
  postsViewed: number;
  postImpressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
  unfollows: number;
  activeCommenters: number;
  activeCreators: number;
  activeChatUsers: number;
  messagesSent: number;
  conversationsCreated: number;
  notificationsSent: number;
  notificationsOpened: number;
  notificationOpenRate: number;
  pushPermissionGranted: number;
  pushPermissionDenied: number;
  pwaBannerShown: number;
  pwaBannerDismissed: number;
  pwaInstallAccepted: number;
  pwaInstalled: number;
  signupConversionRate: number;
  activationRate: number;
  activatedUsers: number;
  dauMauRatio: number;
  retentionRate: number;
  newUserGrowthRate: number;
  dauGrowthRate: number;
  churnRate: number;
  eventsProcessed: number;
  apiErrors: number;
  clientErrors: number;
  averageApiLatency: number;
}

export interface DailyMetricsResponse {
  from: string;
  to: string;
  days: DailyMetric[];
}
