// src/services/goalsService.ts
import { supabase } from './supabase';
import { CoinService } from './coinService';
import { Coin } from '../types/coin';
import {
  CollectionGoal,
  GoalProgress,
  GoalCriteria,
  GoalTemplate,
  GOAL_TEMPLATES,
  normalizeMintMark,
  UNKNOWN_MINT_MARK,
} from '@coin-collecting/shared';
import { Logger } from './logger';

/**
 * Goal criteria and series item keys spell Philadelphia "P", where the album
 * data spells it ''. Fold the stored value — including the NONE/UNKNOWN
 * sentinels — into that vocabulary. An unknown mark stays unmatchable, so an
 * unexamined coin never counts toward completing a date-and-mint series.
 */
function goalMintMark(mintMark: string | null | undefined): string {
  const normalized = normalizeMintMark(mintMark);
  if (normalized === UNKNOWN_MINT_MARK) return UNKNOWN_MINT_MARK;
  return normalized || 'P';
}

export class GoalsService {
  private static activeSubscriptions = new Map<string, any>();
  private static progressListeners = new Map<string, (progress: GoalProgress) => void>();

  // Real-time goal progress monitoring
  static async startGoalProgressMonitoring(userId: string): Promise<void> {
    try {
      // Unsubscribe existing subscription if any
      this.stopGoalProgressMonitoring(userId);

      // Subscribe to coin changes for this user
      const subscription = supabase
        .channel(`goals_${userId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'coins',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            await this.handleCoinChange(payload, userId);
          }
        )
        .subscribe();

      this.activeSubscriptions.set(userId, subscription);
    } catch (error) {
      Logger.error('Error starting goal progress monitoring', error);
    }
  }

  static stopGoalProgressMonitoring(userId: string): void {
    const subscription = this.activeSubscriptions.get(userId);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(userId);
    }
    this.progressListeners.delete(userId);
  }

  static setProgressListener(userId: string, listener: (progress: GoalProgress) => void): void {
    this.progressListeners.set(userId, listener);
  }

  // Handle real-time coin changes
  private static async handleCoinChange(payload: any, userId: string): Promise<void> {
    try {
      const userGoals = await this.getUserGoals(userId);
      const rawCoin = payload.new || payload.old;

      if (!rawCoin) return;

      // Map raw Supabase payload (snake_case) to Coin interface (camelCase)
      const changedCoin = CoinService.mapSupabaseToCoin(rawCoin);

      // Find goals that might be affected by this coin change
      const affectedGoals = userGoals.filter(goal => 
        this.coinMatchesCriteria(changedCoin, goal.criteria)
      );

      // Update progress for affected goals
      for (const goal of affectedGoals) {
        const progress = await this.updateGoalProgress(goal.id);
        if (progress) {
          // Check for milestones and notify
          await this.checkAndNotifyMilestones(goal, progress, changedCoin);
          
          // Notify progress listener if set
          const listener = this.progressListeners.get(userId);
          if (listener) {
            listener(progress);
          }
        }
      }

      // Check for goal suggestions based on the new coin
      if (payload.eventType === 'INSERT' && payload.new) {
        await this.checkGoalSuggestions(payload.new, userId);
      }
    } catch (error) {
      Logger.error('Error handling coin change', error);
    }
  }

  // Smart goal suggestions based on coin characteristics
  static async suggestGoalsForCoin(coin: Coin): Promise<GoalTemplate[]> {
    const suggestions: GoalTemplate[] = [];
    
    try {
      // Analyze coin characteristics and suggest relevant goals
      if (coin.country === 'United States') {
        if (coin.denomination === 'Quarter') {
          // American Women Quarters (2022-2025)
          if (coin.year && coin.year >= 2022 && coin.year <= 2025) {
            const template = GOAL_TEMPLATES.find(t => t.id === 'us_women_quarters');
            if (template) suggestions.push(template);
          }
          
          // State Quarters (1999-2008)
          if (coin.year && coin.year >= 1999 && coin.year <= 2008) {
            const template = GOAL_TEMPLATES.find(t => t.id === 'state_quarters');
            if (template) suggestions.push(template);
          }
          
          // America the Beautiful Quarters (2010-2021)
          if (coin.year && coin.year >= 2010 && coin.year <= 2021) {
            const template = GOAL_TEMPLATES.find(t => t.id === 'america_beautiful_quarters');
            if (template) suggestions.push(template);
          }
        }
        
        // Morgan Dollars
        if (coin.denomination === 'Dollar' && coin.series === 'Morgan') {
          const template = GOAL_TEMPLATES.find(t => t.id === 'morgan_dollars');
          if (template) suggestions.push(template);
        }
        
        // Peace Dollars
        if (coin.denomination === 'Dollar' && coin.series === 'Peace') {
          const template = GOAL_TEMPLATES.find(t => t.id === 'peace_dollars');
          if (template) suggestions.push(template);
        }
        
        // Walking Liberty Half Dollars
        if (coin.denomination === 'Half Dollar' && coin.series === 'Walking Liberty') {
          const template = GOAL_TEMPLATES.find(t => t.id === 'walking_liberty_halves');
          if (template) suggestions.push(template);
        }
      }

      // High-value coin goals
      if (coin.purchasePrice && coin.purchasePrice >= 1000) {
        const template = GOAL_TEMPLATES.find(t => t.id === 'high_value_collection');
        if (template) suggestions.push(template);
      }

      // Certified coin goals
      if (coin.grade && (coin.certificationNumber || coin.grade.includes('MS') || coin.grade.includes('PR'))) {
        const template = GOAL_TEMPLATES.find(t => t.id === 'certified_collection');
        if (template) suggestions.push(template);
      }

    } catch (error) {
      Logger.error('Error suggesting goals for coin', error);
    }

    return suggestions;
  }

  private static async checkGoalSuggestions(coin: Coin, userId: string): Promise<void> {
    try {
      const suggestions = await this.suggestGoalsForCoin(coin);
      const existingGoals = await this.getUserGoals(userId);
      
      // Filter out suggestions for goals the user already has
      const existingGoalTypes = new Set(existingGoals.map(g => `${g.criteria.country}-${g.criteria.denomination}-${g.criteria.series || 'general'}`));
      const newSuggestions = suggestions.filter(suggestion => {
        const suggestionKey = `${suggestion.criteria.country}-${suggestion.criteria.denomination}-${suggestion.criteria.series || 'general'}`;
        return !existingGoalTypes.has(suggestionKey);
      });

      if (newSuggestions.length > 0) {
        // Import and use notification service
        const { NotificationService } = await import('./notificationService');
        await NotificationService.sendGoalSuggestion(coin, newSuggestions);
      }
    } catch (error) {
      Logger.error('Error checking goal suggestions', error);
    }
  }

  private static async checkAndNotifyMilestones(goal: CollectionGoal, progress: GoalProgress, triggerCoin: Coin): Promise<void> {
    try {
      const previousProgress = goal.currentCount > 0 ? (goal.currentCount / goal.targetCount) * 100 : 0;
      const currentProgress = progress.progressPercentage;

      // Check if any milestones were crossed
      const milestones = [25, 50, 75, 100];
      const crossedMilestones = milestones.filter(milestone => 
        previousProgress < milestone && currentProgress >= milestone
      );

      if (crossedMilestones.length > 0) {
        // Import and use notification service
        const { NotificationService } = await import('./notificationService');
        await NotificationService.sendGoalProgressNotification(goal, triggerCoin, crossedMilestones);
      }
    } catch (error) {
      Logger.error('Error checking milestones', error);
    }
  }

  static async getUserGoals(userId?: string): Promise<CollectionGoal[]> {
    try {
      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('collection_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error('Error fetching goals', error);
        return [];
      }

      return data?.map(this.mapSupabaseToGoal) || [];
    } catch (error) {
      Logger.error('Error in getUserGoals', error);
      return [];
    }
  }

  static async createGoal(goal: Omit<CollectionGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentCount' | 'isCompleted'>): Promise<CollectionGoal | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const goalData = {
        user_id: user.id,
        title: goal.title,
        description: goal.description,
        goal_type: goal.goalType,
        criteria: goal.criteria,
        target_count: goal.targetCount,
        current_count: 0,
        is_completed: false,
        priority: goal.priority,
        category: goal.category,
        reward: goal.reward,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('collection_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        Logger.error('Error creating goal', error);
        return null;
      }

      const newGoal = this.mapSupabaseToGoal(data);
      
      // Calculate initial progress
      await this.updateGoalProgress(newGoal.id);
      
      return newGoal;
    } catch (error) {
      Logger.error('Error in createGoal', error);
      return null;
    }
  }

  static async updateGoal(goalId: string, updates: Partial<CollectionGoal>): Promise<CollectionGoal | null> {
    try {
      const updateData = {
        title: updates.title,
        description: updates.description,
        goal_type: updates.goalType,
        criteria: updates.criteria,
        target_count: updates.targetCount,
        priority: updates.priority,
        category: updates.category,
        reward: updates.reward,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('collection_goals')
        .update(updateData)
        .eq('id', goalId)
        .select()
        .single();

      if (error) {
        Logger.error('Error updating goal', error);
        return null;
      }

      return this.mapSupabaseToGoal(data);
    } catch (error) {
      Logger.error('Error in updateGoal', error);
      return null;
    }
  }

  static async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collection_goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        Logger.error('Error deleting goal', error);
        return false;
      }

      return true;
    } catch (error) {
      Logger.error('Error in deleteGoal', error);
      return false;
    }
  }

  static async updateGoalProgress(goalId: string): Promise<GoalProgress | null> {
    try {
      // Get the goal
      const { data: goalData, error: goalError } = await supabase
        .from('collection_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (goalError || !goalData) {
        Logger.error('Error fetching goal for progress update', goalError);
        return null;
      }

      const goal = this.mapSupabaseToGoal(goalData);
      
      // Get user's coins
      const coins = await CoinService.getUserCoins();
      
      // Calculate progress based on goal criteria
      const progress = this.calculateGoalProgress(goal, coins);
      
      // Update the goal's current count and completion status
      const isCompleted = progress.progressPercentage >= 100;
      const updateData = {
        current_count: progress.completedItems.length,
        is_completed: isCompleted,
        completed_at: isCompleted && !goal.isCompleted ? new Date().toISOString() : goal.completedAt,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('collection_goals')
        .update(updateData)
        .eq('id', goalId);

      return progress;
    } catch (error) {
      Logger.error('Error in updateGoalProgress', error);
      return null;
    }
  }

  static async updateAllGoalsProgress(userId?: string): Promise<void> {
    try {
      const goals = await this.getUserGoals(userId);
      
      // Update progress for all goals
      const updatePromises = goals.map(goal => this.updateGoalProgress(goal.id));
      await Promise.all(updatePromises);
    } catch (error) {
      Logger.error('Error updating all goals progress', error);
    }
  }

  static calculateGoalProgress(goal: CollectionGoal, coins: Coin[]): GoalProgress {
    const completedItems: string[] = [];
    const missingItems: string[] = [];

    // Filter coins based on goal criteria
    const matchingCoins = coins.filter(coin => this.coinMatchesCriteria(coin, goal.criteria));
    
    completedItems.push(...matchingCoins.map(coin => coin.id));

    // For series goals, calculate what's missing
    if (goal.goalType === 'series_complete' && goal.criteria.startYear && goal.criteria.endYear) {
      const expectedItems = this.getExpectedItemsForSeries(goal.criteria);
      const foundItems = new Set(matchingCoins.map(coin => `${coin.year}-${goalMintMark(coin.mintMark)}`));
      
      expectedItems.forEach(item => {
        if (!foundItems.has(item)) {
          missingItems.push(item);
        }
      });
    }

    const progressPercentage = goal.targetCount > 0 
      ? Math.min((completedItems.length / goal.targetCount) * 100, 100)
      : 0;

    return {
      goalId: goal.id,
      completedItems,
      missingItems,
      progressPercentage,
      lastUpdated: new Date().toISOString(),
      milestones: this.calculateMilestones(goal, progressPercentage),
    };
  }

  private static coinMatchesCriteria(coin: Coin, criteria: GoalCriteria): boolean {
    // Enhanced country matching with flexible variations
    if (criteria.country) {
      const normalizedCriteriaCountry = criteria.country.toLowerCase();
      const normalizedCoinCountry = (coin.country || '').toLowerCase();
      
      // Handle common country variations
      const countryMatches = (
        normalizedCoinCountry === normalizedCriteriaCountry ||
        this.areCountryVariations(normalizedCoinCountry, normalizedCriteriaCountry)
      );
      
      if (!countryMatches) {
        return false;
      }
    }

    // Enhanced denomination matching with case-insensitive and variations
    if (criteria.denomination && criteria.denomination.length > 0) {
      const normalizedCoinDenom = (coin.denomination || '').toLowerCase();
      const matchesAnyDenomination = criteria.denomination.some(denom => {
        const normalizedCriteriaDenom = denom.toLowerCase();
        return (
          normalizedCoinDenom === normalizedCriteriaDenom ||
          this.areDenominationVariations(normalizedCoinDenom, normalizedCriteriaDenom)
        );
      });
      
      if (!matchesAnyDenomination) {
        return false;
      }
    }

    // Check year range
    if (criteria.startYear && coin.year && coin.year < criteria.startYear) {
      return false;
    }
    if (criteria.endYear && coin.year && coin.year > criteria.endYear) {
      return false;
    }

    // Enhanced mint mark matching
    if (criteria.mintMark && criteria.mintMark.length > 0) {
      const coinMintMark = goalMintMark(coin.mintMark);
      const normalizedCriteriaMintMarks = criteria.mintMark.map(mm => mm.toUpperCase());
      if (!normalizedCriteriaMintMarks.includes(coinMintMark)) {
        return false;
      }
    }

    // Enhanced series matching with multiple fallback strategies
    if (criteria.series) {
      const seriesMatches = this.coinMatchesSeries(coin, criteria);
      if (!seriesMatches) {
        return false;
      }
    }

    // Enhanced grade matching
    if (criteria.minGrade && coin.grade) {
      if (!this.gradeMatches(coin.grade, criteria.minGrade)) {
        return false;
      }
    }

    // Check value range
    if (criteria.minValue && coin.purchasePrice && coin.purchasePrice < criteria.minValue) {
      return false;
    }
    if (criteria.maxValue && coin.purchasePrice && coin.purchasePrice > criteria.maxValue) {
      return false;
    }

    return true;
  }

  // Enhanced series matching with multiple strategies
  private static coinMatchesSeries(coin: Coin, criteria: GoalCriteria): boolean {
    const normalizedCriteriaSeries = criteria.series!.toLowerCase();
    
    // Strategy 1: Direct series match (new structured data)
    if (coin.seriesId && coin.series) {
      return coin.series.toLowerCase() === normalizedCriteriaSeries;
    }
    
    // Strategy 2: Legacy series field match
    if (coin.series) {
      return coin.series.toLowerCase() === normalizedCriteriaSeries;
    }
    
    // Strategy 3: Specific coin name matching for series
    if (coin.specificCoinName) {
      return this.specificCoinMatchesSeries(coin.specificCoinName, normalizedCriteriaSeries);
    }
    
    // Strategy 4: Pattern matching based on year and characteristics
    if (normalizedCriteriaSeries.includes('american women quarters') || 
        normalizedCriteriaSeries.includes('women quarters')) {
      return this.isAmericanWomenQuarter(coin);
    }
    
    if (normalizedCriteriaSeries.includes('state quarters')) {
      return this.isStateQuarter(coin);
    }
    
    if (normalizedCriteriaSeries.includes('morgan')) {
      return this.isMorganDollar(coin);
    }
    
    // Strategy 5: Fall back to partial name matching
    const coinName = (coin.name || '').toLowerCase();
    const coinTitle = (coin.title || '').toLowerCase();
    
    return (
      coinName.includes(normalizedCriteriaSeries) ||
      coinTitle.includes(normalizedCriteriaSeries) ||
      normalizedCriteriaSeries.includes(coinName) ||
      normalizedCriteriaSeries.includes(coinTitle)
    );
  }

  // Helper methods for pattern matching
  private static isAmericanWomenQuarter(coin: Coin): boolean {
    const year = coin.year;
    const denomination = (coin.denomination || '').toLowerCase();
    const country = (coin.country || '').toLowerCase();
    
    return (
      denomination.includes('quarter') &&
      (country.includes('united states') || country.includes('usa') || country.includes('us')) &&
      year >= 2022 && year <= 2025
    );
  }

  private static isStateQuarter(coin: Coin): boolean {
    const year = coin.year;
    const denomination = (coin.denomination || '').toLowerCase();
    const country = (coin.country || '').toLowerCase();
    
    return (
      denomination.includes('quarter') &&
      (country.includes('united states') || country.includes('usa') || country.includes('us')) &&
      year >= 1999 && year <= 2008
    );
  }

  private static isMorganDollar(coin: Coin): boolean {
    const denomination = (coin.denomination || '').toLowerCase();
    const coinName = (coin.name || '').toLowerCase();
    const country = (coin.country || '').toLowerCase();
    
    return (
      denomination.includes('dollar') &&
      (country.includes('united states') || country.includes('usa') || country.includes('us')) &&
      coinName.includes('morgan')
    );
  }

  private static specificCoinMatchesSeries(specificCoinName: string, series: string): boolean {
    const normalizedSpecificCoin = specificCoinName.toLowerCase();
    
    // Check if the specific coin name indicates the series
    if (series.includes('american women quarters') || series.includes('women quarters')) {
      const womenQuarterNames = [
        'maya angelou', 'sally ride', 'wilma mankiller', 'nina otero', 'anna may wong',
        'bessie coleman', 'edith kanaka', 'eleanor roosevelt', 'jovita idar', 'maria tallchief',
        'pauli murray', 'patsy mink', 'mary edwards walker', 'celia cruz', 'zitkala'
      ];
      return womenQuarterNames.some(name => normalizedSpecificCoin.includes(name));
    }
    
    return false;
  }

  // Helper methods for country and denomination variations
  private static areCountryVariations(country1: string, country2: string): boolean {
    const usVariations = ['united states', 'usa', 'us', 'america', 'united states of america'];
    
    if (usVariations.includes(country1) && usVariations.includes(country2)) {
      return true;
    }
    
    // Add more country variations as needed
    return false;
  }

  private static areDenominationVariations(denom1: string, denom2: string): boolean {
    const denominationMap: { [key: string]: string[] } = {
      'quarter': ['quarter', '25 cents', '0.25', 'quarters'],
      'dollar': ['dollar', '$1', '1 dollar', 'dollars'],
      'half dollar': ['half dollar', '50 cents', '0.50', 'half dollars'],
      'dime': ['dime', '10 cents', '0.10', 'dimes'],
      'nickel': ['nickel', '5 cents', '0.05', 'nickels'],
      'penny': ['penny', 'cent', '1 cent', '0.01', 'pennies', 'cents'],
    };
    
    for (const [standard, variations] of Object.entries(denominationMap)) {
      if (variations.includes(denom1) && variations.includes(denom2)) {
        return true;
      }
    }
    
    return false;
  }

  private static gradeMatches(coinGrade: string, minGrade: string): boolean {
    // This is a simplified grade comparison
    // In a real implementation, you'd need proper grade parsing
    const gradeValues: { [key: string]: number } = {
      'PR-70': 70, 'PR-69': 69, 'PR-68': 68, 'PR-67': 67,
      'MS-70': 70, 'MS-69': 69, 'MS-68': 68, 'MS-67': 67, 'MS-66': 66, 'MS-65': 65,
      'MS-64': 64, 'MS-63': 63, 'MS-62': 62, 'MS-61': 61, 'MS-60': 60,
      'AU-58': 58, 'AU-55': 55, 'AU-53': 53, 'AU-50': 50,
      'XF-45': 45, 'XF-40': 40,
      'VF-35': 35, 'VF-30': 30, 'VF-25': 25, 'VF-20': 20,
    };
    
    const coinGradeValue = gradeValues[coinGrade.toUpperCase()] || 0;
    const minGradeValue = gradeValues[minGrade.toUpperCase()] || 0;
    
    return coinGradeValue >= minGradeValue;
  }

  private static getExpectedItemsForSeries(criteria: GoalCriteria): string[] {
    const items: string[] = [];
    
    if (!criteria.startYear || !criteria.endYear) return items;

    // For most series, generate year-mintmark combinations
    const mintMarks = criteria.mintMark || ['P', 'D', 'S']; // Common mint marks
    
    for (let year = criteria.startYear; year <= criteria.endYear; year++) {
      mintMarks.forEach(mintMark => {
        items.push(`${year}-${mintMark}`);
      });
    }

    return items;
  }

  private static calculateMilestones(goal: CollectionGoal, progressPercentage: number) {
    const milestones = [
      { percentage: 25, title: '25% Complete', description: 'Great start!' },
      { percentage: 50, title: 'Halfway There', description: 'You\'re making excellent progress!' },
      { percentage: 75, title: '75% Complete', description: 'Almost there!' },
      { percentage: 100, title: 'Goal Complete!', description: 'Congratulations on completing your goal!' },
    ];

    return milestones.map((milestone, index) => ({
      id: `${goal.id}-milestone-${index}`,
      goalId: goal.id,
      title: milestone.title,
      description: milestone.description,
      targetPercentage: milestone.percentage,
      isCompleted: progressPercentage >= milestone.percentage,
      completedAt: progressPercentage >= milestone.percentage ? new Date().toISOString() : undefined,
    }));
  }

  private static mapSupabaseToGoal(data: any): CollectionGoal {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      goalType: data.goal_type,
      criteria: data.criteria,
      targetCount: data.target_count,
      currentCount: data.current_count,
      isCompleted: data.is_completed,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      priority: data.priority,
      category: data.category,
      reward: data.reward,
    };
  }

  static getGoalTemplates(): GoalTemplate[] {
    return GOAL_TEMPLATES;
  }

  static async createGoalFromTemplate(templateId: string): Promise<CollectionGoal | null> {
    const template = GOAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;

    return this.createGoal({
      title: template.title,
      description: template.description,
      goalType: template.goalType,
      criteria: template.criteria,
      targetCount: template.targetCount,
      userId: '', // Will be set in createGoal
      priority: 'medium',
      category: template.category,
    });
  }
}