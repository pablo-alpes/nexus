import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Notification from '@/models/Notification';
import { RegulationType } from '@/lib/regulations';

function generateNotificationId(regulationType: RegulationType): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'NOTIF-CHILE' : 'NOTIF';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType: RegulationType = (searchParams.get('regulation') as RegulationType) || RegulationType.CHILEAN_PRIVACY;
    const recipientEmail = searchParams.get('recipientEmail');
    const status = searchParams.get('status');
    const notificationType = searchParams.get('notificationType');
    const priority = searchParams.get('priority');
    const relatedEntityType = searchParams.get('relatedEntityType');
    const relatedEntityId = searchParams.get('relatedEntityId');

    const query: any = { regulationType };
    if (recipientEmail) query.recipientEmail = recipientEmail;
    if (status) query.status = status;
    if (notificationType) query.notificationType = notificationType;
    if (priority) query.priority = priority;
    if (relatedEntityType) query.relatedEntityType = relatedEntityType;
    if (relatedEntityId) query.relatedEntityId = relatedEntityId;

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { regulationType, ...notificationData } = body;

    if (!notificationData.recipientEmail || !notificationData.recipientName || !notificationData.recipientRole || !notificationData.notificationType || !notificationData.subject || !notificationData.message || !regulationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newNotification = await Notification.create({
      notificationId: generateNotificationId(regulationType),
      ...notificationData,
      regulationType,
      status: notificationData.status || 'PENDING',
      priority: notificationData.priority || 'MEDIUM',
    });

    return NextResponse.json({ notification: newNotification }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { _id, regulationType, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Handle status updates with timestamps
    if (updateData.status === 'SENT' && !updateData.sentDate) {
      updateData.sentDate = new Date();
    }
    if (updateData.status === 'READ' && !updateData.readDate) {
      updateData.readDate = new Date();
    }
    if (updateData.status === 'ACKNOWLEDGED' && !updateData.acknowledgedDate) {
      updateData.acknowledgedDate = new Date();
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification: updatedNotification });
  } catch (error: any) {
    console.error('Failed to update notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
