/**
 * Model Operations Abstraction Layer
 */

import { connectDBLocal } from './mongodb-local';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import Question from '@/models/Question';
import { RegulationType } from './regulations';

let Requirement: any = null;
try {
  Requirement = require('@/models/Requirement').default;
} catch (e) {}

export class RequirementOperations {
  static async findByRegulation(regulationType: string, query: any = {}) {
    await connectDBLocal();
    const regType = regulationType === 'CHILEAN_PRIVACY' || regulationType === RegulationType.CHILEAN_PRIVACY 
      ? RegulationType.CHILEAN_PRIVACY 
      : regulationType;
    
    if (regType === RegulationType.CHILEAN_PRIVACY) {
      if (Requirement) {
        try {
          const results = await Requirement.find({ regulationType: RegulationType.CHILEAN_PRIVACY, ...query });
          if (results && results.length > 0) {
            console.log(`[RequirementOperations] Found ${results.length} requirements using Requirement model`);
            return results;
          }
        } catch (error: any) {
          console.warn('[RequirementOperations] Requirement model query failed, falling back to DORARequirement:', error.message);
        }
      }
      // For local storage compatibility, get all and filter
      // IMPORTANT: Don't pass query to find() when using local storage, filter manually
      const allReqs = await DORARequirement.find({});
      console.log(`[RequirementOperations] Total requirements in DORARequirement: ${allReqs.length}`);
      const filtered = allReqs.filter((req: any) => {
        // Must start with CHILE-
        if (!req.requirementId?.startsWith('CHILE-')) {
          return false;
        }
        // Apply query filters manually
        for (const [key, value] of Object.entries(query)) {
          if (key === 'requirementId') continue; // Already filtered by prefix
          if (req[key] !== value) {
            return false;
          }
        }
        return true;
      });
      console.log(`[RequirementOperations] Filtered Chilean Privacy requirements: ${filtered.length}`);
      return filtered;
    }
    return await DORARequirement.find(query);
  }
  
  static async findOne(regulationType: string, query: any) {
    await connectDBLocal();
    if (regulationType === 'CHILEAN_PRIVACY') {
      if (Requirement) {
        const result = await Requirement.findOne({ regulationType: 'CHILEAN_PRIVACY', ...query });
        if (result) return result;
      }
      const allReqs = await DORARequirement.find({});
      return allReqs.find((req: any) => {
        if (!req.requirementId?.startsWith('CHILE-')) return false;
        for (const [key, value] of Object.entries(query)) {
          if (req[key] !== value) return false;
        }
        return true;
      });
    }
    return await DORARequirement.findOne(query);
  }
  
  static async upsert(regulationType: string, requirementData: any) {
    await connectDBLocal();
    
    if (regulationType === 'CHILEAN_PRIVACY') {
      const chileRequirementId = requirementData.requirementId?.startsWith('CHILE-')
        ? requirementData.requirementId
        : `CHILE-${requirementData.requirementId}`;
      
      if (Requirement) {
        return await Requirement.findOneAndUpdate(
          { 
            regulationType: 'CHILEAN_PRIVACY',
            requirementId: chileRequirementId,
          },
          {
            ...requirementData,
            requirementId: chileRequirementId,
            regulationType: 'CHILEAN_PRIVACY',
          },
          { upsert: true, new: true }
        );
      }
      
      // Fallback to DORARequirement for local storage
      return await DORARequirement.findOneAndUpdate(
        { requirementId: chileRequirementId },
        {
          ...requirementData,
          requirementId: chileRequirementId,
        },
        { upsert: true, new: true }
      );
    } else {
      return await DORARequirement.findOneAndUpdate(
        { requirementId: requirementData.requirementId },
        requirementData,
        { upsert: true, new: true }
      );
    }
  }
}

export class ControlOperations {
  static async find(query: any = {}) {
    await connectDBLocal();
    return await Control.find(query);
  }
  static async findOne(query: any) {
    await connectDBLocal();
    return await Control.findOne(query);
  }
  static async create(controlData: any) {
    await connectDBLocal();
    return await Control.create(controlData);
  }
  static async findOneAndUpdate(query: any, update: any, options: any = {}) {
    await connectDBLocal();
    return await Control.findOneAndUpdate(query, update, { ...options, new: true });
  }
}
