/**
 * Local model adapter that mimics Mongoose models but uses file storage
 */

import { LocalStorage, useLocalStorage, getStorage } from '@/lib/local-storage';

export class LocalModel<T> {
  private storage: LocalStorage;
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.storage = getStorage(modelName);
  }

  async find(query: any = {}, sort?: any): Promise<T[]> {
    return this.storage.find(query, sort) as T[];
  }

  async findOne(query: any): Promise<T | null> {
    return this.storage.findOne(query);
  }

  async findById(id: string): Promise<T | null> {
    return this.storage.findById(id);
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}): Promise<T | null> {
    return this.storage.findOneAndUpdate(query, update, options);
  }

  async create(item: Partial<T>): Promise<T> {
    const result = await this.storage.create(item);
    return result as T;
  }
  
  async save(): Promise<T> {
    // For compatibility with Mongoose-style save
    return this as any;
  }

  async deleteOne(query: any): Promise<void> {
    return this.storage.deleteOne(query);
  }

  async countDocuments(query: any = {}): Promise<number> {
    return this.storage.countDocuments(query);
  }

  async bulkWrite(operations: any[]): Promise<void> {
    return this.storage.bulkWrite(operations);
  }
}

// Factory function to get model (MongoDB or Local)
export function getModel<T>(modelName: string, mongooseModel: any): LocalModel<T> | any {
  if (useLocalStorage()) {
    return new LocalModel<T>(modelName);
  }
  return mongooseModel;
}

