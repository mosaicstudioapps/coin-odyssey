// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CollectionGoal, GoalTemplate } from '@coin-collecting/shared';
import { Coin } from '../types/coin';
import { Logger } from './logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
  }),
});

export class NotificationService {
  static async initializeNotifications(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Logger.warn('Failed to get push token for push notification');
        return false;
      }

      // Configure notification categories for interactive notifications
      await this.setupNotificationCategories();
      
      return true;
    } catch (error) {
      Logger.error('Error initializing notifications', error);
      return false;
    }
  }

  private static async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('GOAL_SUGGESTION', [
        {
          identifier: 'CREATE_GOAL',
          buttonTitle: 'Create Goal',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('GOAL_PROGRESS', [
        {
          identifier: 'VIEW_GOAL',
          buttonTitle: 'View Progress',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('ACHIEVEMENT_UNLOCKED', [
        {
          identifier: 'VIEW_ACHIEVEMENTS',
          buttonTitle: 'View Achievements',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }
  }

  static async sendGoalProgressNotification(
    goal: CollectionGoal, 
    triggerCoin: Coin, 
    crossedMilestones: number[]
  ): Promise<void> {
    try {
      const highestMilestone = Math.max(...crossedMilestones);
      
      if (highestMilestone === 100) {
        await this.sendGoalCompletionNotification(goal);
      } else {
        await this.sendMilestoneNotification(goal, highestMilestone, triggerCoin);
      }
    } catch (error) {
      Logger.error('Error sending goal progress notification', error);
    }
  }

  static async sendGoalCompletionNotification(goal: CollectionGoal): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Goal Completed!',
          body: `Congratulations! You've completed "${goal.title}"`,
          sound: 'default',
          badge: 1,

          data: {
            type: 'goal_completion',
            goalId: goal.id,
            goalTitle: goal.title,
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      Logger.error('Error sending goal completion notification', error);
    }
  }

  static async sendMilestoneNotification(
    goal: CollectionGoal, 
    milestone: number, 
    triggerCoin: Coin
  ): Promise<void> {
    try {
      const milestoneEmojis: { [key: number]: string } = {
        25: '🌟',
        50: '⭐',
        75: '🔥',
        100: '🎉',
      };

      const milestoneMessages: { [key: number]: string } = {
        25: 'Great start!',
        50: 'Halfway there!',
        75: 'Almost complete!',
        100: 'Goal achieved!',
      };

      const emoji = milestoneEmojis[milestone] || '⭐';
      const message = milestoneMessages[milestone] || 'Keep going!';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${milestone}% Complete`,
          body: `"${goal.title}" - ${message}`,
          sound: 'default',
          badge: 1,

          data: {
            type: 'goal_milestone',
            goalId: goal.id,
            goalTitle: goal.title,
            milestone,
            triggerCoin: {
              id: triggerCoin.id,
              title: `${triggerCoin.year} ${triggerCoin.denomination}`,
            },
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      Logger.error('Error sending milestone notification', error);
    }
  }

  static async sendGoalSuggestion(coin: Coin, suggestedGoals: GoalTemplate[]): Promise<void> {
    try {
      if (suggestedGoals.length === 0) return;

      const primarySuggestion = suggestedGoals[0];
      const coinDescription = `${coin.year || ''} ${coin.denomination}`.trim();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💡 New Goal Suggestion',
          body: `Your ${coinDescription} could start a "${primarySuggestion.title}" collection!`,
          sound: 'default',
          badge: 1,

          data: {
            type: 'goal_suggestion',
            coinId: coin.id,
            coinDescription,
            suggestedGoals: suggestedGoals.map(goal => ({
              id: goal.id,
              title: goal.title,
              description: goal.description,
            })),
          },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false }, // Slight delay to avoid overwhelming user
      });
    } catch (error) {
      Logger.error('Error sending goal suggestion notification', error);
    }
  }

  static async sendBatchProgressUpdate(updates: Array<{
    goal: CollectionGoal;
    progressChange: number;
    newItems: Coin[];
  }>): Promise<void> {
    try {
      if (updates.length === 0) return;

      if (updates.length === 1) {
        const update = updates[0];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📈 Goal Progress Updated',
            body: `"${update.goal.title}" - ${update.newItems.length} new items added`,
            sound: 'default',
            data: {
              type: 'goal_progress_update',
              goalId: update.goal.id,
              newItemsCount: update.newItems.length,
            },
          },
          trigger: null,
        });
      } else {
        const totalNewItems = updates.reduce((sum, update) => sum + update.newItems.length, 0);
        const goalsUpdated = updates.length;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📈 Multiple Goals Updated',
            body: `${totalNewItems} new items added to ${goalsUpdated} goals`,
            sound: 'default',
            data: {
              type: 'batch_goal_update',
              updates: updates.map(update => ({
                goalId: update.goal.id,
                goalTitle: update.goal.title,
                newItemsCount: update.newItems.length,
              })),
            },
          },
          trigger: null,
        });
      }
    } catch (error) {
      Logger.error('Error sending batch progress update', error);
    }
  }

  static async sendWeeklyGoalSummary(userId: string): Promise<void> {
    try {
      // This would typically be called by a background task or scheduled job
      const { GoalsService } = await import('./goalsService');
      const goals = await GoalsService.getUserGoals(userId);
      
      const activeGoals = goals.filter(goal => !goal.isCompleted);
      const recentlyCompleted = goals.filter(goal => 
        goal.isCompleted && 
        goal.completedAt && 
        new Date(goal.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (activeGoals.length === 0 && recentlyCompleted.length === 0) return;

      let title = '📊 Weekly Goal Summary';
      let body = '';

      if (recentlyCompleted.length > 0) {
        body += `🎉 ${recentlyCompleted.length} goal${recentlyCompleted.length > 1 ? 's' : ''} completed this week!`;
      }

      if (activeGoals.length > 0) {
        if (body) body += '\n';
        body += `📈 ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''} in progress`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: 'weekly_summary',
            completedGoals: recentlyCompleted.length,
            activeGoals: activeGoals.length,
          },
        },
        trigger: null,
      });
    } catch (error) {
      Logger.error('Error sending weekly goal summary', error);
    }
  }

  static async scheduleGoalReminder(goal: CollectionGoal, days: number = 7): Promise<void> {
    try {
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + days);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 Goal Reminder',
          body: `Don't forget about your "${goal.title}" goal!`,
          sound: 'default',
          data: {
            type: 'goal_reminder',
            goalId: goal.id,
            goalTitle: goal.title,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    } catch (error) {
      Logger.error('Error scheduling goal reminder', error);
    }
  }

  static async cancelGoalReminder(goalId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const goalReminders = scheduledNotifications.filter(
        notification => notification.content.data?.goalId === goalId
      );

      for (const reminder of goalReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }
    } catch (error) {
      Logger.error('Error canceling goal reminder', error);
    }
  }

  // Handle notification responses (when user taps notification)
  static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    switch (data?.type) {
      case 'goal_suggestion':
        // Navigate to goal creation with pre-filled data
        this.handleGoalSuggestionResponse(data);
        break;
      
      case 'goal_completion':
      case 'goal_milestone':
        // Navigate to goal details or dashboard
        this.handleGoalProgressResponse(data);
        break;
      
      case 'goal_reminder':
        // Navigate to specific goal
        this.handleGoalReminderResponse(data);
        break;
      
      default:
        Logger.debug('Unknown notification type', { type: data?.type });
    }
  }

  private static handleGoalSuggestionResponse(data: any): void {
    // This would integrate with navigation to show goal creation screen
    Logger.debug('Handling goal suggestion response', data);
  }

  private static handleGoalProgressResponse(data: any): void {
    // This would integrate with navigation to show goal details
    Logger.debug('Handling goal progress response', data);
  }

  private static handleGoalReminderResponse(data: any): void {
    // This would integrate with navigation to show specific goal
    Logger.debug('Handling goal reminder response', data);
  }

  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      Logger.error('Error clearing notifications', error);
    }
  }

  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      Logger.error('Error getting badge count', error);
      return 0;
    }
  }

  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      Logger.error('Error setting badge count', error);
    }
  }
}
