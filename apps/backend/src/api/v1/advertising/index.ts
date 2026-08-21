import { Router } from 'express';
import formBuilderRoutes from './forms/form-builder.routes';
import publicFormsRoutes from './forms/public-forms.routes';
import websiteRoutes from './websites/website.routes';
import websitePublicRoutes from './websites/website-public.routes';

export const protectedRoutes = Router();
export const publicRoutes = Router();

// Protected Routes
protectedRoutes.use('/forms', formBuilderRoutes);
protectedRoutes.use('/websites', websiteRoutes);

// Public Routes
publicRoutes.use('/forms', publicFormsRoutes);
publicRoutes.use('/websites', websitePublicRoutes);
