import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// AI Monitoring: Detect contact information sharing
function detectContactInfo(text: string): { hasContactInfo: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Phone number patterns
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // US format
    /\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // International
    /\b09\d{9}\b/, // Iran mobile
    /\b0\d{10}\b/, // Generic 11 digit starting with 0
  ];

  // Email patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  // External platform keywords
  const platformKeywords = [
    'whatsapp', 'telegram', 'signal', 'viber', 'wechat',
    'facebook', 'instagram', 'twitter', 'linkedin', 'telegram',
    'skype', 'zoom', 'meet', 'teams',
  ];

  // Check for phone numbers
  for (const pattern of phonePatterns) {
    if (pattern.test(text)) {
      reasons.push('Phone number detected');
      break;
    }
  }

  // Check for emails
  if (emailPattern.test(text)) {
    reasons.push('Email address detected');
  }

  // Check for external platforms
  const lowerText = text.toLowerCase();
  for (const platform of platformKeywords) {
    if (lowerText.includes(platform)) {
      reasons.push(`External platform "${platform}" mentioned`);
      break; // Only report once for platforms
    }
  }

  // Check for "call me" or "contact me" patterns
  const contactPatterns = [
    /call\s+me/i,
    /contact\s+me/i,
    /reach\s+me/i,
    /text\s+me/i,
    /my\s+(phone|number|email|contact)/i,
    /send\s+(me\s+)?(your\s+)?(number|phone|email|contact)/i,
  ];

  for (const pattern of contactPatterns) {
    if (pattern.test(text)) {
      reasons.push('Contact sharing request detected');
      break;
    }
  }

  return { hasContactInfo: reasons.length > 0, reasons };
}

// GET /api/chat/rooms
router.get('/rooms', authenticate, async (req: AuthRequest, res: Response) => {
  const { categoryId } = req.query as any;
  try {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    const rooms = await prisma.chatRoom.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: req.params.id },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true, role: true } } },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/rooms/:id/messages
router.post('/rooms/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { displayName: true, role: true },
    });

    const message = await prisma.chatMessage.create({
      data: {
        roomId: req.params.id,
        senderId: req.user!.userId,
        senderName: user?.displayName,
        senderRole: user?.role,
        text,
      },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true, role: true } } },
    });

    await prisma.chatRoom.update({
      where: { id: req.params.id },
      data: { lastMessage: text, lastMessageAt: new Date() },
    });

    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Provider Messages (Customer ↔ Provider) ─────────────────────────────────

// GET /api/chat/provider-messages - Get all provider conversations for current user
router.get('/provider-messages', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId, role } = req.user!;
  try {
    // Find all requests where this user is customer
    const requests = await prisma.request.findMany({
      where: { customerId: userId },
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true } },
        service: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique providers with last message info
    const providerMap = new Map();
    for (const request of requests) {
      if (!providerMap.has(request.providerId)) {
        providerMap.set(request.providerId, {
          providerId: request.providerId,
          provider: request.provider,
          service: request.service,
          lastMessage: request.details || 'Service request created',
          timestamp: request.createdAt,
          read: request.status !== 'pending',
        });
      }
    }

    res.json(Array.from(providerMap.values()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/provider/:providerId - Get chat history with specific provider
router.get('/provider/:providerId', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const { providerId } = req.params;

  try {
    // Verify they have an existing relationship (request or message)
    const hasRelationship = await prisma.request.findFirst({
      where: {
        OR: [
          { customerId: userId, providerId },
          { customerId: providerId, providerId: userId },
        ],
      },
    });

    if (!hasRelationship) {
      return res.status(403).json({
        error: 'You can only message providers after requesting their services or when they contact you first.',
      });
    }

    // Get ticket messages between these users (used for provider-customer chat)
    const messages = await prisma.ticket.findMany({
      where: {
        OR: [
          { creatorId: userId, recipientId: providerId },
          { creatorId: providerId, recipientId: userId },
        ],
        type: 'client_to_provider',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format messages
    const formattedMessages = messages.flatMap((ticket: any) => {
      const msgs = (ticket.messages as any[]) || [];
      return msgs.map((m: any) => ({
        id: `${ticket.id}-${m.timestamp}`,
        ticketId: ticket.id,
        text: m.text,
        senderId: m.senderId,
        senderName: m.senderName,
        timestamp: m.timestamp,
      }));
    }).sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json(formattedMessages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/provider/:providerId - Send message to provider (AI monitored)
router.post('/provider/:providerId', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const { providerId } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // AI Monitoring: Check for contact information
    const aiCheck = detectContactInfo(message);
    if (aiCheck.hasContactInfo) {
      return res.status(400).json({
        error: 'Message blocked by AI monitoring',
        reason: 'Contact information or external platform references detected',
        details: aiCheck.reasons,
        message: 'For your safety and to ensure quality service, all communication must stay within the app. '
          + 'Sharing phone numbers, emails, or suggesting external platforms is not allowed. '
          + 'Our AI monitors all messages to prevent fraud and protect both customers and providers.',
      });
    }

    // Verify they have an existing relationship
    const hasRelationship = await prisma.request.findFirst({
      where: {
        OR: [
          { customerId: userId, providerId },
          { customerId: providerId, providerId: userId },
        ],
      },
    });

    if (!hasRelationship) {
      return res.status(403).json({
        error: 'You can only message providers after requesting their services or when they contact you first.',
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    // Find or create ticket for this conversation
    let ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { creatorId: userId, recipientId: providerId },
          { creatorId: providerId, recipientId: userId },
        ],
        type: 'client_to_provider',
      },
    });

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          creatorId: userId,
          recipientId: providerId,
          subject: 'Provider Communication',
          type: 'client_to_provider',
          status: 'open',
          messages: [],
        },
      });
    }

    // Add message to ticket
    const messages = (ticket.messages as any[]) || [];
    messages.push({
      text: message,
      senderId: userId,
      senderName: user?.displayName || 'Customer',
      timestamp: new Date().toISOString(),
      aiVerified: true,
    });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { messages, status: 'open' },
    });

    // Create notification for provider
    await prisma.notification.create({
      data: {
        userId: providerId,
        title: 'New Message from Customer',
        message: `${user?.displayName || 'A customer'} sent you a message`,
        type: 'request',
        link: `/chat/provider/${userId}`,
      },
    });

    res.status(201).json({
      success: true,
      ticket: updated,
      aiVerified: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
