/**
 * Regulation Configuration System
 * Allows the system to support multiple regulations with the same core logic
 */

export enum RegulationType {
  DORA = 'DORA',
  CHILEAN_PRIVACY = 'CHILEAN_PRIVACY', // Ley 21.719
  CHILEAN_PRIVACY_19628 = 'CHILEAN_PRIVACY_19628', // Ley 19.628 (1999)
}

export interface RegulationPillar {
  id: string;
  name: string;
  nameEs?: string; // Spanish name
  description: string;
  descriptionEs?: string; // Spanish description
}

export interface RegulationConfig {
  type: RegulationType;
  name: string;
  nameEs?: string;
  description: string;
  descriptionEs?: string;
  pillars: RegulationPillar[];
  requirementPrefix: string; // e.g., "DORA-REQ", "CHILE-REQ"
  questionPrefix: string; // e.g., "Q-ICT", "Q-PRIV"
  effectiveDate?: string;
  authority?: string;
  authorityEs?: string;
}

// DORA Configuration
export const DORA_CONFIG: RegulationConfig = {
  type: RegulationType.DORA,
  name: 'Digital Operational Resilience Act',
  description: 'EU regulation for financial sector ICT risk management',
  pillars: [
    {
      id: 'ICT_RISK_MANAGEMENT',
      name: 'ICT Risk Management',
      description: 'Framework for managing ICT risks',
    },
    {
      id: 'INCIDENT_MANAGEMENT',
      name: 'ICT-Related Incident Management',
      description: 'Processes for detecting, managing and reporting ICT incidents',
    },
    {
      id: 'RESILIENCE_TESTING',
      name: 'Digital Operational Resilience Testing',
      description: 'Testing programs for ICT systems',
    },
    {
      id: 'THIRD_PARTY_RISK',
      name: 'ICT Third-Party Risk',
      description: 'Management of risks from third-party ICT service providers',
    },
    {
      id: 'INFORMATION_SHARING',
      name: 'Information Sharing Arrangements',
      description: 'Sharing of cyber threat information',
    },
  ],
  requirementPrefix: 'DORA-REQ',
  questionPrefix: 'Q-',
  effectiveDate: '2025-01-17',
  authority: 'European Banking Authority',
};

// Chilean Privacy Law Configuration (Ley 21.719)
export const CHILEAN_PRIVACY_CONFIG: RegulationConfig = {
  type: RegulationType.CHILEAN_PRIVACY,
  name: 'Ley de Protección de Datos Personales',
  nameEs: 'Ley de Protección de Datos Personales',
  description: 'Chilean Personal Data Protection Law (Ley 21.719)',
  descriptionEs: 'Ley de Protección de Datos Personales de Chile (Ley 21.719)',
  pillars: [
    {
      id: 'LAWFULNESS_FAIRNESS',
      name: 'Lawfulness & Fairness',
      nameEs: 'Licitud y Lealtad',
      description: 'Processing must be lawful and fair',
      descriptionEs: 'El tratamiento debe ser lícito y leal',
    },
    {
      id: 'PURPOSE_LIMITATION',
      name: 'Purpose Limitation',
      nameEs: 'Limitación de Finalidad',
      description: 'Data collected for specified, explicit and legitimate purposes',
      descriptionEs: 'Datos recopilados para fines específicos, explícitos y legítimos',
    },
    {
      id: 'DATA_MINIMIZATION',
      name: 'Data Minimization',
      nameEs: 'Minimización de Datos',
      description: 'Adequate, relevant and limited to what is necessary',
      descriptionEs: 'Adecuados, pertinentes y limitados a lo necesario',
    },
    {
      id: 'PROPORTIONALITY',
      name: 'Proportionality',
      nameEs: 'Proporcionalidad',
      description: 'Proportional processing in relation to the purpose',
      descriptionEs: 'Tratamiento proporcional en relación con la finalidad',
    },
    {
      id: 'QUALITY',
      name: 'Quality',
      nameEs: 'Calidad',
      description: 'Accurate and kept up to date',
      descriptionEs: 'Exactos y mantenidos actualizados',
    },
    {
      id: 'ACCOUNTABILITY',
      name: 'Accountability',
      nameEs: 'Responsabilidad',
      description: 'Controller responsible for compliance',
      descriptionEs: 'Responsable del tratamiento responsable del cumplimiento',
    },
    {
      id: 'SECURITY',
      name: 'Security',
      nameEs: 'Seguridad',
      description: 'Appropriate technical and organizational measures',
      descriptionEs: 'Medidas técnicas y organizativas apropiadas',
    },
    {
      id: 'TRANSPARENCY_CONFIDENTIALITY',
      name: 'Transparency & Confidentiality',
      nameEs: 'Transparencia y Confidencialidad',
      description: 'Transparent processing and confidentiality obligations',
      descriptionEs: 'Tratamiento transparente y obligaciones de confidencialidad',
    },
  ],
  requirementPrefix: 'CHILE-REQ',
  questionPrefix: 'Q-PRIV',
  effectiveDate: '2026-12-01',
  authority: 'Agencia de Protección de Datos Personales',
  authorityEs: 'Agencia de Protección de Datos Personales (APDP)',
};

