import { Request, Response, NextFunction } from 'express';
import { BlogService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, published, search } = req.query;
    const filters: any = {};
    if (category && typeof category === 'string') filters.category = category;
    if (published !== undefined) filters.published = published === 'true';
    if (search && typeof search === 'string') filters.search = search;

    const blogs = await BlogService.list(filters);
    res.json(blogs);
  } catch (error: any) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blog = await BlogService.getById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error: any) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blog = await BlogService.create(req.body, (req as any).superAdmin?.id);
    res.status(201).json(blog);
  } catch (error: any) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blog = await BlogService.update(req.params.id, req.body);
    res.json(blog);
  } catch (error: any) {
    next(error);
  }
};

export const togglePublish = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blog = await BlogService.togglePublish(req.params.id);
    res.json(blog);
  } catch (error: any) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await BlogService.remove(req.params.id);
    res.json({ message: 'Blog article successfully deleted' });
  } catch (error: any) {
    next(error);
  }
};
