const Workspace = require('../models/Workspace');
const WorkspaceUser = require('../models/WorkspaceUser');
const config = require('../config');
const logger = require('../utils/logger');

class WorkspaceService {
  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId) {
    return await Workspace.findById(workspaceId);
  }

  /**
   * Create or get workspace for OAuth user
   */
  async getOrCreateWorkspace(oauthUserId, userInfo, subscriptionInfo) {
    // Check if user already has workspace
    let workspaceUser = await WorkspaceUser.findByOAuthId(oauthUserId);
    
    if (workspaceUser) {
      return await Workspace.findById(workspaceUser.workspace_id);
    }

    // Create new workspace
    const tier = subscriptionInfo?.tier || 'free';
    const tierConfig = config.subscriptionTiers[tier] || config.subscriptionTiers.free;
    
    const workspace = await Workspace.create({
      name: `${userInfo.name}'s Workspace`,
      subscription_tier: tier,
      device_limit: tierConfig.deviceLimit,
      rate_limit_per_minute: tierConfig.rateLimitPerMinute
    });

    // Create workspace user mapping
    await WorkspaceUser.create({
      workspace_id: workspace.id,
      oauth_user_id: oauthUserId,
      email: userInfo.email,
      full_name: userInfo.name,
      role: 'owner'
    });

    logger.info(`Created workspace ${workspace.id} for user ${oauthUserId}`);

    return workspace;
  }

  /**
   * Update workspace subscription tier
   */
  async updateSubscriptionTier(workspaceId, tier) {
    const tierConfig = config.subscriptionTiers[tier];
    if (!tierConfig) {
      throw new Error('Invalid subscription tier');
    }

    return await Workspace.updateSubscription(workspaceId, tier, tierConfig);
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId) {
    return await Workspace.getStats(workspaceId);
  }

  /**
   * Check if workspace can add more devices
   */
  async canAddDevice(workspaceId) {
    const workspace = await Workspace.findById(workspaceId);
    const WhatsAppAccount = require('../models/WhatsAppAccount');
    const currentCount = await WhatsAppAccount.countByWorkspace(workspaceId);
    
    return {
      canAdd: currentCount < workspace.device_limit,
      current: currentCount,
      limit: workspace.device_limit,
      remaining: workspace.device_limit - currentCount
    };
  }
}

module.exports = new WorkspaceService();

