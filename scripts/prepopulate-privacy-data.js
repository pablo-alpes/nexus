/**
 * Pre-populate Privacy Compliance Data
 * Creates sample data for all privacy compliance modules
 */

const { connectDBLocal } = require('../lib/mongodb-local.js');

const RegulationType = {
  CHILEAN_PRIVACY: 'CHILEAN_PRIVACY',
};

async function prepopulateData() {
  try {
    await connectDBLocal();
    
    // Import models using dynamic import for TypeScript modules
    const DataSubjectRequestModule = await import('../models/DataSubjectRequest.js');
    const ConsentModule = await import('../models/Consent.js');
    const DataProcessingRegisterModule = await import('../models/DataProcessingRegister.js');
    const BreachNotificationModule = await import('../models/BreachNotification.js');
    const ThirdPartyProcessorModule = await import('../models/ThirdPartyProcessor.js');
    
    const DataSubjectRequest = DataSubjectRequestModule.default;
    const Consent = ConsentModule.default;
    const DataProcessingRegister = DataProcessingRegisterModule.default;
    const BreachNotification = BreachNotificationModule.default;
    const ThirdPartyProcessor = ThirdPartyProcessorModule.default;
    
    console.log('📦 Pre-populating privacy compliance data...');

    // 1. Data Processing Activities
    console.log('Creating processing activities...');
    const activities = [
      {
        activityId: 'DPR-CHILE-001',
        activityName: 'Customer Relationship Management',
        description: 'Processing of customer data for CRM purposes',
        purpose: 'Customer management and support',
        legalBasis: 'CONSENT',
        dataCategories: ['Name', 'Email', 'Phone', 'Address'],
        dataSubjectCategories: ['Customers'],
        retentionPeriod: '5 years',
        consentRequired: true,
        consentCount: 150,
        status: 'ACTIVE',
        regulationType: RegulationType.CHILEAN_PRIVACY,
        pillar: 'PURPOSE_LIMITATION',
      },
      {
        activityId: 'DPR-CHILE-002',
        activityName: 'Marketing Communications',
        description: 'Email marketing and promotional communications',
        purpose: 'Marketing and promotions',
        legalBasis: 'CONSENT',
        dataCategories: ['Name', 'Email', 'Behavioral Data'],
        dataSubjectCategories: ['Customers', 'Prospects'],
        retentionPeriod: 'Until consent withdrawal',
        consentRequired: true,
        consentCount: 89,
        status: 'ACTIVE',
        regulationType: RegulationType.CHILEAN_PRIVACY,
        pillar: 'PURPOSE_LIMITATION',
      },
      {
        activityId: 'DPR-CHILE-003',
        activityName: 'Employee Management',
        description: 'HR data processing for employee management',
        purpose: 'Human resources management',
        legalBasis: 'CONTRACT',
        dataCategories: ['Name', 'Email', 'ID Number', 'Financial Data', 'Health Data'],
        dataSubjectCategories: ['Employees'],
        retentionPeriod: '7 years after termination',
        consentRequired: false,
        consentCount: 0,
        status: 'ACTIVE',
        regulationType: RegulationType.CHILEAN_PRIVACY,
        pillar: 'ACCOUNTABILITY',
      },
    ];

    for (const activity of activities) {
      await DataProcessingRegister.findOneAndUpdate(
        { activityId: activity.activityId },
        activity,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${activities.length} processing activities`);

    // 2. Data Subject Requests
    console.log('Creating data subject requests...');
    const requests = [
      {
        requestId: 'DSR-CHILE-001',
        requestType: 'ACCESS',
        status: 'IN_PROGRESS',
        dataSubjectName: 'Juan Pérez',
        dataSubjectEmail: 'juan.perez@example.com',
        description: 'Request access to all personal data held by the company',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
      {
        requestId: 'DSR-CHILE-002',
        requestType: 'DELETION',
        status: 'PENDING',
        dataSubjectName: 'María González',
        dataSubjectEmail: 'maria.gonzalez@example.com',
        description: 'Request deletion of account and all associated data',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
      {
        requestId: 'DSR-CHILE-003',
        requestType: 'RECTIFICATION',
        status: 'COMPLETED',
        dataSubjectName: 'Carlos Rodríguez',
        dataSubjectEmail: 'carlos.rodriguez@example.com',
        description: 'Update incorrect address information',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
    ];

    for (const request of requests) {
      await DataSubjectRequest.findOneAndUpdate(
        { requestId: request.requestId },
        request,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${requests.length} data subject requests`);

    // 3. Consents
    console.log('Creating consents...');
    const consents = [
      {
        consentId: 'CONSENT-CHILE-001',
        dataSubjectEmail: 'juan.perez@example.com',
        dataSubjectName: 'Juan Pérez',
        processingActivityId: 'DPR-CHILE-001',
        consentType: 'EXPLICIT',
        consentStatus: 'GIVEN',
        consentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        privacyPolicyVersion: '1.2',
        consentMethod: 'WEB_FORM',
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
      {
        consentId: 'CONSENT-CHILE-002',
        dataSubjectEmail: 'maria.gonzalez@example.com',
        dataSubjectName: 'María González',
        processingActivityId: 'DPR-CHILE-002',
        consentType: 'EXPLICIT',
        consentStatus: 'WITHDRAWN',
        consentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        withdrawalDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        privacyPolicyVersion: '1.1',
        consentMethod: 'EMAIL',
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
    ];

    for (const consent of consents) {
      await Consent.findOneAndUpdate(
        { consentId: consent.consentId },
        consent,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${consents.length} consents`);

    // 4. Third Party Processors
    console.log('Creating third party processors...');
    const processors = [
      {
        processorId: 'TPP-CHILE-001',
        name: 'Amazon Web Services',
        companyName: 'Amazon Web Services, Inc.',
        contactEmail: 'dpo@amazon.com',
        country: 'United States',
        processorType: 'CLOUD_PROVIDER',
        servicesProvided: ['Cloud Storage', 'Compute Services', 'Database Hosting'],
        dataCategoriesProcessed: ['Name', 'Email', 'Financial Data'],
        processingPurposes: ['Data Storage', 'Application Hosting'],
        dataSubjectCategories: ['Customers', 'Employees'],
        contractSigned: true,
        contractDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        dpaSigned: true,
        dpaDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        sccSigned: true,
        sccDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        certifications: [
          { type: 'ISO 27001', certificationBody: 'BSI', issueDate: new Date('2023-01-01'), expiryDate: new Date('2026-01-01') },
          { type: 'SOC 2', certificationBody: 'AICPA', issueDate: new Date('2023-06-01') },
        ],
        complianceStatus: 'COMPLIANT',
        riskLevel: 'MEDIUM',
        transfersToThirdCountries: true,
        thirdCountries: ['United States'],
        transferSafeguards: [
          { type: 'SCC', description: 'Standard Contractual Clauses (Module 2)' },
        ],
        breachNotificationCapability: true,
        status: 'ACTIVE',
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
      {
        processorId: 'TPP-CHILE-002',
        name: 'Salesforce',
        companyName: 'Salesforce.com, Inc.',
        contactEmail: 'privacy@salesforce.com',
        country: 'United States',
        processorType: 'SaaS',
        servicesProvided: ['CRM Platform', 'Marketing Automation'],
        dataCategoriesProcessed: ['Name', 'Email', 'Phone', 'Behavioral Data'],
        processingPurposes: ['Customer Relationship Management'],
        dataSubjectCategories: ['Customers'],
        contractSigned: true,
        contractDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        dpaSigned: true,
        dpaDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        sccSigned: true,
        certifications: [
          { type: 'ISO 27001', certificationBody: 'BSI', issueDate: new Date('2023-03-01') },
        ],
        complianceStatus: 'COMPLIANT',
        riskLevel: 'LOW',
        transfersToThirdCountries: true,
        thirdCountries: ['United States'],
        transferSafeguards: [
          { type: 'SCC', description: 'Standard Contractual Clauses' },
        ],
        breachNotificationCapability: true,
        status: 'ACTIVE',
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
    ];

    for (const processor of processors) {
      await ThirdPartyProcessor.findOneAndUpdate(
        { processorId: processor.processorId },
        processor,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${processors.length} third party processors`);

    // 5. Breach Notifications
    console.log('Creating breach notifications...');
    const breachDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const deadline72h = new Date(breachDate);
    deadline72h.setHours(deadline72h.getHours() + 72);

    const breaches = [
      {
        breachId: 'BREACH-CHILE-001',
        incidentTitle: 'Unauthorized Access to Customer Database',
        incidentDescription: 'Detected unauthorized access attempt to customer database. Investigation ongoing.',
        breachDate: breachDate,
        discoveryDate: new Date(breachDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        breachType: 'CONFIDENTIALITY',
        breachCategory: 'MALICIOUS',
        affectedDataCategories: ['Name', 'Email', 'Phone'],
        affectedDataSubjects: 250,
        severity: 'HIGH',
        status: 'INVESTIGATING',
        authorityNotificationRequired: true,
        subjectNotificationRequired: true,
        workflowStages: [
          {
            stage: 'DETECTION',
            status: 'COMPLETED',
            completedDate: new Date(breachDate.getTime() + 2 * 60 * 60 * 1000),
            dueDate: new Date(breachDate.getTime() + 2 * 60 * 60 * 1000),
          },
          {
            stage: 'ASSESSMENT',
            status: 'IN_PROGRESS',
            assignedDate: new Date(breachDate.getTime() + 2 * 60 * 60 * 1000),
            dueDate: new Date(breachDate.getTime() + 4 * 60 * 60 * 1000),
            owner: 'Security Team',
          },
          {
            stage: 'CONTAINMENT',
            status: 'PENDING',
            dueDate: new Date(breachDate.getTime() + 6 * 60 * 60 * 1000),
          },
          {
            stage: 'AUTHORITY_NOTIFICATION',
            status: 'PENDING',
            dueDate: deadline72h,
          },
        ],
        currentStage: 'ASSESSMENT',
        processOwner: 'Security Team',
        containmentMeasures: ['Isolated affected systems', 'Changed access credentials'],
        regulationType: RegulationType.CHILEAN_PRIVACY,
      },
    ];

    for (const breach of breaches) {
      await BreachNotification.findOneAndUpdate(
        { breachId: breach.breachId },
        breach,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Created ${breaches.length} breach notifications`);

    console.log('✅ Pre-population completed successfully!');
  } catch (error) {
    console.error('❌ Error pre-populating data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  prepopulateData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { prepopulateData };
