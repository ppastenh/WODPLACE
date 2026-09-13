import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';

import { createUploadUrl, getPublicUrl } from '../lib/objectStorage';

const router: IRouter = Router();

/**
 * POST /storage/social-uploads/request-url
 *
 * Request a presigned URL for social feed image uploads.
 *
 * SECURITY NOTE: WODPLACE has no real auth system yet (the app syncs a
 * locally generated user id), so this endpoint cannot verify the caller's
 * identity — adding real authentication is tracked as separate work.
 * The declared `size`/`contentType` below are informational metadata only,
 * NOT security controls (the client controls the actual PUT). Real
 * enforcement of size/content happens at publish time in the social posts
 * route, against the stored object's actual bytes
 * (see lib/socialImageValidation.ts).
 */
const MAX_SOCIAL_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

const SocialUploadRequestBody = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  // Informational only — mobile clients can't always know the file size up
  // front (ImagePicker may omit it), so 0/absent must never cause a failure.
  size: z.number().nonnegative().max(MAX_SOCIAL_IMAGE_BYTES).optional().default(0),
  // Early feedback for honest clients only; enforced for real at publish.
  contentType: z.string().regex(/^image\//, 'Only image uploads are allowed'),
});

const UploadResponse = z.object({
  uploadURL: z.string().min(1),
  publicUrl: z.string().min(1),
  metadata: z.object({
    name: z.string(),
    size: z.number().nonnegative(),
    contentType: z.string(),
  }),
});

router.post(
  '/storage/social-uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = SocialUploadRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }
    try {
      const { name, size, contentType } = parsed.data;
      const { uploadURL, key } = await createUploadUrl('social', contentType);
      res.json(
        UploadResponse.parse({
          uploadURL,
          publicUrl: getPublicUrl(key),
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating social upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * POST /storage/avatar-uploads/request-url
 *
 * Request a presigned URL for a member's own profile photo. Mirrors
 * /storage/social-uploads/request-url (same object storage, same "no real
 * auth yet" caveat — the client is trusted to send its own local user id).
 * Smaller size cap since it's a single square photo, not a feed attachment.
 */
const MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const AvatarUploadRequestBody = z.object({
  userId: z.string().min(1),
  size: z.number().nonnegative().max(MAX_AVATAR_IMAGE_BYTES).optional().default(0),
  contentType: z.string().regex(/^image\//, 'Only image uploads are allowed'),
});

router.post(
  '/storage/avatar-uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = AvatarUploadRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }
    try {
      const { size, contentType } = parsed.data;
      const { uploadURL, key } = await createUploadUrl('avatars', contentType);
      res.json(
        UploadResponse.parse({
          uploadURL,
          publicUrl: getPublicUrl(key),
          metadata: { name: 'avatar.jpg', size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating avatar upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * POST /storage/report-uploads/request-url
 *
 * Request a presigned URL for an optional screenshot/evidence photo
 * attached to a Comunidad report. Mirrors the other upload endpoints —
 * same "no real auth yet" caveat, same bucket, own "reports" prefix so the
 * evidence stays organized separately from feed/avatar images.
 */
const MAX_REPORT_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB — screenshot-sized

const ReportUploadRequestBody = z.object({
  reporterId: z.string().min(1),
  size: z.number().nonnegative().max(MAX_REPORT_IMAGE_BYTES).optional().default(0),
  contentType: z.string().regex(/^image\//, 'Only image uploads are allowed'),
});

router.post(
  '/storage/report-uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = ReportUploadRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }
    try {
      const { size, contentType } = parsed.data;
      const { uploadURL, key } = await createUploadUrl('reports', contentType);
      res.json(
        UploadResponse.parse({
          uploadURL,
          publicUrl: getPublicUrl(key),
          metadata: { name: 'report.jpg', size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating report upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

export default router;
