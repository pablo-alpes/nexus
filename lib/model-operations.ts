/**
 * Model Operations Abstraction Layer
 */

import { connectDBLocal, isLocalStorage } from './mongodb-local';
import { LocalModel } from '@/models/LocalModel';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import { getControlModel } from '@/models/Control';
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
    
    // Use regulation-scoped local storage (separate files per regulation)
    if (isLocalStorage()) {
      const model = regType === RegulationType.CHILEAN_PRIVACY
        ? new LocalModel('Requirement', RegulationType.CHILEAN_PRIVACY)
        : new LocalModel('DORARequirement', RegulationType.DORA);
      const results = await model.find(query);
      console.log(`[RequirementOperations] Found ${results.length} requirements (local, ${regType})`);
      return results;
    }
    
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
      const allReqs = await DORARequirement.find({});
      const filtered = allReqs.filter((req: any) => {
        if (!req.requirementId?.startsWith('CHILE-')) return false;
        for (const [key, value] of Object.entries(query)) {
          if (key === 'requirementId') continue;
          if (req[key] !== value) return false;
        }
        return true;
      });
      return filtered;
    }
    return await DORARequirement.find(query);
  }
  
  static async findOne(regulationType: string, query: any) {
    await connectDBLocal();
    if (isLocalStorage()) {
      const model = regulationType === 'CHILEAN_PRIVACY' || regulationType === RegulationType.CHILEAN_PRIVACY
        ? new LocalModel('Requirement', RegulationType.CHILEAN_PRIVACY)
        : new LocalModel('DORARequirement', RegulationType.DORA);
      return await model.findOne(query);
    }
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
      }) || null;
    }
    return await DORARequirement.findOne(query);
  }
  
  static async upsert(regulationType: string, requirementData: any) {
    await connectDBLocal();
    const isChilean = regulationType === 'CHILEAN_PRIVACY' || regulationType === RegulationType.CHILEAN_PRIVACY;
    const chileRequirementId = requirementData.requirementId?.startsWith('CHILE-')
      ? requirementData.requirementId
      : `CHILE-${requirementData.requirementId}`;
    
    if (isLocalStorage()) {
      const model = isChilean
        ? new LocalModel('Requirement', RegulationType.CHILEAN_PRIVACY)
        : new LocalModel('DORARequirement', RegulationType.DORA);
      const filter = isChilean ? { requirementId: chileRequirementId } : { requirementId: requirementData.requirementId };
      const payload = isChilean ? { ...requirementData, requirementId: chileRequirementId } : requirementData;
      return await model.findOneAndUpdate(filter, payload, { upsert: true, new: true });
    }
    
    if (isChilean) {
      if (Requirement) {
        return await Requirement.findOneAndUpdate(
          { regulationType: 'CHILEAN_PRIVACY', requirementId: chileRequirementId },
          { ...requirementData, requirementId: chileRequirementId, regulationType: 'CHILEAN_PRIVACY' },
          { upsert: true, new: true }
        );
      }
      return await DORARequirement.findOneAndUpdate(
        { requirementId: chileRequirementId },
        { ...requirementData, requirementId: chileRequirementId },
        { upsert: true, new: true }
      );
    }
    return await DORARequirement.findOneAndUpdate(
      { requirementId: requirementData.requirementId },
      requirementData,
      { upsert: true, new: true }
    );
  }
}

export class ControlOperations {
  static async find(query: any = {}, regulation?: string) {
    await connectDBLocal();
    const model = regulation && isLocalStorage() ? getControlModel(regulation) : Control;
    return await model.find(query);
  }
  static async findOne(query: any, regulation?: string) {
    await connectDBLocal();
    const model = regulation && isLocalStorage() ? getControlModel(regulation) : Control;
    return await model.findOne(query);
  }
  static async create(controlData: any, regulation?: string) {
    await connectDBLocal();
    const model = regulation && isLocalStorage() ? getControlModel(regulation) : Control;
    return await model.create(controlData);
  }
  static async findOneAndUpdate(query: any, update: any, options: any = {}, regulation?: string) {
    await connectDBLocal();
    const model = regulation && isLocalStorage() ? getControlModel(regulation) : Control;
    return await model.findOneAndUpdate(query, update, { ...options, new: true });
  }
}
