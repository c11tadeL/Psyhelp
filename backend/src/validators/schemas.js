const { z } = require('zod');

const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  nickname: z
    .string()
    .regex(/^[A-Za-z0-9_]{3,32}$/, 'Nickname must be 3-32 chars: letters, digits, underscore'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const UpdateProfileSchema = z.object({
  nickname: z
    .string()
    .regex(/^[A-Za-z0-9_]{3,32}$/)
    .optional(),
});

const CreatePostSchema = z.object({
  category_id: z.number().int().positive(),
  body: z.string().min(10).max(5000),
});

const UpdatePostSchema = z.object({
  body: z.string().min(10).max(5000).optional(),
  category_id: z.number().int().positive().optional(),
});

const PostsListQuerySchema = z.object({
  category: z.coerce.number().int().positive().optional(),
  cursor_date: z.string().datetime().optional(),
  cursor_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['recent', 'rating']).default('recent'),
});

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

const CreateDiarySchema = z.object({
  mood: z.number().int().min(1).max(10),
  note: z.string().max(2000).optional(),
  entry_date: z.string().date().optional(),
});

const DiaryQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(365).default(30),
});

// AI Chat
const SendMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

const CreateComplaintSchema = z.object({
  content_type: z.enum(['post', 'comment']),
  content_id: z.number().int().positive(),
  reason: z.enum([
    'offensive',
    'spam',
    'threat',
    'self_harm',
    'misinformation',
    'other',
  ]),
  comment: z.string().max(500).optional(),
});

const ResolveComplaintSchema = z.object({
  action: z.enum(['delete_content', 'reject', 'warn_user']),
  warning_reason: z.string().max(500).optional(),
});

module.exports = {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  UpdateProfileSchema,
  CreatePostSchema,
  UpdatePostSchema,
  PostsListQuerySchema,
  CreateCommentSchema,
  CreateDiarySchema,
  DiaryQuerySchema,
  SendMessageSchema,
  CreateComplaintSchema,
  ResolveComplaintSchema,
};
