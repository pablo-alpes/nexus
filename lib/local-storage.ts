/**
 * Local file-based storage for testing without MongoDB
 * Stores data in JSON files in the data directory
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.TEST_LOCAL_DB_PATH
  ? path.resolve(process.env.TEST_LOCAL_DB_PATH)
  : path.join(process.cwd(), 'data', 'local-db');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get collection file path (optionally scoped by regulation for separate DORA vs Chilean Privacy data)
function getCollectionPath(collectionName: string, regulation?: string): string {
  ensureDataDir();
  const fileName = regulation ? `${collectionName}_${regulation}.json` : `${collectionName}.json`;
  return path.join(DATA_DIR, fileName);
}

// Read collection from file (optionally scoped by regulation)
function readCollection<T>(collectionName: string, regulation?: string): T[] {
  const filePath = getCollectionPath(collectionName, regulation);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${collectionName}:`, error);
    return [];
  }
}

// Write collection to file (optionally scoped by regulation)
function writeCollection<T>(collectionName: string, data: T[], regulation?: string): void {
  const filePath = getCollectionPath(collectionName, regulation);
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Local storage adapter (optionally scoped by regulation for separate persistence per regulation)
export class LocalStorage {
  private collectionName: string;
  private regulation?: string;

  constructor(collectionName: string, regulation?: string) {
    this.collectionName = collectionName;
    this.regulation = regulation;
  }

  async find(query: any = {}, sort?: any): Promise<any[]> {
    let data = readCollection<any>(this.collectionName, this.regulation);
    
    // Handle top-level $or operator
    if (query.$or && Array.isArray(query.$or)) {
      const orResults = new Set<string>(); // Use string IDs to avoid duplicates
      const allData = readCollection<any>(this.collectionName, this.regulation);
      
      for (const orCondition of query.$or) {
        // Create a sub-query without $or
        const subQuery = { ...query };
        delete subQuery.$or;
        Object.assign(subQuery, orCondition);
        
        // Filter data with sub-query
        const filtered = allData.filter(item => {
          return this.matchesQuery(item, subQuery);
        });
        
        // Add to results (using _id as unique key)
        filtered.forEach(item => {
          const itemId = String(item._id || JSON.stringify(item));
          orResults.add(itemId);
        });
      }
      
      // Convert back to items
      const resultItems = Array.from(orResults).map(id => {
        return allData.find(item => String(item._id || JSON.stringify(item)) === id);
      }).filter(Boolean);
      
      // Apply sorting if needed
      if (sort) {
        return this.applySort(resultItems, sort);
      }
      return resultItems;
    }
    
    // Apply filters
    if (Object.keys(query).length > 0) {
      data = data.filter(item => {
        return this.matchesQuery(item, query);
      });
    }
    
    // Apply sorting
    if (sort) {
      data = this.applySort(data, sort);
    }
    
    return data;
  }

  // Helper method to check if an item matches a query
  private matchesQuery(item: any, query: any): boolean {
    for (const [key, value] of Object.entries(query)) {
      // Skip $or as it's handled at top level
      if (key === '$or') continue;
      
      // Handle MongoDB-style $in operator
      if (value && typeof value === 'object' && '$in' in value) {
        const itemValue = item[key];
        const inArray = value.$in || [];
        
        // If itemValue is an array (e.g., requirementIds), check if any element matches
        if (Array.isArray(itemValue)) {
          const matches = itemValue.some((itemVal: any) => {
            const itemValStr = String(itemVal);
            return inArray.some((v: any) => {
              const vStr = String(v);
              return itemValStr === vStr || itemVal === v;
            });
          });
          if (!matches) return false;
        } else {
          // If itemValue is not an array, check direct match
          const itemValueStr = itemValue ? itemValue.toString() : '';
          const matches = inArray.some((v: any) => {
            const vStr = v ? v.toString() : '';
            return itemValueStr === vStr || itemValue === v;
          });
          if (!matches) return false;
        }
      }
      // Handle userId comparison (can be string or ObjectId-like)
      else if (key === 'userId' && typeof value === 'object' && value.toString) {
        if (item[key] !== value.toString()) {
          return false;
        }
      }
      // Handle direct equality
      else if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Helper method to apply sorting
  private applySort(data: any[], sort: any): any[] {
    const sortKeys = Object.keys(sort);
    return data.sort((a, b) => {
      for (const key of sortKeys) {
        const order = sort[key] === 1 ? 1 : -1;
        let aVal = a[key];
        let bVal = b[key];
        
        // Handle dates and timestamps
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        if (typeof aVal === 'string' && (aVal.match(/^\d{4}-\d{2}-\d{2}/) || aVal.includes('T'))) {
          const dateVal = new Date(aVal).getTime();
          aVal = isNaN(dateVal) ? 0 : dateVal;
        }
        if (typeof bVal === 'string' && (bVal.match(/^\d{4}-\d{2}-\d{2}/) || bVal.includes('T'))) {
          const dateVal = new Date(bVal).getTime();
          bVal = isNaN(dateVal) ? 0 : dateVal;
        }
        
        // Handle null/undefined
        if (aVal == null) aVal = 0;
        if (bVal == null) bVal = 0;
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
      }
      return 0;
    });
  }

  async findOne(query: any): Promise<any | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  async findById(id: string): Promise<any | null> {
    return this.findOne({ _id: id });
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}): Promise<any> {
    const data = readCollection<any>(this.collectionName, this.regulation);
    const index = data.findIndex(item => {
      for (const [key, value] of Object.entries(query)) {
        // Handle userId comparison (can be string or ObjectId-like)
        if (key === 'userId' && typeof value === 'object' && value.toString) {
          if (item[key] !== value.toString()) {
            return false;
          }
        } else if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });

    if (index >= 0) {
      // Update existing - convert any ObjectId-like values to strings
      const updatedItem: any = { 
        ...data[index], 
        ...update,
        updatedAt: new Date().toISOString(),
      };
      
      // Convert userId to string if needed
      if (updatedItem.userId && typeof updatedItem.userId === 'object' && updatedItem.userId.toString) {
        updatedItem.userId = updatedItem.userId.toString();
      }
      
      // Convert any controlId in gaps array to strings
      if (updatedItem.gaps && Array.isArray(updatedItem.gaps)) {
        updatedItem.gaps = updatedItem.gaps.map((gap: any) => ({
          ...gap,
          controlId: gap.controlId ? String(gap.controlId) : gap.controlId,
        }));
      }
      
      // Convert any controlId in actions array to strings (for RemediationPlan)
      if (updatedItem.actions && Array.isArray(updatedItem.actions)) {
        updatedItem.actions = updatedItem.actions.map((action: any) => ({
          ...action,
          controlId: action.controlId ? String(action.controlId) : action.controlId,
          evidenceIds: action.evidenceIds ? action.evidenceIds.map((id: any) => String(id)) : [],
        }));
      }
      
      data[index] = updatedItem;
      writeCollection(this.collectionName, data, this.regulation);
      return options.new ? data[index] : data[index];
    } else if (options.upsert) {
      // Create new
      const newItem: any = {
        _id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...query,
        ...update,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Ensure userId is stored as string
      if (newItem.userId && typeof newItem.userId === 'object' && newItem.userId.toString) {
        newItem.userId = newItem.userId.toString();
      }
      
      // Ensure controlId in gaps array is stored as string
      if (newItem.gaps && Array.isArray(newItem.gaps)) {
        newItem.gaps = newItem.gaps.map((gap: any) => ({
          ...gap,
          controlId: gap.controlId ? String(gap.controlId) : gap.controlId,
        }));
      }
      
      // Ensure controlId in actions array is stored as string (for RemediationPlan)
      if (newItem.actions && Array.isArray(newItem.actions)) {
        newItem.actions = newItem.actions.map((action: any) => ({
          ...action,
          controlId: action.controlId ? String(action.controlId) : action.controlId,
          evidenceIds: action.evidenceIds ? action.evidenceIds.map((id: any) => String(id)) : [],
        }));
      }
      
      data.push(newItem);
      writeCollection(this.collectionName, data, this.regulation);
      return options.new ? newItem : newItem;
    }

    return null;
  }

  async create(item: any): Promise<any> {
    const data = readCollection<any>(this.collectionName, this.regulation);
    
    // Generate unique ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const _id = `local-${timestamp}-${randomId}`;
    
    const newItem: any = {
      _id,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Ensure userId is stored as string for local storage
    if (item.userId) {
      newItem.userId = typeof item.userId === 'string' ? item.userId : String(item.userId);
    }
    
    // Ensure controls array exists
    if (!newItem.controls) {
      newItem.controls = [];
    }
    
    // Ensure controlId in gaps array is stored as string (for GapAnalysis)
    if (newItem.gaps && Array.isArray(newItem.gaps)) {
      newItem.gaps = newItem.gaps.map((gap: any) => ({
        ...gap,
        controlId: gap.controlId ? String(gap.controlId) : gap.controlId,
      }));
    }
    
    data.push(newItem);
    writeCollection(this.collectionName, data, this.regulation);
    return newItem;
  }

  async deleteOne(query: any): Promise<void> {
    const data = readCollection<any>(this.collectionName, this.regulation);
    const filtered = data.filter(item => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] === value) {
          return false;
        }
      }
      return true;
    });
    writeCollection(this.collectionName, filtered, this.regulation);
  }

  async countDocuments(query: any = {}): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  async bulkWrite(operations: any[]): Promise<void> {
    const data = readCollection<any>(this.collectionName, this.regulation);
    
    for (const op of operations) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        const index = data.findIndex(item => {
          for (const [key, value] of Object.entries(filter)) {
            if (item[key] !== value) {
              return false;
            }
          }
          return true;
        });

        if (index >= 0) {
          data[index] = { ...data[index], ...update.$set };
        } else if (upsert) {
          data.push({
            _id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...filter,
            ...update.$set,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    
    writeCollection(this.collectionName, data, this.regulation);
  }
}

// Check if we should use local storage
export function useLocalStorage(): boolean {
  const useLocal = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.MONGODB_URI;
  return useLocal;
}

// Get storage instance (optionally scoped by regulation for separate DORA vs Chilean Privacy data)
export function getStorage(collectionName: string, regulation?: string): LocalStorage {
  return new LocalStorage(collectionName, regulation);
}

