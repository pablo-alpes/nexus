/**
 * Local file-based storage for testing without MongoDB
 * Stores data in JSON files in the data directory
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'local-db');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get collection file path
function getCollectionPath(collectionName: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, `${collectionName}.json`);
}

// Read collection from file
function readCollection<T>(collectionName: string): T[] {
  const filePath = getCollectionPath(collectionName);
  
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

// Write collection to file
function writeCollection<T>(collectionName: string, data: T[]): void {
  const filePath = getCollectionPath(collectionName);
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Local storage adapter
export class LocalStorage {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  async find(query: any = {}, sort?: any): Promise<any[]> {
    let data = readCollection<any>(this.collectionName);
    
    // Apply filters
    if (Object.keys(query).length > 0) {
      // Check if query has organizationId or affiliateId filter
      const hasOrgFilter = 'organizationId' in query;
      const hasAffFilter = 'affiliateId' in query;
      
      data = data.filter(item => {
        // CRITICAL: If query filters by organizationId/affiliateId, exclude items without these fields
        // This ensures strict data isolation
        if (hasOrgFilter && !item.organizationId) {
          return false;
        }
        if (hasAffFilter && !item.affiliateId) {
          return false;
        }
        
        // Track if all query conditions match
        let allConditionsMatch = true;
        
        for (const [key, value] of Object.entries(query)) {
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
              if (!matches) {
                allConditionsMatch = false;
                break; // Exit early, this item doesn't match
              }
            } else {
              // If itemValue is not an array, check direct match
              const itemValueStr = itemValue ? String(itemValue) : '';
              const matches = inArray.some((v: any) => {
                const vStr = String(v);
                return itemValueStr === vStr || itemValue === v;
              });
              if (!matches) {
                allConditionsMatch = false;
                break; // Exit early, this item doesn't match
              }
            }
          }
          // Handle userId comparison (can be string or ObjectId-like)
          else if (key === 'userId' && typeof value === 'object' && value.toString) {
            if (item[key] !== value.toString()) {
              allConditionsMatch = false;
              break; // Exit early, this item doesn't match
            }
          }
          // Handle userId as string
          else if (key === 'userId' && typeof value === 'string') {
            const itemValue = String(item[key] || '');
            if (itemValue !== value) {
              allConditionsMatch = false;
              break; // Exit early, this item doesn't match
            }
          }
          // Handle organizationId/affiliateId with string conversion
          else if (key === 'organizationId' || key === 'affiliateId') {
            const itemValue = item[key];
            const queryValue = value;
            
            // Convert both to strings for comparison
            const itemValueStr = itemValue ? String(itemValue) : '';
            const queryValueStr = queryValue ? String(queryValue) : '';
            
            // CRITICAL: Must match exactly - this is the primary isolation mechanism
            // If item doesn't have the field and query requires it, exclude the item
            if (!itemValue && queryValueStr && queryValueStr !== 'null') {
              allConditionsMatch = false;
              break; // Exit early, this item doesn't match
            }
            
            // Must match exactly (already excluded items without the field above)
            if (itemValueStr !== queryValueStr && itemValue !== queryValue) {
              allConditionsMatch = false;
              break; // Exit early, this item doesn't match
            }
          }
          // Handle direct equality for other fields
          else {
            const itemValue = item[key];
            if (itemValue !== value) {
              allConditionsMatch = false;
              break; // Exit early, this item doesn't match
            }
          }
        }
        
        // Only return true if all conditions matched
        return allConditionsMatch;
      });
    }
    
    // Apply sorting
    if (sort) {
      const sortKeys = Object.keys(sort);
      data.sort((a, b) => {
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
    
    return data;
  }

  async findOne(query: any): Promise<any | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  async findById(id: string): Promise<any | null> {
    return this.findOne({ _id: id });
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}): Promise<any> {
    const data = readCollection<any>(this.collectionName);
    const index = data.findIndex(item => {
      for (const [key, value] of Object.entries(query)) {
        // Handle MongoDB-style $in operator
        if (value && typeof value === 'object' && '$in' in value) {
          const itemValue = item[key];
          const inArray = value.$in || [];
          
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
            const itemValueStr = itemValue ? String(itemValue) : '';
            const matches = inArray.some((v: any) => {
              const vStr = String(v);
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
        // Handle organizationId/affiliateId with string conversion
        else if (key === 'organizationId' || key === 'affiliateId') {
          const itemValue = item[key];
          const queryValue = value;
          const itemValueStr = itemValue ? String(itemValue) : '';
          const queryValueStr = queryValue ? String(queryValue) : '';
          if (itemValueStr !== queryValueStr && itemValue !== queryValue) {
            return false;
          }
        }
        // Handle direct equality
        else if (item[key] !== value) {
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
      writeCollection(this.collectionName, data);
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
      writeCollection(this.collectionName, data);
      return options.new ? newItem : newItem;
    }

    return null;
  }

  async create(item: any): Promise<any> {
    const data = readCollection<any>(this.collectionName);
    
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
    writeCollection(this.collectionName, data);
    return newItem;
  }

  async deleteOne(query: any): Promise<{ deletedCount: number }> {
    // Use find() to get items matching the query (reuses the same filtering logic)
    const itemsToDelete = await this.find(query);
    
    if (itemsToDelete.length === 0) {
      return { deletedCount: 0 };
    }
    
    // Get IDs of items to delete
    const idsToDelete = new Set(itemsToDelete.map(item => item._id));
    
    // Read all data and filter out items with matching IDs
    const data = readCollection<any>(this.collectionName);
    const filtered = data.filter(item => !idsToDelete.has(item._id));
    
    const deletedCount = data.length - filtered.length;
    writeCollection(this.collectionName, filtered);
    
    return { deletedCount };
  }

  async countDocuments(query: any = {}): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  async bulkWrite(operations: any[]): Promise<void> {
    const data = readCollection<any>(this.collectionName);
    
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
    
    writeCollection(this.collectionName, data);
  }
}

// Check if we should use local storage
export function useLocalStorage(): boolean {
  const useLocal = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.MONGODB_URI;
  return useLocal;
}

// Get storage instance
export function getStorage(collectionName: string): LocalStorage {
  return new LocalStorage(collectionName);
}

