/**
 * Create questionnaire for Chilean Privacy Law (Ley 21.719)
 * Based on the 8 fundamental principles and key compliance obligations
 */

const { connectDBLocal } = require('../lib/mongodb-local.js');
const Question = require('../models/Question').default;
// Use dynamic import for TypeScript models

// Try to load Requirement model, but fallback to DORARequirement if not available
let Requirement;
try {
  Requirement = require('../models/Requirement').default;
} catch (e) {
  Requirement = null;
}

const RegulationType = {
  DORA: 'DORA',
  CHILEAN_PRIVACY: 'CHILEAN_PRIVACY',
};

// Questionnaire structure based on Chilean Privacy Law pillars
const questionnaireStructure = [
  {
    pillar: 'LAWFULNESS_FAIRNESS',
    title: 'Licitud y Lealtad (Lawfulness & Fairness)',
    titleEs: 'Licitud y Lealtad',
    questions: [
      {
        questionId: 'Q-PRIV-LF-001',
        text: '¿Tiene una base legal documentada para el tratamiento de datos personales?',
        textEn: 'Do you have a documented legal basis for processing personal data?',
        order: 1,
        requirementKeywords: ['base legal', 'legal basis', 'consentimiento', 'consent', 'contrato', 'contract'],
      },
      {
        questionId: 'Q-PRIV-LF-002',
        text: '¿Procesa datos personales de manera leal y transparente?',
        textEn: 'Do you process personal data in a fair and transparent manner?',
        order: 2,
        requirementKeywords: ['leal', 'fair', 'transparente', 'transparent'],
      },
      {
        questionId: 'Q-PRIV-LF-003',
        text: '¿Ha obtenido el consentimiento explícito cuando es requerido?',
        textEn: 'Have you obtained explicit consent when required?',
        order: 3,
        requirementKeywords: ['consentimiento', 'consent', 'explícito', 'explicit'],
      },
    ],
  },
  {
    pillar: 'PURPOSE_LIMITATION',
    title: 'Limitación de Finalidad (Purpose Limitation)',
    titleEs: 'Limitación de Finalidad',
    questions: [
      {
        questionId: 'Q-PRIV-PL-001',
        text: '¿Ha definido claramente los fines para los cuales recopila datos personales?',
        textEn: 'Have you clearly defined the purposes for which you collect personal data?',
        order: 1,
        requirementKeywords: ['finalidad', 'purpose', 'fines', 'objetivo'],
      },
      {
        questionId: 'Q-PRIV-PL-002',
        text: '¿Limita el uso de datos personales a los fines especificados?',
        textEn: 'Do you limit the use of personal data to the specified purposes?',
        order: 2,
        requirementKeywords: ['limitación', 'limitation', 'uso', 'use'],
      },
      {
        questionId: 'Q-PRIV-PL-003',
        text: '¿Tiene procesos para evaluar cambios en la finalidad del tratamiento?',
        textEn: 'Do you have processes to evaluate changes in the purpose of processing?',
        order: 3,
        requirementKeywords: ['cambio', 'change', 'evaluación', 'evaluation'],
      },
    ],
  },
  {
    pillar: 'DATA_MINIMIZATION',
    title: 'Minimización de Datos (Data Minimization)',
    titleEs: 'Minimización de Datos',
    questions: [
      {
        questionId: 'Q-PRIV-DM-001',
        text: '¿Recopila solo los datos personales necesarios para cumplir con la finalidad?',
        textEn: 'Do you collect only the personal data necessary to fulfill the purpose?',
        order: 1,
        requirementKeywords: ['necesario', 'necessary', 'mínimo', 'minimum'],
      },
      {
        questionId: 'Q-PRIV-DM-002',
        text: '¿Revisa periódicamente los datos recopilados para eliminar los innecesarios?',
        textEn: 'Do you periodically review collected data to remove unnecessary data?',
        order: 2,
        requirementKeywords: ['revisión', 'review', 'eliminar', 'remove'],
      },
    ],
  },
  {
    pillar: 'PROPORTIONALITY',
    title: 'Proporcionalidad (Proportionality)',
    titleEs: 'Proporcionalidad',
    questions: [
      {
        questionId: 'Q-PRIV-PR-001',
        text: '¿Evalúa la proporcionalidad del tratamiento en relación con la finalidad?',
        textEn: 'Do you evaluate the proportionality of processing in relation to the purpose?',
        order: 1,
        requirementKeywords: ['proporcionalidad', 'proportionality', 'evaluación', 'evaluation'],
      },
    ],
  },
  {
    pillar: 'QUALITY',
    title: 'Calidad (Quality)',
    titleEs: 'Calidad',
    questions: [
      {
        questionId: 'Q-PRIV-Q-001',
        text: '¿Mantiene los datos personales exactos y actualizados?',
        textEn: 'Do you keep personal data accurate and up to date?',
        order: 1,
        requirementKeywords: ['exacto', 'accurate', 'actualizado', 'updated'],
      },
      {
        questionId: 'Q-PRIV-Q-002',
        text: '¿Tiene procesos para corregir datos inexactos?',
        textEn: 'Do you have processes to correct inaccurate data?',
        order: 2,
        requirementKeywords: ['corregir', 'correct', 'inexacto', 'inaccurate'],
      },
    ],
  },
  {
    pillar: 'ACCOUNTABILITY',
    title: 'Responsabilidad (Accountability)',
    titleEs: 'Responsabilidad',
    questions: [
      {
        questionId: 'Q-PRIV-A-001',
        text: '¿Ha designado un Responsable de Protección de Datos (RPD) o DPO?',
        textEn: 'Have you designated a Data Protection Officer (DPO) or RPD?',
        order: 1,
        requirementKeywords: ['responsable', 'DPO', 'RPD', 'designado', 'designated'],
      },
      {
        questionId: 'Q-PRIV-A-002',
        text: '¿Mantiene registros de las actividades de tratamiento?',
        textEn: 'Do you maintain records of processing activities?',
        order: 2,
        requirementKeywords: ['registro', 'record', 'actividades', 'activities'],
      },
      {
        questionId: 'Q-PRIV-A-003',
        text: '¿Tiene documentación que demuestre el cumplimiento?',
        textEn: 'Do you have documentation demonstrating compliance?',
        order: 3,
        requirementKeywords: ['documentación', 'documentation', 'cumplimiento', 'compliance'],
      },
      {
        questionId: 'Q-PRIV-A-004',
        text: '¿Realiza evaluaciones de impacto de protección de datos (EIPD)?',
        textEn: 'Do you conduct Data Protection Impact Assessments (DPIA)?',
        order: 4,
        requirementKeywords: ['evaluación', 'impacto', 'EIPD', 'DPIA'],
      },
    ],
  },
  {
    pillar: 'SECURITY',
    title: 'Seguridad (Security)',
    titleEs: 'Seguridad',
    questions: [
      {
        questionId: 'Q-PRIV-S-001',
        text: '¿Implementa medidas técnicas y organizativas apropiadas para proteger datos personales?',
        textEn: 'Do you implement appropriate technical and organizational measures to protect personal data?',
        order: 1,
        requirementKeywords: ['medidas técnicas', 'technical measures', 'medidas organizativas', 'organizational measures'],
      },
      {
        questionId: 'Q-PRIV-S-002',
        text: '¿Tiene un plan de respuesta a incidentes de seguridad?',
        textEn: 'Do you have a security incident response plan?',
        order: 2,
        requirementKeywords: ['incidente', 'incident', 'respuesta', 'response'],
      },
      {
        questionId: 'Q-PRIV-S-003',
        text: '¿Notifica violaciones de datos a la autoridad en 72 horas?',
        textEn: 'Do you notify data breaches to the authority within 72 hours?',
        order: 3,
        requirementKeywords: ['violación', 'breach', 'notificación', 'notification', '72 horas', '72 hours'],
      },
      {
        questionId: 'Q-PRIV-S-004',
        text: '¿Realiza evaluaciones de seguridad periódicas?',
        textEn: 'Do you conduct periodic security assessments?',
        order: 4,
        requirementKeywords: ['evaluación', 'assessment', 'seguridad', 'security'],
      },
    ],
  },
  {
    pillar: 'TRANSPARENCY_CONFIDENTIALITY',
    title: 'Transparencia y Confidencialidad',
    titleEs: 'Transparencia y Confidencialidad',
    questions: [
      {
        questionId: 'Q-PRIV-TC-001',
        text: '¿Proporciona información clara sobre el tratamiento de datos a los titulares?',
        textEn: 'Do you provide clear information about data processing to data subjects?',
        order: 1,
        requirementKeywords: ['información', 'information', 'transparencia', 'transparency'],
      },
      {
        questionId: 'Q-PRIV-TC-002',
        text: '¿Respeta los derechos de acceso, rectificación, supresión y portabilidad?',
        textEn: 'Do you respect rights of access, rectification, erasure, and portability?',
        order: 2,
        requirementKeywords: ['derechos', 'rights', 'acceso', 'access', 'rectificación', 'rectification'],
      },
      {
        questionId: 'Q-PRIV-TC-003',
        text: '¿Responde a solicitudes de titulares dentro de 15 días hábiles?',
        textEn: 'Do you respond to data subject requests within 15 business days?',
        order: 3,
        requirementKeywords: ['solicitud', 'request', '15 días', '15 days'],
      },
      {
        questionId: 'Q-PRIV-TC-004',
        text: '¿Mantiene la confidencialidad de los datos personales?',
        textEn: 'Do you maintain confidentiality of personal data?',
        order: 4,
        requirementKeywords: ['confidencialidad', 'confidentiality', 'secreto', 'secret'],
      },
    ],
  },
];

