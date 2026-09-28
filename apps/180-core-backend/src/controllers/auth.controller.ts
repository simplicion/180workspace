'use strict';

import { Request, Response } from 'express';
import {
  OAuthController as DomainOAuthController,
  IdentityAuthController as DomainIdentityAuthController,
  Msg91OtpService,
  UsernameService,
  LocationService,
} from '@workspace/identity-provider';

export class AuthApiController {
  static getOpenIdConfiguration = DomainOAuthController.getOpenIdConfiguration;
  static getJwks = DomainOAuthController.getJwks;
  static validateAuthorize = DomainOAuthController.validateAuthorize;
  static submitConsent = DomainOAuthController.submitConsent;
  static exchangeToken = DomainOAuthController.exchangeToken;
  static getUserInfo = DomainOAuthController.getUserInfo;
  static verifyToken = DomainOAuthController.verifyToken;
  static revokeToken = DomainOAuthController.revokeToken;

  static login = DomainIdentityAuthController.login;
  static register = DomainIdentityAuthController.register;
  static forgotPassword = DomainIdentityAuthController.forgotPassword;
  static resetPassword = DomainIdentityAuthController.resetPassword;
  static googleContinue = DomainIdentityAuthController.googleContinue;

  static async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
      const result = await Msg91OtpService.sendWhatsAppOtp(phone);
      return res.json(result);
    } catch (err: any) {
      console.error('[AuthApiController:sendOtp] Error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
      }
      const result = await Msg91OtpService.verifyWhatsAppOtp(phone, otp);
      return res.json(result);
    } catch (err: any) {
      console.error('[AuthApiController:verifyOtp] Error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async checkUsername(req: Request, res: Response) {
    try {
      const { username, name } = req.query;
      if (name && !username) {
        const generated = await UsernameService.generateUniqueUsername(String(name));
        return res.json({ success: true, username: generated });
      }
      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }
      const result = await UsernameService.checkAvailability(String(username));
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[AuthApiController:checkUsername] Error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resolveLocation(req: Request, res: Response) {
    try {
      const { latitude, longitude } = req.body;
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      }
      const result = await LocationService.resolveCoordinates(Number(latitude), Number(longitude));
      return res.json({ success: true, location: result });
    } catch (err: any) {
      console.error('[AuthApiController:resolveLocation] Error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