// Chilean Privacy Law Configuration (Ley 19.628 - 1999)
export const CHILEAN_PRIVACY_19628_CONFIG: RegulationConfig = {
  type: RegulationType.CHILEAN_PRIVACY_19628,
  name: 'Ley sobre Protección de la Vida Privada',
  nameEs: 'Ley sobre Protección de la Vida Privada',
  description: 'Chilean Privacy Law (Ley 19.628) - Original data protection law',
  descriptionEs: 'Ley sobre Protección de la Vida Privada de Chile (Ley 19.628) - Ley original de protección de datos',
  pillars: [
    {
      id: 'PRIVACY_RIGHTS',
      name: 'Privacy Rights',
      nameEs: 'Derechos de Privacidad',
      description: 'Fundamental privacy rights and protections',
      descriptionEs: 'Derechos fundamentales de privacidad y protecciones',
    },
    {
      id: 'DATA_COLLECTION',
      name: 'Data Collection',
      nameEs: 'Recopilación de Datos',
      description: 'Rules for collecting personal data',
      descriptionEs: 'Normas para la recopilación de datos personales',
    },
    {
      id: 'DATA_STORAGE',
      name: 'Data Storage',
      nameEs: 'Almacenamiento de Datos',
      description: 'Requirements for storing personal data',
      descriptionEs: 'Requisitos para el almacenamiento de datos personales',
    },
    {
      id: 'DATA_SECURITY',
      name: 'Data Security',
      nameEs: 'Seguridad de Datos',
      description: 'Security measures for personal data',
      descriptionEs: 'Medidas de seguridad para datos personales',
    },
    {
      id: 'DATA_ACCESS',
      name: 'Data Access Rights',
      nameEs: 'Derechos de Acceso a Datos',
      description: 'Rights to access and correct personal data',
      descriptionEs: 'Derechos de acceso y corrección de datos personales',
    },
  ],
  requirementPrefix: 'CHILE-19628-REQ',
  questionPrefix: 'Q-PRIV-19628',
  effectiveDate: '1999-08-28',
  authority: 'Ministerio de Justicia',
  authorityEs: 'Ministerio de Justicia',
};

// Registry of all regulations
export const REGULATION_REGISTRY: Record<RegulationType, RegulationConfig> = {
  [RegulationType.DORA]: DORA_CONFIG,
  [RegulationType.CHILEAN_PRIVACY]: CHILEAN_PRIVACY_CONFIG,
  [RegulationType.CHILEAN_PRIVACY_19628]: CHILEAN_PRIVACY_19628_CONFIG,
};

/**
 * Get regulation configuration by type
 */
export function getRegulationConfig(type: RegulationType): RegulationConfig {
  return REGULATION_REGISTRY[type];
}

/**
 * Get all available regulations
 */
export function getAllRegulations(): RegulationConfig[] {
  return Object.values(REGULATION_REGISTRY);
}

/**
 * Get pillar configuration for a regulation
 */
export function getPillarConfig(regulationType: RegulationType, pillarId: string): RegulationPillar | undefined {
  const config = getRegulationConfig(regulationType);
  return config.pillars.find(p => p.id === pillarId);
}

/**
 * Get all pillars for a regulation
 */
export function getPillars(regulationType: RegulationType): RegulationPillar[] {
  const config = getRegulationConfig(regulationType);
  return config.pillars;
}