async function createChileanPrivacyQuestionnaire() {
  try {
    await connectDBLocal();
    
    // Models are already loaded via require at the top
    
    await connectDBLocal();
    
    console.log('🚀 Creating Chilean Privacy Law questionnaire...\n');

    // Get all requirements for Chilean Privacy Law
    // Note: This will need to be updated once Requirement model is fully integrated
    // For now, we'll create questions without requirement mapping
    const allRequirements = []; // await Requirement.find({ regulationType: RegulationType.CHILEAN_PRIVACY });
    console.log(`Found ${allRequirements.length} requirements to map\n`);

    const createdQuestions = [];
    const errors = [];

    for (const pillarGroup of questionnaireStructure) {
      console.log(`📋 Creating questions for ${pillarGroup.title}...`);

      for (const questionData of pillarGroup.questions) {
        try {
          // Find related requirements based on keywords
          const relatedRequirements = allRequirements.filter(req => {
            const text = `${req.description || ''} ${req.title || ''} ${req.legalText || ''}`.toLowerCase();
            return questionData.requirementKeywords.some(keyword => 
              text.includes(keyword.toLowerCase())
            ) && req.pillar === pillarGroup.pillar;
          });

          // Try to create - if it fails due to duplicate, skip
          // The model will handle uniqueness constraint

          let question;
          try {
            question = await Question.create({
            questionId: questionData.questionId,
            text: questionData.text, // Spanish by default
            type: 'YES_NO',
            pillar: pillarGroup.pillar,
            order: questionData.order,
            isRequired: true,
            options: [
              { value: 'yes', label: 'Sí' },
              { value: 'no', label: 'No' },
              { value: 'not_applicable', label: 'No Aplica' },
            ],
          });
          } catch (createError) {
            // If question already exists, skip it
            if (createError.message && (createError.message.includes('duplicate') || createError.message.includes('E11000'))) {
              console.log(`⏭️  Question ${questionData.questionId} already exists, skipping...`);
              continue;
            }
            throw createError;
          }

          createdQuestions.push({
            questionId: question.questionId,
            text: question.text,
            pillar: pillarGroup.pillar,
            mappedRequirements: relatedRequirements.length,
          });

          console.log(`   ✅ Created ${questionData.questionId}: ${questionData.text.substring(0, 60)}...`);
        } catch (error) {
          errors.push({
            questionId: questionData.questionId,
            error: error.message,
          });
          console.error(`   ❌ Error creating ${questionData.questionId}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Created ${createdQuestions.length} questions`);
    console.log(`❌ Errors: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.questionId}: ${e.error}`));
    }

    console.log('\n📊 Summary by pillar:');
    const pillarCounts = createdQuestions.reduce((acc, q) => {
      acc[q.pillar] = (acc[q.pillar] || 0) + 1;
      return acc;
    }, {});
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`   ${pillar}: ${count} questions`);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createChileanPrivacyQuestionnaire()
    .then(() => {
      console.log('\n✅ Questionnaire creation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createChileanPrivacyQuestionnaire };
