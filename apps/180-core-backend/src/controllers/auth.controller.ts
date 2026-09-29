'use strict';

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { developersPrisma as prisma } from '@workspace/db-180core';
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
  static initiateSignup = DomainIdentityAuthController.initiateSignup;
  static verifySignupOtp = DomainIdentityAuthController.verifySignupOtp;
  static setPassword = DomainIdentityAuthController.setPassword;
  static completeOnboarding = DomainIdentityAuthController.completeOnboarding;
  static forgotPassword = DomainIdentityAuthController.forgotPassword;
  static verifyResetOtp = DomainIdentityAuthController.verifyResetOtp;
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
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.error || 'Invalid or expired verification code' });
      }

      const { e164, national, msg91Mobile } = Msg91OtpService.normalizePhone(phone);
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: e164 },
            { phone: national },
            { phone: msg91Mobile },
            { phone: `+${national}` }
          ]
        }
      });

      if (!user) {
        const uniqueUsername = await UsernameService.generateUniqueUsername(`user_${national.slice(-4)}`);
        user = await prisma.user.create({
          data: {
            name: `User (+91 ${national.slice(-10)})`,
            phone: e164,
            username: uniqueUsername,
            email: `${uniqueUsername}@180identity.internal`,
            role: 'USER',
            isPhoneVerified: true,
            isVerified: true,
            isOnboarded: false,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`
          }
        });
      }

      const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '180-identity-jwt-secret-key-prod-super-secure';
      const token = jwt.sign(
        {
          id: user.id,
          sub: user.id,
          userId: user.id,
          email: user.email,
          name: user.name || '',
          username: user.username || '',
          role: user.role || 'USER',
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name || '',
          username: user.username || '',
          email: user.email,
          phone: user.phone || null,
          avatarUrl: user.avatarUrl || '',
          headline: user.headline || '',
          age: user.age || null,
          latitude: user.latitude ?? null,
          longitude: user.longitude ?? null,
          city: user.city || '',
          country: user.country || '',
          role: user.role || 'USER',
          isOnboarded: Boolean(user.isOnboarded)
        }
      });
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
