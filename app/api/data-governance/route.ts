import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DataGovernance from '@/models/DataGovernance';
import { RegulationType } from '@/lib/regulations';

function generateGovernanceId(regulationType: RegulationType): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'GOV-CHILE' : 'GOV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType: RegulationType = (searchParams.get('regulation') as RegulationType) || RegulationType.CHILEAN_PRIVACY;
    const status = searchParams.get('status');
    const dataOwnerEmail = searchParams.get('dataOwnerEmail');
    const dataStewardEmail = searchParams.get('dataStewardEmail');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (dataOwnerEmail) query['dataOwner.email'] = dataOwnerEmail;
    if (dataStewardEmail) query['dataSteward.email'] = dataStewardEmail;

    const governanceRecords = await DataGovernance.find(query);
    // Sort manually since LocalStorage doesn't support Mongoose-style sort
    governanceRecords.sort((a: any, b: any) => {
      const aProcess = a.businessProcess || '';
      const bProcess = b.businessProcess || '';
      return aProcess.localeCompare(bProcess);
    });
    return NextResponse.json({ governanceRecords });
  } catch (error: any) {
    console.error('Failed to fetch data governance records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { regulationType, ...governanceData } = body;

    if (!governanceData.businessProcess || !governanceData.dataOwner || !governanceData.dataSteward || !governanceData.dataCustodian || !governanceData.conceptualDataTypes || !governanceData.keySystems || !regulationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newGovernance = await DataGovernance.create({
      governanceId: generateGovernanceId(regulationType),
      ...governanceData,
      regulationType,
      status: governanceData.status || 'ACTIVE',
    });

    return NextResponse.json({ governance: newGovernance }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create data governance record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { _id, regulationType, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Governance ID is required' }, { status: 400 });
    }

    const updatedGovernance = await DataGovernance.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedGovernance) {
      return NextResponse.json({ error: 'Data governance record not found' }, { status: 404 });
    }

    return NextResponse.json({ governance: updatedGovernance });
  } catch (error: any) {
    console.error('Failed to update data governance record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
