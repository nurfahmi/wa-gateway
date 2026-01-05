const WhatsAppAccount = require('../models/WhatsAppAccount');
const ProviderFactory = require('../providers/factory');
const workspaceService = require('./workspaceService');
const logger = require('../utils/logger');

class AccountService {
  /**
   * Create new WhatsApp account
   */
  async createAccount(workspaceId, data) {
    // Check device limit
    const limitCheck = await workspaceService.canAddDevice(workspaceId);
    if (!limitCheck.canAdd) {
      throw new Error(`Device limit reached (${limitCheck.limit})`);
    }

    // Validate provider
    if (!ProviderFactory.isSupported(data.provider)) {
      throw new Error(`Unsupported provider: ${data.provider}`);
    }

    // Create account record
    const accountIdentifier = `ws_${workspaceId}_${Date.now()}`;
    
    const account = await WhatsAppAccount.create({
      workspace_id: workspaceId,
      provider: data.provider,
      account_identifier: accountIdentifier,
      display_name: data.displayName || null,
      phone_number: data.phoneNumber || null,
      status: 'connecting',
      baileys_disclaimer_accepted: true // Always true, no longer required from user
    });

    // Initialize provider
    try {
      const provider = ProviderFactory.create(data.provider);
      const result = await provider.initialize({
        accountId: account.id,
        accountIdentifier: accountIdentifier,
        workspaceId: workspaceId
      });

      // Update account with initialization result
      if (result.qrCode) {
        await WhatsAppAccount.updateQR(
          account.id,
          result.qrCode,
          new Date(Date.now() + 60000) // QR expires in 60 seconds
        );
      }

      if (result.phoneNumber) {
        await WhatsAppAccount.updateStatus(account.id, result.status, result.phoneNumber);
      }

      logger.info(`Created account ${account.id} for workspace ${workspaceId}`);

      return await WhatsAppAccount.findById(account.id);
    } catch (error) {
      // Update account status to failed
      await WhatsAppAccount.updateStatus(account.id, 'failed');
      throw error;
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountId, workspaceId) {
    const account = await WhatsAppAccount.findById(accountId);
    
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Get all accounts for workspace
   */
  async getWorkspaceAccounts(workspaceId, filters = {}) {
    return await WhatsAppAccount.findByWorkspace(workspaceId, filters);
  }

  /**
   * Get account QR code
   */
  async getQRCode(accountId, workspaceId) {
    const account = await this.getAccount(accountId, workspaceId);
    
    // Don't allow QR fetch for already connected accounts
    if (account.status === 'connected') {
      throw new Error('Account is already connected');
    }

    // If QR exists in database and not expired, return it
    if (account.qr_code) {
      if (!account.qr_expires_at || new Date(account.qr_expires_at) > new Date()) {
        return account.qr_code;
      }
      logger.info(`QR code expired for account ${accountId}, fetching new one`);
    }

    // If no QR in database or expired, try to fetch from Baileys
    try {
      const provider = ProviderFactory.create(account.provider);
      const qrCode = await provider.getQRCode(account.account_identifier);
      
      if (qrCode) {
        // Store in database
        await WhatsAppAccount.updateQR(
          accountId,
          qrCode,
          new Date(Date.now() + 60000) // QR expires in 60 seconds
        );
        return qrCode;
      }
    } catch (error) {
      logger.warn(`Could not fetch QR from provider for account ${accountId}:`, error.message);
    }

    // Return null if no QR available yet
    return null;
  }

  /**
   * Get account status
   */
  async getAccountStatus(accountId, workspaceId) {
    const account = await this.getAccount(accountId, workspaceId);
    
    try {
      const provider = ProviderFactory.create(account.provider);
      const status = await provider.getStatus(account.account_identifier);
      
      // Always update database if status or phone number changed
      // This ensures we sync the latest state from Baileys service
      if (status.status !== account.status || status.phoneNumber !== account.phone_number) {
        logger.info(`Status sync for account ${accountId}: ${account.status} -> ${status.status}, phone: ${account.phone_number} -> ${status.phoneNumber}`);
        await WhatsAppAccount.updateStatus(account.id, status.status, status.phoneNumber);
      }
      
      return status;
    } catch (error) {
      logger.error(`Failed to get status for account ${accountId}:`, error);
      return { status: account.status, phoneNumber: account.phone_number };
    }
  }

  /**
   * Disconnect and delete account
   */
  async deleteAccount(accountId, workspaceId) {
    const account = await this.getAccount(accountId, workspaceId);
    
    try {
      // Delete device from Baileys service (this also logs out)
      const provider = ProviderFactory.create(account.provider);
      if (provider.deleteDevice) {
        await provider.deleteDevice(account.account_identifier);
        logger.info(`Deleted device from Baileys service for account ${accountId}`);
      } else {
        // Fallback to disconnect if deleteDevice not available
        await provider.disconnect(account.account_identifier);
        logger.warn(`Provider does not support deleteDevice, only logged out account ${accountId}`);
      }
    } catch (error) {
      logger.error(`Failed to delete device from Baileys for account ${accountId}:`, error);
      // Continue with database deletion even if Baileys deletion fails
    }
    
    // Delete from database
    await WhatsAppAccount.delete(accountId);
    
    logger.info(`Deleted account ${accountId} from database`);
  }

  /**
   * Setup event listeners for account
   */
  async setupEventListeners(accountId, onEvent) {
    const account = await WhatsAppAccount.findById(accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    const provider = ProviderFactory.create(account.provider);
    await provider.setupEventListeners(account.account_identifier, onEvent);
    
    logger.info(`Event listeners setup for account ${accountId}`);
  }

  /**
   * Sync contacts from WhatsApp (Baileys service)
   * This syncs WhatsApp contacts to the database for broadcast management
   * Note: The main contact system is for broadcast management (uploaded contacts, scheduled broadcasts)
   * This method is for syncing WhatsApp contacts to enrich the contact database
   */
  async getContacts(accountId, workspaceId) {
    const account = await this.getAccount(accountId, workspaceId);
    
    if (account.status !== 'connected') {
      throw new Error('Account must be connected to sync contacts');
    }

    // Fetch contacts from Baileys service
    const provider = ProviderFactory.create(account.provider);
    const contacts = await provider.getContacts(account.account_identifier);
    
    // Save/update contacts in database for broadcast management
    // These contacts can then be used for scheduled broadcasts, birthday notifications, etc.
    const Contact = require('../models/Contact');
    for (const contact of contacts) {
      await Contact.upsert({
        workspace_id: workspaceId,
        account_id: accountId,
        phone_number: contact.phoneNumber,
        name: contact.name || contact.pushName || null,
        profile_pic: contact.profilePicUrl || null
      });
    }
    
    logger.info(`Synced ${contacts.length} WhatsApp contacts to database for account ${accountId}`);
    return contacts;
  }

  /**
   * Configure AI auto-reply settings
   */
  async configureAI(accountId, workspaceId, aiSettings) {
    const account = await this.getAccount(accountId, workspaceId);
    
    if (account.status !== 'connected') {
      throw new Error('Account must be connected to configure AI');
    }

    const provider = ProviderFactory.create(account.provider);
    const result = await provider.configureAI(account.account_identifier, aiSettings);
    
    logger.info(`AI configured for account ${accountId}`);
    return result;
  }

  /**
   * Upload file
   */
  async uploadFile(workspaceId, fileBuffer, fileName, fileType) {
    const provider = ProviderFactory.create('baileys'); // Assuming Baileys for now
    const result = await provider.uploadFile(`workspace_${workspaceId}`, fileBuffer, fileName, fileType);
    
    logger.info(`File uploaded for workspace ${workspaceId}: ${fileName}`);
    return result;
  }

  /**
   * Get file info
   */
  async getFileInfo(fileId) {
    const provider = ProviderFactory.create('baileys');
    return await provider.getFileInfo(fileId);
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    const provider = ProviderFactory.create('baileys');
    return await provider.deleteFile(fileId);
  }
}

module.exports = new AccountService();

